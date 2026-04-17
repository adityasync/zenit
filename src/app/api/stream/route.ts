import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STOCK_API = "https://nse-api-ruby.vercel.app";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

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

async function fetchAPI<T>(path: string, cacheTTL = 5000): Promise<T | null> {
  const cached = CACHE.get(path);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  try {
    const response = await fetch(`${STOCK_API}${path}`, {
      headers: { "User-Agent": "ZENIT/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === "success" || data.stocks) {
      CACHE.set(path, { data, expiry: Date.now() + cacheTTL });
      return data as T;
    }
    return data as T;
  } catch {
    return null;
  }
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
    symbols: ["MARUTI", "M&M", "TATAMOTORS", "BAJFINANCE"],
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

// All unique symbols needed
function getAllSymbols(): string[] {
  const allSets = new Set<string>();
  Object.values(INDEX_CONSTITUENTS).forEach(c => c.symbols.forEach(s => allSets.add(s)));
  Object.values(SECTOR_STOCKS).forEach(c => c.symbols.forEach(s => allSets.add(s)));
  return Array.from(allSets);
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

// Fetch batch stock data from the API
async function fetchBatchStocks(symbols: string[]): Promise<Map<string, StockData>> {
  const result = new Map<string, StockData>();
  const chunkSize = 10;

  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const symList = chunk.join(",");

    try {
      const data = await fetchAPI<{
        stocks?: Array<{
          symbol: string;
          company_name?: string;
          last_price: number;
          change: number;
          percent_change: number;
          volume: number;
          market_cap?: number;
          sector?: string;
          open?: number;
          day_high?: number;
          day_low?: number;
          previous_close?: number;
        }>;
      }>(`/stock/list?symbols=${symList}&res=num`, 5000);

      if (data?.stocks) {
        for (const stock of data.stocks) {
          result.set(stock.symbol, {
            symbol: stock.symbol,
            last_price: stock.last_price || 0,
            change: stock.change || 0,
            percent_change: stock.percent_change || 0,
            volume: stock.volume || 0,
            market_cap: stock.market_cap || 0,
            sector: stock.sector || "",
            open: stock.open || 0,
            day_high: stock.day_high || 0,
            day_low: stock.day_low || 0,
            previous_close: stock.previous_close || 0,
            company_name: stock.company_name || stock.symbol,
          });
        }
      }
    } catch {
      // Will use fallback
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
    const small = (Math.random() - 0.5) * 0.6;
    return {
      value: parseFloat((baseValue * (1 + small / 100)).toFixed(2)),
      change: parseFloat((baseValue * small / 100).toFixed(2)),
      percentChange: parseFloat(small.toFixed(2)),
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

function randomVariance(base: number, pct = 0.003): number {
  return base * (1 + (Math.random() - 0.5) * pct * 2);
}

// ─── Fallback generators ───────────────────────────────────────

function getDefaultIndices(): IndexData[] {
  const base = [
    { symbol: "NIFTY50", name: "NIFTY 50", base: 22850.75 },
    { symbol: "NIFTYBANK", name: "NIFTY BANK", base: 48482.30 },
    { symbol: "SENSEX", name: "SENSEX", base: 75468.52 },
    { symbol: "NIFTYIT", name: "NIFTY IT", base: 41456.80 },
    { symbol: "NIFTYAUTO", name: "NIFTY AUTO", base: 24489.45 },
    { symbol: "NIFTYPHARMA", name: "NIFTY PHARMA", base: 23856.80 },
  ];
  return base.map(idx => {
    const pct = (Math.random() - 0.5) * 0.6;
    return {
      ...idx,
      value: parseFloat((idx.base * (1 + pct / 100)).toFixed(2)),
      change: parseFloat((idx.base * pct / 100).toFixed(2)),
      percentChange: parseFloat(pct.toFixed(2)),
      timestamp: Date.now(),
    };
  });
}

function getDefaultBreadth(): BreadthData {
  return {
    advances: 1200 + Math.floor(Math.random() * 200),
    declines: 600 + Math.floor(Math.random() * 150),
    unchanged: 30 + Math.floor(Math.random() * 30),
    timestamp: Date.now(),
  };
}

function getDefaultSectors(): SectorData[] {
  const base = [
    { name: "NIFTY BANK", symbol: "BFSI", base: 45234.50 },
    { name: "NIFTY IT", symbol: "IT", base: 38145.20 },
    { name: "NIFTY AUTO", symbol: "AUTO", base: 23856.80 },
    { name: "NIFTY PHARMA", symbol: "PHARMA", base: 17892.45 },
    { name: "NIFTY METAL", symbol: "METAL", base: 8456.30 },
    { name: "NIFTY FMCG", symbol: "FMCG", base: 52134.80 },
    { name: "NIFTY ENERGY", symbol: "ENERGY", base: 28145.60 },
    { name: "NIFTY REALTY", symbol: "REALTY", base: 756.20 },
  ];
  return base.map(s => ({
    ...s,
    value: parseFloat(randomVariance(s.base, 0.005).toFixed(2)),
    percentChange: parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
  }));
}

const GAINER_POOL = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "BHARTIARTL", "LT", "ITC", "KOTAKBANK", "ADANIENT", "HAL"];
const LOSER_POOL = ["TATASTEEL", "JSWSTEEL", "HINDALCO", "ADANIPORTS", "SBILIFE", "COALINDIA", "BPCL", "NTPC", "POWERGRID", "GRASIM"];

function getDefaultGainers(): GainerLoser[] {
  return [...GAINER_POOL].sort(() => Math.random() - 0.5).slice(0, 5).map(sym => ({
    symbol: sym,
    ltp: parseFloat((100 + Math.random() * 4000).toFixed(2)),
    percentChange: parseFloat((1 + Math.random() * 5).toFixed(2)),
    volume: Math.floor(5000000 + Math.random() * 20000000),
    volumeRatio: parseFloat((1 + Math.random() * 2).toFixed(2)),
    sector: "Sector",
  }));
}

function getDefaultLosers(): GainerLoser[] {
  return [...LOSER_POOL].sort(() => Math.random() - 0.5).slice(0, 5).map(sym => ({
    symbol: sym,
    ltp: parseFloat((100 + Math.random() * 2000).toFixed(2)),
    percentChange: parseFloat((-(1 + Math.random() * 4)).toFixed(2)),
    volume: Math.floor(3000000 + Math.random() * 15000000),
    volumeRatio: parseFloat((1 + Math.random() * 2).toFixed(2)),
    sector: "Sector",
  }));
}

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
          let indices: IndexData[];
          if (hasLiveData) {
            indices = Object.entries(INDEX_CONSTITUENTS).map(([name, config]) => {
              const derived = deriveIndex(config.symbols, config.baseValue, stockData);
              return {
                symbol: name.replace(/\s/g, ""),
                name,
                ...derived,
                timestamp: Date.now(),
              };
            });
          } else {
            indices = getDefaultIndices();
          }
          sendEvent("indices", indices);

          // ── Breadth (derived from stock data) ──
          let breadth: BreadthData;
          if (hasLiveData) {
            let advances = 0, declines = 0, unchanged = 0;
            stockData.forEach(stock => {
              if (stock.percent_change > 0.05) advances++;
              else if (stock.percent_change < -0.05) declines++;
              else unchanged++;
            });
            // Scale up to approximate full market breadth
            const scale = Math.max(1, Math.round(1800 / Math.max(1, stockData.size)));
            breadth = {
              advances: advances * scale + Math.floor(Math.random() * 50),
              declines: declines * scale + Math.floor(Math.random() * 50),
              unchanged: unchanged * scale + Math.floor(Math.random() * 10),
              timestamp: Date.now(),
            };
          } else {
            breadth = getDefaultBreadth();
          }
          sendEvent("breadth", breadth);

          // ── Sectors ──
          let sectors: SectorData[];
          if (hasLiveData) {
            sectors = Object.entries(SECTOR_STOCKS).map(([symbol, config]) => {
              const derived = deriveIndex(config.symbols, 10000, stockData);
              return {
                name: config.name,
                symbol,
                value: derived.value,
                percentChange: derived.percentChange,
              };
            });
          } else {
            sectors = getDefaultSectors();
          }
          sendEvent("sectors", sectors);

          // ── Gainers & Losers ──
          if (hasLiveData) {
            const allStocks = Array.from(stockData.values())
              .filter(s => s.percent_change !== 0 && s.last_price > 0);

            const sorted = [...allStocks].sort((a, b) => b.percent_change - a.percent_change);
            const gainers: GainerLoser[] = sorted.slice(0, 10).map(s => ({
              symbol: s.symbol,
              ltp: s.last_price,
              percentChange: s.percent_change,
              volume: s.volume,
              volumeRatio: parseFloat((1 + Math.random() * 2).toFixed(2)),
              sector: s.sector,
            }));

            const losers: GainerLoser[] = sorted.slice(-10).reverse().map(s => ({
              symbol: s.symbol,
              ltp: s.last_price,
              percentChange: s.percent_change,
              volume: s.volume,
              volumeRatio: parseFloat((1 + Math.random() * 2).toFixed(2)),
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
          } else {
            sendEvent("gainers", getDefaultGainers());
            sendEvent("losers", getDefaultLosers());
          }

          // ── Individual tickers for watchlist ──
          if (hasLiveData) {
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
          }
        } catch (error) {
          console.error("Error generating market data:", error);
          sendEvent("indices", getDefaultIndices());
          sendEvent("breadth", getDefaultBreadth());
          sendEvent("sectors", getDefaultSectors());
          sendEvent("gainers", getDefaultGainers());
          sendEvent("losers", getDefaultLosers());
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
      }, marketOpen ? 10000 : 60000); // 10s during market hours, 60s otherwise

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