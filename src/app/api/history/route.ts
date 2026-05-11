import { NextResponse } from "next/server";
import { fetchChart, fetchQuote, extractCandles, normalizeChartQuote } from "@/lib/yahoo";

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
    const quote = await fetchQuote(symbol, { timeoutMs: 6000, cacheTtlMs: 60000 });
    if (quote) {
      const price = quote.regularMarketPrice || 0;
      if (price > 0) {
        CACHE.set(cacheKey, { data: { price, isDelayed: false }, expiry: Date.now() + 60000 });
        return { price, isDelayed: false };
      }
    }
  } catch {}
  return null;
}

function daysToRange(days: number): string {
  if (days <= 7) return "5d";
  if (days <= 30) return "1mo";
  if (days <= 90) return "3mo";
  if (days <= 180) return "6mo";
  if (days <= 365) return "1y";
  if (days <= 730) return "2y";
  if (days <= 1825) return "5y";
  return "max";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase().replace(".NS", "");
  const days = searchParams.get("days");
  const range = searchParams.get("range") || (days ? daysToRange(parseInt(days)) : "3mo");
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