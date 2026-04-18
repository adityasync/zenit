import { NextResponse } from "next/server";

const STOCK_API = "https://nse-api-ruby.vercel.app";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


// Fetch current price from the API to anchor historical data
async function fetchCurrentPrice(symbol: string): Promise<{ price: number; isDelayed: boolean } | null> {
  const cacheKey = `price:${symbol}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as { price: number; isDelayed: boolean };
  }

  try {
    const res = await fetch(`${STOCK_API}/stock?symbol=${symbol}.NS&res=num`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.data) {
        const lastPrice = data.data.last_price;
        const prevClose = data.data.previous_close || 0;
        const isLive = typeof lastPrice === 'number' && !isNaN(lastPrice);
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
  const days = parseInt(searchParams.get("days") || "90");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  // Check cache for this symbol's history
  const cacheKey = `history:${symbol}:${days}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Get real current price to anchor the chart
  let currentPriceResult = await fetchCurrentPrice(symbol);

  if (!currentPriceResult) {
    return NextResponse.json({ error: "Data not available" }, { status: 404 });
  }

  const response = {
    symbol,
    candles: [],
    currentPrice: currentPriceResult.price,
    isDelayed: currentPriceResult.isDelayed,
    source: "live-real",
  };

  // Cache for 10 minutes
  CACHE.set(cacheKey, { data: response, expiry: Date.now() + 600000 });

  return NextResponse.json(response);
}