import { NextResponse } from "next/server";
import { fetchChart, extractCandles, normalizeChartQuote } from "@/lib/yahoo";

const STOCK_API = "http://65.0.104.9";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().replace(".NS", "");
  const range = searchParams.get("range") || "3mo";
  const interval = searchParams.get("interval") || "1d";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const validRange = VALID_RANGES.includes(range) ? range : "3mo";
  const validInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";

  const cacheKey = `history:${symbol}:${validRange}:${validInterval}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const [currentPriceResult, chartResult] = await Promise.all([
    fetchCurrentPrice(symbol).catch(() => null),
    fetchChart(symbol, { interval: validInterval, range: validRange, timeoutMs: 15000, cacheTtlMs: 600_000, useCache: false }).catch(() => null),
  ]);

  const candles = chartResult ? extractCandles(chartResult) : [];
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;

  const response = {
    symbol,
    range: validRange,
    interval: validInterval,
    candles,
    currentPrice: currentPriceResult?.price || lastClose,
    isDelayed: currentPriceResult?.isDelayed || false,
    source: candles.length > 0 ? "yahoo-finance" : "none",
    timestamp: Date.now(),
  };

  const cacheTime = validRange === "max" || validRange === "5y" ? 3600000 : 600000;
  CACHE.set(cacheKey, { data: response, expiry: Date.now() + cacheTime });

  return NextResponse.json(response);
}