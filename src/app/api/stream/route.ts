import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NSE_BASE_URL = "https://www.nseindia.com";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

function isMarketOpen(): boolean {
  const now = new Date();
  const istHours = now.getUTCHours() + 5;
  const istMinutes = now.getUTCMinutes() + 30;
  const hour = istMinutes >= 60 ? istHours + 1 : istHours;
  const minute = istMinutes >= 60 ? istMinutes - 60 : istMinutes;
  const day = now.getUTCDay();
  const actualDay = (day + 7) % 7;
  if (actualDay === 0 || actualDay === 6) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 555 && totalMinutes <= 930;
}

async function getNseCookies(): Promise<string | null> {
  try {
    const response = await fetch(NSE_BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    return response.headers.getSetCookie?.()?.join("; ") || null;
  } catch {
    return null;
  }
}

async function fetchNSE<T>(endpoint: string, forceRefresh = false): Promise<T | null> {
  const cacheKey = endpoint;
  if (!forceRefresh) {
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  try {
    const cookies = await getNseCookies();
    const response = await fetch(`${NSE_BASE_URL}${endpoint}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.nseindia.com/",
        ...(cookies && { Cookie: cookies }),
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    CACHE.set(cacheKey, { data, expiry: Date.now() + 5000 });
    return data;
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

const BASE_TICKERS: Record<string, { ltp: number; change: number }> = {
  RELIANCE: { ltp: 2952.30, change: 0.85 },
  TCS: { ltp: 3845.60, change: 0.42 },
  INFY: { ltp: 1518.75, change: 0.65 },
  HDFCBANK: { ltp: 1678.90, change: 0.28 },
  ICICIBANK: { ltp: 1118.45, change: 0.55 },
  SBIN: { ltp: 818.30, change: 0.18 },
  BHARTIARTL: { ltp: 1378.20, change: 0.92 },
  LT: { ltp: 3448.75, change: 0.34 },
  ITC: { ltp: 478.65, change: 0.15 },
  KOTAKBANK: { ltp: 1818.40, change: 0.48 },
};

function randomData(variance = 0.002) {
  return 1 + (Math.random() - 0.5) * variance * 2;
}

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

      const fetchIndices = async (): Promise<IndexData[]> => {
        const data = await fetchNSE<{
          data: Array<{
            key: string;
            indexSymbol: string;
            last: number;
            variation: number;
            percentChange: number;
          }>;
        }>("/api/allIndices", !marketOpen);

        if (!data?.data) return getDefaultIndices();

        const targetIndices = ["NIFTY 50", "NIFTY BANK", "SENSEX", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA"];
        return data.data
          .filter((idx) =>
            targetIndices.some((name) =>
              idx.key?.toLowerCase().includes(name.toLowerCase()) ||
              idx.indexSymbol?.toLowerCase().includes(name.toLowerCase().replace(" ", ""))
            )
          )
          .map((idx) => ({
            symbol: idx.indexSymbol || idx.key,
            name: idx.key,
            value: idx.last,
            change: idx.variation,
            percentChange: idx.percentChange,
            timestamp: Date.now(),
          }));
      };

      const fetchBreadth = async (): Promise<BreadthData> => {
        const data = await fetchNSE<{
          advances: number;
          declines: number;
          unchanged: number;
        }>("/api/market-status", !marketOpen);

        if (data) {
          return {
            advances: data.advances || 1245,
            declines: data.declines || 689,
            unchanged: data.unchanged || 42,
            timestamp: Date.now(),
          };
        }
        return getDefaultBreadth();
      };

      const fetchSectors = async (): Promise<SectorData[]> => {
        const data = await fetchNSE<{
          data: Array<{
            key: string;
            indexSymbol: string;
            last: number;
            percentChange: number;
          }>;
        }>("/api/allIndices", !marketOpen);

        if (!data?.data) return getDefaultSectors();

        const targetSectors = ["BFSI", "IT", "AUTO", "PHARMA", "METAL", "FMCG", "ENERGY", "REALTY"];
        return data.data
          .filter((idx) =>
            targetSectors.some(
              (sector) =>
                idx.key?.toUpperCase().includes(sector) ||
                idx.indexSymbol?.toUpperCase().includes(sector)
            )
          )
          .map((idx) => ({
            name: idx.key,
            symbol: idx.indexSymbol,
            value: idx.last,
            percentChange: idx.percentChange,
          }));
      };

      const fetchGainers = async (): Promise<GainerLoser[]> => {
        const data = await fetchNSE<{
          data: Array<{
            symbol: string;
            lastPrice: number;
            pChange: number;
            totalTradedVolume: number;
            sector: string;
          }>;
        }>("/api/live-analysis-variations-gainers", true);

        if (!data?.data) return getDefaultGainers();

        return data.data.slice(0, 10).map((stock) => ({
          symbol: stock.symbol,
          ltp: stock.lastPrice,
          percentChange: stock.pChange,
          volume: stock.totalTradedVolume,
          volumeRatio: 1.5 + Math.random() * 0.5,
          sector: stock.sector,
        }));
      };

      const fetchLosers = async (): Promise<GainerLoser[]> => {
        const data = await fetchNSE<{
          data: Array<{
            symbol: string;
            lastPrice: number;
            pChange: number;
            totalTradedVolume: number;
            sector: string;
          }>;
        }>("/api/live-analysis-variations-loosers", true);

        if (!data?.data) return getDefaultLosers();

        return data.data.slice(0, 10).map((stock) => ({
          symbol: stock.symbol,
          ltp: stock.lastPrice,
          percentChange: stock.pChange,
          volume: stock.totalTradedVolume,
          volumeRatio: 1.5 + Math.random() * 0.5,
          sector: stock.sector,
        }));
      };

      const generateTickers = (): TickerData[] => {
        return Object.entries(BASE_TICKERS).map(([symbol, data]) => {
          const variation = marketOpen ? (Math.random() - 0.5) * data.ltp * 0.001 : 0;
          const ltp = data.ltp + variation;
          const change = ltp - data.ltp;
          const percentChange = (change / data.ltp) * 100;

          return {
            symbol,
            ltp: parseFloat(ltp.toFixed(2)),
            open: parseFloat((data.ltp * 0.999).toFixed(2)),
            high: parseFloat((ltp * 1.001).toFixed(2)),
            low: parseFloat((ltp * 0.999).toFixed(2)),
            volume: Math.floor(5000000 + Math.random() * 10000000),
            change: parseFloat(change.toFixed(2)),
            percentChange: parseFloat(percentChange.toFixed(2)),
            timestamp: Date.now(),
          };
        });
      };

      const getDefaultIndices = (): IndexData[] => {
        const base = [
          { symbol: "NIFTY50", name: "NIFTY 50", base: 22850.75 },
          { symbol: "NIFTYBANK", name: "NIFTY BANK", base: 48482.30 },
          { symbol: "SENSEX", name: "SENSEX", base: 75468.52 },
          { symbol: "NIFTYIT", name: "NIFTY IT", base: 41456.80 },
          { symbol: "NIFTYAUTO", name: "NIFTY AUTO", base: 24489.45 },
          { symbol: "NIFTYPHARMA", name: "NIFTY PHARMA", base: 23856.80 },
        ];
        return base.map(idx => {
          const variance = randomData(0.003);
          const pct = (variance - 1) * 100;
          return {
            ...idx,
            value: idx.base * variance,
            change: idx.base * (variance - 1),
            percentChange: pct,
            timestamp: Date.now(),
          };
        });
      };

      const getDefaultBreadth = (): BreadthData => ({
        advances: 1200 + Math.floor(Math.random() * 200),
        declines: 600 + Math.floor(Math.random() * 150),
        unchanged: 30 + Math.floor(Math.random() * 30),
        timestamp: Date.now(),
      });

      const getDefaultSectors = (): SectorData[] => {
        const base = [
          { name: "NIFTY BFSI", symbol: "BFSI", base: 45234.50 },
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
          value: s.base * randomData(0.005),
          percentChange: (randomData(0.01) - 1) * 100,
        }));
      };

      const GAINER_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "BHARTIARTL", "LT", "ITC", "KOTAKBANK", "ADANIENT", "HAL"];
      const LOSER_SYMBOLS = ["TATASTEEL", "JSWSTEEL", "HINDALCO", "ADANIPORTS", "SBILIFE", "COALINDIA", "BPCL", "NTPC", "POWERGRID", "GRASIM"];

      const getDefaultGainers = (): GainerLoser[] => {
        const shuffled = [...GAINER_SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 5);
        return shuffled.map(sym => ({
          symbol: sym,
          ltp: 100 + Math.random() * 4000,
          percentChange: 1 + Math.random() * 5,
          volume: Math.floor(5000000 + Math.random() * 20000000),
          volumeRatio: 1 + Math.random() * 2,
          sector: "Sector",
        }));
      };

      const getDefaultLosers = (): GainerLoser[] => {
        const shuffled = [...LOSER_SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 5);
        return shuffled.map(sym => ({
          symbol: sym,
          ltp: 100 + Math.random() * 2000,
          percentChange: -(1 + Math.random() * 4),
          volume: Math.floor(3000000 + Math.random() * 15000000),
          volumeRatio: 1 + Math.random() * 2,
          sector: "Sector",
        }));
      };

      const generateAll = async () => {
        try {
          const [indices, breadth, sectors, gainers, losers] = await Promise.all([
            fetchIndices(),
            fetchBreadth(),
            fetchSectors(),
            fetchGainers(),
            fetchLosers(),
          ]);

          sendEvent("indices", indices);
          sendEvent("breadth", breadth);
          sendEvent("sectors", sectors);
          sendEvent("gainers", gainers);
          sendEvent("losers", losers);

          const tickers = generateTickers();
          tickers.forEach((ticker) => sendEvent("tick", ticker));
        } catch (error) {
          console.error("Error generating market data:", error);
          sendEvent("indices", getDefaultIndices());
          sendEvent("breadth", getDefaultBreadth());
          sendEvent("sectors", getDefaultSectors());
          sendEvent("gainers", getDefaultGainers());
          sendEvent("losers", getDefaultLosers());
        }
      };

      sendEvent("connected", {
        status: "ok",
        timestamp: Date.now(),
        marketOpen,
      });

      await generateAll();

      const interval = setInterval(() => {
        if (!isConnected) {
          clearInterval(interval);
          return;
        }
        heartbeat();
        if (marketOpen) {
          generateAll();
        }
      }, marketOpen ? 5000 : 60000);

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