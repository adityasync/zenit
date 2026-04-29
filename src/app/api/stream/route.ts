import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

// Use Yahoo Finance for live data
async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  change: number;
  percentChange: number;
  volume: number;
} | null> {
  try {
    const res = await fetch(`${YAHOO_API}/${symbol}.NS?interval=1d`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    
    if (!meta || !quote) return null;
    
    // Yahoo provides current price in meta.regularMarketPrice
    // and the previous close in meta.chartPreviousClose
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const percentChange = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    return {
      price,
      change,
      percentChange,
      volume: meta.regularMarketVolume || 0
    };
  } catch {
    return null;
  }
}

function isMarketOpen(): boolean {
  const now = new Date();
  const istHours = now.getUTCHours() + 5;
  const istMinutes = now.getUTCMinutes() + 30;
  const hour = istMinutes >= 60 ? istHours + 1 : istHours;
  const minute = istMinutes >= 60 ? istMinutes - 60 : istMinutes;
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 555 && totalMinutes <= 930;
}

// Legacy function - kept for compatibility
async function fetchAPI<T>(path: string, cacheTTL = 5000): Promise<T | null> {
  return null;
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

// Index constituent stocks for deriving index movement
const INDEX_CONSTITUENTS: Record<string, { symbols: string[]; baseValue: number }> = {
  "NIFTY 50": {
    symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "LT", "ITC", "KOTAKBANK"],
    baseValue: 22850,
  },
  "NIFTY BANK": {
    symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSIND"],
    baseValue: 48500,
  },
  "SENSEX": {
    symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "LT", "ITC"],
    baseValue: 75500,
  },
  "NIFTY IT": {
    symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
    baseValue: 41500,
  },
  "NIFTY AUTO": {
    symbols: ["MARUTI", "TATAMOTORS", "BAJFINANCE"],
    baseValue: 24500,
  },
  "NIFTY PHARMA": {
    symbols: ["SUNPHARMA", "DRREDDY", "CIPLA", "LUPIN", "APOLLOHOSP"],
    baseValue: 23850,
  },
};

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

// All unique symbols needed - simplified list without problematic symbols
function getAllSymbols(): string[] {
  return [
    "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
    "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
    "BAJFINANCE","TATASTEEL","WIPRO","HCLTECH","TECHM","AXISBANK",
    "NTPC","POWERGRID","ONGC","COALINDIA","TATAMOTORS","DRREDDY",
    "CIPLA","BPCL","LUPIN","JSWSTEEL","HINDALCO","VEDL","DLF","NESTLEIND",
    "INDUSIND","GODREJPRO","OBEROIRLTY","NESTLEIND","ULTRACEMCO"
  ];
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

// Fetch stock data using Yahoo Finance - LIVE real-time data
async function fetchBatchStocks(symbols: string[]): Promise<Map<string, StockData>> {
  const result = new Map<string, StockData>();

  // Process in smaller chunks for Yahoo
  for (const symbol of symbols) {
    try {
      const quote = await fetchYahooQuote(symbol);
      if (quote) {
        result.set(symbol, {
          symbol,
          last_price: quote.price,
          change: quote.change,
          percent_change: quote.percentChange,
          volume: quote.volume,
          market_cap: 0,
          sector: "",
          open: quote.price - quote.change,
          day_high: quote.price * 1.01,
          day_low: quote.price * 0.99,
          previous_close: quote.price - quote.change,
          company_name: symbol,
        });
      }
    } catch {
      // Skip failed symbols
    }
  }

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
          // Fetch all needed stocks in one batch
          const allSymbols = getAllSymbols();
          const stockData = await fetchBatchStocks(allSymbols);
          const hasLiveData = stockData.size > 0;

          // ── Indices ──
          let indices: IndexData[] = [];
          // Always derive indices, even if market is closed
          indices = Object.entries(INDEX_CONSTITUENTS).map(([name, config]) => {
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