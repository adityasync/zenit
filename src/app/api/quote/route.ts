import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const STOCK_API = "https://nse-api-ruby.vercel.app";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

async function fetchStock(symbol: string, forceRefresh = false): Promise<unknown | null> {
  const cacheKey = `quote:${symbol}`;
  if (!forceRefresh) {
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log("[DEBUG] Using cache for", symbol, "expiry:", cached.expiry, "now:", Date.now());
      return cached.data;
    }
  }

  try {
    const res = await fetch(`${STOCK_API}/stock?symbol=${symbol}.NS&res=num`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    console.log("[DEBUG] Fetch status for", symbol, ":", res.status);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.log("[DEBUG] Non-JSON response for", symbol, ":", text.substring(0, 200));
      return null;
    }
    const data = await res.json();
    console.log("[DEBUG] Full API response for", symbol, ":", JSON.stringify(data));
    if (data.status === "success" && data.data) {
      console.log("[DEBUG] Caching data for", symbol);
      CACHE.set(cacheKey, { data, expiry: Date.now() + 5000 });
      return data;
    }
    return null;
  } catch (e) {
    console.log("[DEBUG] Error fetching", symbol, ":", e);
    return null;
  }
}

interface StockQuote {
  symbol: string;
  name: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  percentChange: number;
  volume: number;
  sector?: string;
  pe_ratio?: number;
  market_cap?: number;
  weekHigh52?: number;
  weekLow52?: number;
  timestamp: number;
  isDelayed?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase().replace(".NS", "").replace(".BO", "");

  const data = await fetchStock(upperSymbol, forceRefresh);

  if (data && (data as any).data) {
    const d = (data as any).data;
    console.log("[DEBUG] API data for", upperSymbol, ":", JSON.stringify(d));
    const lastPrice = d.last_price;
    const prevClose = d.previous_close || 0;
    const isLive = typeof lastPrice === 'number' && !isNaN(lastPrice);
    console.log("[DEBUG] lastPrice:", lastPrice, "prevClose:", prevClose, "isLive:", isLive);

    const quote: StockQuote = {
      symbol: upperSymbol,
      name: d.company_name || upperSymbol,
      ltp: isLive ? lastPrice : prevClose,
      open: (d.open && !isNaN(d.open)) ? d.open : prevClose,
      high: (d.day_high && !isNaN(d.day_high)) ? d.day_high : prevClose,
      low: (d.day_low && !isNaN(d.day_low)) ? d.day_low : prevClose,
      close: prevClose,
      change: isLive ? (d.change || 0) : 0,
      percentChange: isLive ? (d.percent_change || 0) : 0,
      volume: d.volume || 0,
      sector: d.sector || "",
      pe_ratio: d.pe_ratio || 0,
      market_cap: d.market_cap || 0,
      weekHigh52: d.year_high || 0,
      weekLow52: d.year_low || 0,
      timestamp: d.last_update ? new Date(d.last_update).getTime() : Date.now(),
      isDelayed: !isLive,
    };
    return NextResponse.json(quote);
  }
  return NextResponse.json({ error: "Data not available" }, { status: 404 });
}