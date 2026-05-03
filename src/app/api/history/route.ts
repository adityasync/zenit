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

// Valid ranges and intervals
const VALID_RANGES = ["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"];
const VALID_INTERVALS = ["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"];

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

async function fetchHistoricalData(symbol: string, range: string = "3mo", interval: string = "1d"): Promise<Candle[]> {
  try {
    const res = await fetch(`${YAHOO_FINANCE_API}/${symbol}.NS?range=${range}&interval=${interval}`, {
      signal: AbortSignal.timeout(15000),
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
  const interval = searchParams.get("interval") || "1d";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  // Validate parameters
  const validRange = VALID_RANGES.includes(range) ? range : "3mo";
  const validInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";

  const cacheKey = `history:${symbol}:${validRange}:${validInterval}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  console.log(`[HISTORY] Fetching data for: ${symbol} (${validRange}, ${validInterval})`);

  const [currentPriceResult, candles] = await Promise.all([
    fetchCurrentPrice(symbol).catch(err => {
        console.error(`[HISTORY] Current price fetch failed for ${symbol}:`, err);
        return null;
    }),
    fetchHistoricalData(symbol, validRange, validInterval).catch(err => {
        console.error(`[HISTORY] Historical fetch failed for ${symbol}:`, err);
        return [];
    })
  ]);

  const response = {
    symbol,
    range: validRange,
    interval: validInterval,
    candles,
    currentPrice: currentPriceResult?.price || (candles.length > 0 ? candles[candles.length - 1].close : 0),
    isDelayed: currentPriceResult?.isDelayed || false,
    source: candles.length > 0 ? "yahoo-finance" : "none",
    timestamp: Date.now()
  };

  // Cache duration based on range
  const cacheTime = validRange === "max" || validRange === "5y" ? 3600000 : 600000; // 1hr for long, 10min for short
  CACHE.set(cacheKey, { data: response, expiry: Date.now() + cacheTime });

  return NextResponse.json(response);
}