import { NextResponse } from "next/server";
import Parser from "rss-parser";

const NSE_BASE_URL = "https://www.nseindia.com";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

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

async function fetchNSE<T>(endpoint: string): Promise<T | null> {
  const cacheKey = endpoint;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  try {
    const cookies = await getNseCookies();
    const response = await fetch(`${NSE_BASE_URL}${endpoint}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        ...(cookies && { Cookie: cookies }),
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    CACHE.set(cacheKey, { data, expiry: Date.now() + 60000 });
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "block";

  const endpoint =
    type === "bulk"
      ? "/api/bulk-deals"
      : "/api/block-deals";

  const data = await fetchNSE<{
    data: Array<{
      symbol: string;
      securityName: string;
      clientName: string;
      buySell: "BUY" | "SELL";
      quantityTraded: number;
      price: number;
      value: number;
      date: string;
    }>;
  }>(endpoint);

  if (!data?.data) {
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  const deals = data.data.slice(0, 20).map((deal) => ({
    symbol: deal.symbol,
    name: deal.securityName,
    client: deal.clientName,
    type: deal.buySell,
    quantity: deal.quantityTraded,
    price: deal.price,
    value: deal.value,
    date: deal.date,
  }));

  return NextResponse.json({
    type,
    deals,
    timestamp: Date.now(),
  });
}
