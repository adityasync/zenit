import { NextRequest } from "next/server";
import { getMarketNews } from "@/lib/news";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";
import { fetchIndexStocks } from "@/lib/nse-indices";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440; // 330 = 5h30m in minutes
  const hour = Math.floor(istMinutes / 60);
  const minute = istMinutes % 60;
  const day = now.getUTCDay();
  // IST can shift the day; if IST is before ~5:30 AM and UTC is late evening, it's next day in IST
  // But for market hours (9:15-15:30 IST) this doesn't matter
  if (day === 0 || day === 6) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 555 && totalMinutes <= 930;
}

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  percentChange: number;
  timestamp: number;
}

interface TickerData {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  percentChange: number;
  timestamp: number;
  isDelayed?: boolean;
}

interface BreadthData {
  advances: number;
  declines: number;
  unchanged: number;
  timestamp: number;
}

interface SectorData {
  name: string;
  symbol: string;
  value: number;
  percentChange: number;
}

interface GainerLoser {
  symbol: string;
  ltp: number;
  percentChange: number;
  volume: number;
  volumeRatio: number;
  sector?: string;
}

// Sector mappings for sector strength
const SECTOR_STOCKS: Record<string, { name: string; symbols: string[] }> = {
  BFSI: { name: "NIFTY BANK", symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"] },
  IT: { name: "NIFTY IT", symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"] },
  AUTO: { name: "NIFTY AUTO", symbols: ["MARUTI", "TATAMOTORS", "BAJFINANCE"] },
  PHARMA: { name: "NIFTY PHARMA", symbols: ["SUNPHARMA", "DRREDDY", "CIPLA", "LUPIN"] },
  METAL: { name: "NIFTY METAL", symbols: ["TATASTEEL", "HINDALCO", "JSWSTEEL", "VEDL", "COALINDIA"] },
  FMCG: { name: "NIFTY FMCG", symbols: ["HINDUNILVR", "ITC", "NESTLEIND", "TITAN"] },
  ENERGY: { name: "NIFTY ENERGY", symbols: ["RELIANCE", "ONGC", "BPCL", "NTPC", "POWERGRID"] },
  REALTY: { name: "NIFTY REALTY", symbols: ["DLF", "GODREJPRO", "OBEROIRLTY"] },
};

// Dynamic constituent lists — fetched from NSE, cached for 1 hour
const CONSTITUENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour
let cachedConstituents: Record<string, { symbols: string[]; baseValue: number }> | null = null;
let constituentsExpiry = 0;

async function getIndexConstituents(): Promise<Record<string, { symbols: string[]; baseValue: number }>> {
  if (cachedConstituents && Date.now() < constituentsExpiry) return cachedConstituents;

  const defaults: Record<string, { symbols: string[]; baseValue: number }> = {
    "SENSEX": {
      symbols: ["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL","LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN","BAJFINANCE","TATASTEEL","HCLTECH","TECHM","NTPC","POWERGRID","AXISBANK","BAJAJ-AUTO","TATAMOTORS","M&M","ULTRACEMCO"],
      baseValue: 81000,
    },
    "NIFTY IT": { symbols: ["TCS","INFY","WIPRO","HCLTECH","TECHM"], baseValue: 38000 },
    "NIFTY AUTO": { symbols: ["MARUTI","TATAMOTORS","BAJFINANCE"], baseValue: 26000 },
    "NIFTY PHARMA": { symbols: ["SUNPHARMA","DRREDDY","CIPLA","LUPIN","APOLLOHOSP"], baseValue: 22000 },
  };

  try {
    const [nifty50, bankNifty] = await Promise.all([
      fetchIndexStocks("nifty50"),
      fetchIndexStocks("banknifty"),
    ]);

    const result: Record<string, { symbols: string[]; baseValue: number }> = { ...defaults };

    if (nifty50.length) {
      result["NIFTY 50"] = { symbols: nifty50.map(s => s.symbol), baseValue: 24500 };
    }
    if (bankNifty.length) {
      result["NIFTY BANK"] = { symbols: bankNifty.map(s => s.symbol), baseValue: 52000 };
    }

    cachedConstituents = result;
    constituentsExpiry = Date.now() + CONSTITUENT_CACHE_TTL;
    return result;
  } catch {
    return cachedConstituents || defaults;
  }
}

// Collect all unique symbols from index constituents + sector stocks
function getAllSymbols(constituents: Record<string, { symbols: string[] }>): string[] {
  const set = new Set<string>();
  for (const config of Object.values(constituents)) {
    for (const s of config.symbols) set.add(s);
  }
  for (const config of Object.values(SECTOR_STOCKS)) {
    for (const s of config.symbols) set.add(s);
  }
  return Array.from(set);
}

interface StockData {
  symbol: string;
  last_price: number;
  change: number;
  percent_change: number;
  volume: number;
  market_cap: number;
  sector: string;
  open: number;
  day_high: number;
  day_low: number;
  previous_close: number;
  company_name: string;
}

// Fetch stock data using shared Yahoo Finance batch fetcher
async function fetchBatchStocks(symbols: string[]): Promise<Map<string, StockData>> {
  const chartMap = await fetchChartBatch(symbols, { batchSize: 10, batchDelayMs: 100, timeoutMs: 3000 });

  const result = new Map<string, StockData>();
  chartMap.forEach((chart, symbol) => {
    const q = normalizeChartQuote(chart);
    result.set(symbol, {
      symbol,
      last_price: q.price,
      change: q.change,
      percent_change: q.percentChange,
      volume: q.volume,
      market_cap: 0,
      sector: "",
      open: q.price - q.change,
      day_high: q.price * 1.01,
      day_low: q.price * 0.99,
      previous_close: q.previousClose,
      company_name: q.shortName || symbol,
    });
  });

  return result;
}

// Derive index value from constituent stock changes
function deriveIndex(
  constituents: string[],
  baseValue: number,
  stockData: Map<string, StockData>
): { value: number; change: number; percentChange: number } {
  const changes: number[] = [];
  for (const sym of constituents) {
    const stock = stockData.get(sym);
    if (stock && stock.percent_change !== 0) {
      changes.push(stock.percent_change);
    }
  }

  if (changes.length === 0) {
    return {
      value: baseValue,
      change: 0,
      percentChange: 0,
    };
  }

  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  const value = baseValue * (1 + avgChange / 100);
  const change = value - baseValue;

  return {
    value: parseFloat(value.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    percentChange: parseFloat(avgChange.toFixed(2)),
  };
}

// ─── Fallback generators ───────────────────────────────────────



// ─── Main SSE handler ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let isConnected = true;
  const marketOpen = isMarketOpen();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        try {
          const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch {
          // closed
        }
      };

      const heartbeat = () => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // closed
        }
      };

      // ─── Core data fetcher ───────────────────────────

      const generateAll = async () => {
        try {
          // Fetch constituent lists from NSE (cached 1hr), then prices from Yahoo
          const indexConstituents = await getIndexConstituents();
          const allSymbols = getAllSymbols(indexConstituents);
          const stockData = await fetchBatchStocks(allSymbols);

          // ── Indices ──
          let indices: IndexData[] = [];
          // Always derive indices, even if market is closed
          indices = Object.entries(indexConstituents).map(([name, config]) => {
            const derived = deriveIndex(config.symbols, config.baseValue, stockData);
            return {
              symbol: name.replace(/\s/g, ""),
              name,
              ...derived,
              timestamp: Date.now(),
            };
          });
          sendEvent("indices", indices);

          // ── Breadth (derived from stock data) ──
          let breadth: BreadthData | null = null;
          let advances = 0, declines = 0, unchanged = 0;
          stockData.forEach(stock => {
            // Use percent_change (which may be 0 for closed market, so treat as unchanged)
            if (stock.percent_change > 0.05) advances++;
            else if (stock.percent_change < -0.05) declines++;
            else unchanged++;
          });
          // Scale up to approximate full market breadth
          const scale = Math.max(1, Math.round(1800 / Math.max(1, stockData.size)));
          breadth = {
            advances: advances * scale,
            declines: declines * scale,
            unchanged: unchanged * scale,
            timestamp: Date.now(),
          };
          sendEvent("breadth", breadth);

          // ── Sectors ──
          let sectors: SectorData[] = [];
          sectors = Object.entries(SECTOR_STOCKS).map(([symbol, config]) => {
            const derived = deriveIndex(config.symbols, 10000, stockData);
            return {
              name: config.name,
              symbol,
              value: derived.value,
              percentChange: derived.percentChange,
            };
          });
          sendEvent("sectors", sectors);

          // ── Gainers & Losers ──
          const allStocks = Array.from(stockData.values())
            .filter(s => s.last_price > 0);

          const sorted = [...allStocks].sort((a, b) => b.percent_change - a.percent_change);
          const gainers: GainerLoser[] = sorted.slice(0, 10).map(s => ({
            symbol: s.symbol,
            ltp: s.last_price,
            percentChange: s.percent_change,
            volume: s.volume,
              volumeRatio: 1.0,
              sector: s.sector,
            }));

            const losers: GainerLoser[] = sorted.slice(-10).reverse().map(s => ({
              symbol: s.symbol,
              ltp: s.last_price,
              percentChange: s.percent_change,
              volume: s.volume,
              volumeRatio: 1.0,
              sector: s.sector,
            }));

            sendEvent("gainers", gainers.filter(g => g.percentChange > 0));
            sendEvent("losers", losers.filter(l => l.percentChange < 0));

            // ── Live Screener ──
            const screenerSignals = allStocks
              .filter(s => Math.abs(s.percent_change) >= 3 || s.volume > 5000000)
              .slice(0, 6)
              .map(s => ({
                symbol: s.symbol,
                type: s.percent_change >= 3 ? '🚀 Breakout' : s.percent_change <= -3 ? '🔴 Breakdown' : '⚡ Volume Shock',
                ltp: s.last_price,
                percentChange: s.percent_change,
              }));
            sendEvent("screener", screenerSignals);

           // ── News (more frequent during market hours) ──
           try {
             const news = await getMarketNews({ limit: 15 });
             sendEvent("news", news);
           } catch (e) {
             console.error("News fetch error:", e);
           }

          // ── Individual tickers for watchlist ──
          stockData.forEach(stock => {
            const ticker: TickerData = {
              symbol: stock.symbol,
              ltp: stock.last_price,
              open: stock.open || stock.previous_close || stock.last_price * 0.999,
              high: stock.day_high || stock.last_price * 1.001,
              low: stock.day_low || stock.last_price * 0.999,
              volume: stock.volume,
              change: stock.change,
              percentChange: stock.percent_change,
              timestamp: Date.now(),
            };
            sendEvent("tick", ticker);
          });
        } catch (error) {
          console.error("Error generating market data:", error);
          sendEvent("indices", []);
          sendEvent("sectors", []);
          sendEvent("gainers", []);
          sendEvent("losers", []);
        }
      };

      // Send initial connection event
      sendEvent("connected", {
        status: "ok",
        timestamp: Date.now(),
        marketOpen,
      });

      // Initial data push
      await generateAll();

      // Periodic updates
      const interval = setInterval(() => {
        if (!isConnected) {
          clearInterval(interval);
          return;
        }
        heartbeat();
        generateAll();
      }, marketOpen ? 5000 : 30000); // 5s during market hours, 30s otherwise

      request.signal.addEventListener("abort", () => {
        isConnected = false;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}