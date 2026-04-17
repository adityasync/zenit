import { NextResponse } from "next/server";

const NSE_BASE_URL = "https://www.nseindia.com";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

async function getNseCookies(): Promise<string | null> {
  try {
    const response = await fetch(NSE_BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
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
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    CACHE.set(cacheKey, { data, expiry: Date.now() + 60000 });
    return data;
  } catch {
    return null;
  }
}

// Fallback mock deals
function generateMockDeals(type: string) {
  const symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "TATAMOTORS", "ITC", "WIPRO", "ADANIENT", "HAL"];
  const clients = [
    "Goldman Sachs Fund", "Morgan Stanley Asia", "HDFC Mutual Fund", "SBI Mutual Fund",
    "Kotak Mahindra MF", "ICICI Prudential MF", "Axis Capital", "Citigroup Global",
    "JP Morgan Chase", "Blackrock Inc"
  ];
  
  const deals = [];
  const count = 5 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < count; i++) {
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const basePrice = sym === "RELIANCE" ? 2950 : sym === "TCS" ? 3850 : 1000 + Math.random() * 3000;
    const qty = Math.floor(100000 + Math.random() * 2000000);
    const price = parseFloat((basePrice * (0.99 + Math.random() * 0.02)).toFixed(2));
    
    deals.push({
      symbol: sym,
      name: sym,
      client: clients[Math.floor(Math.random() * clients.length)],
      type: Math.random() > 0.5 ? "BUY" : "SELL",
      quantity: qty,
      price,
      value: parseFloat((qty * price).toFixed(2)),
      date: new Date().toISOString().split("T")[0],
    });
  }
  
  return deals;
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

  if (data?.data && data.data.length > 0) {
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

  // Fallback to mock deals
  return NextResponse.json({
    type,
    deals: generateMockDeals(type),
    timestamp: Date.now(),
    source: "simulated",
  });
}
