import { NextResponse } from "next/server";

const STOCK_API = "http://65.0.104.9";
const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchCurrentPrice(symbol: string): Promise<{ price: number; isDelayed: boolean } | null> {
  const cacheKey = `price:${symbol}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as { price: number; isDelayed: boolean };
  }

  try {
    const res = await fetch(`${STOCK_API}/stock?symbol=${symbol}.NS&res=num`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data) {
        const lastPrice = data.data.last_price;
        const prevClose = data.data.previous_close || 0;
        const isLive = typeof lastPrice === 'number' && lastPrice !== null && !isNaN(lastPrice);
        const price = isLive ? lastPrice : prevClose;
        CACHE.set(cacheKey, { data: { price, isDelayed: !isLive }, expiry: Date.now() + 60000 });
        return { price, isDelayed: !isLive };
      }
    }
  } catch {}
  return null;
}

async function fetchHistoricalData(symbol: string, range: string = "3mo"): Promise<Candle[]> {
  try {
    const res = await fetch(`${YAHOO_FINANCE_API}/${symbol}.NS?range=${range}&interval=1d`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error("Yahoo API error");

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [], volume = [] } = quotes;

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        // filter out null values which occasionally appear in Yahoo data
        if (open[i] != null && close[i] != null) {
            candles.push({
                time: timestamps[i] * 1000,
                open: open[i],
                high: high[i],
                low: low[i],
                close: close[i],
                volume: volume[i] || 0
            });
        }
    }

    return candles;
  } catch (error) {
    console.error("Historical fetch error:", error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().replace(".NS", "");
  const range = searchParams.get("range") || "3mo";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const cacheKey = `history:${symbol}:${range}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  console.log(`[HISTORY] Fetching data for: ${symbol} (${range})`);
  
  // Fetch parallel for speed
  const [currentPriceResult, candles] = await Promise.all([
    fetchCurrentPrice(symbol).catch(err => {
        console.error(`[HISTORY] Current price fetch failed for ${symbol}:`, err);
        return null;
    }),
    fetchHistoricalData(symbol, range).catch(err => {
        console.error(`[HISTORY] Historical fetch failed for ${symbol}:`, err);
        return [];
    })
  ]);

  const response = {
    symbol,
    candles,
    currentPrice: currentPriceResult?.price || (candles.length > 0 ? candles[candles.length - 1].close : 0),
    isDelayed: currentPriceResult?.isDelayed || false,
    source: candles.length > 0 ? "yahoo-finance" : "none",
    timestamp: Date.now()
  };

  // Cache for 10 minutes
  CACHE.set(cacheKey, { data: response, expiry: Date.now() + 600000 });

  return NextResponse.json(response);
}