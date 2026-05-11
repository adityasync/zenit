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
    });
    const cookies = response.headers.getSetCookie?.()?.join("; ") || null;
    return cookies;
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
    CACHE.set(cacheKey, { data, expiry: Date.now() + 30000 });
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "indices";

  switch (type) {
    case "indices": {
      const data = await fetchNSE<{
        data: Array<{
          key: string;
          indexSymbol: string;
          last: number;
          variation: number;
          percentChange: number;
        }>;
      }>("/api/allIndices");

      if (!data?.data) {
        return NextResponse.json({ error: "Failed to fetch indices" }, { status: 500 });
      }

      const indices = data.data
        .filter((idx) =>
          ["NIFTY 50", "NIFTY BANK", "SENSEX", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA"].some(
            (name) => idx.key?.includes(name) || idx.indexSymbol?.includes(name.replace(" ", ""))
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

      return NextResponse.json(indices);
    }

    case "gainers": {
      const data = await fetchNSE<{
        data: Array<{
          symbol: string;
          lastPrice: number;
          pChange: number;
          totalTradedVolume: number;
          sector: string;
        }>;
      }>("/api/live-analysis-variations-gainers");

      if (!data?.data) {
        return NextResponse.json({ error: "Failed to fetch gainers" }, { status: 500 });
      }

      const gainers = data.data.slice(0, 10).map((stock) => ({
        symbol: stock.symbol,
        ltp: stock.lastPrice,
        percentChange: stock.pChange,
        volume: stock.totalTradedVolume,
        volumeRatio: 1.5,
        sector: stock.sector,
      }));

      return NextResponse.json(gainers);
    }

    case "losers": {
      const data = await fetchNSE<{
        data: Array<{
          symbol: string;
          lastPrice: number;
          pChange: number;
          totalTradedVolume: number;
          sector: string;
        }>;
      }>("/api/live-analysis-variations-loosers");

      if (!data?.data) {
        return NextResponse.json({ error: "Failed to fetch losers" }, { status: 500 });
      }

      const losers = data.data.slice(0, 10).map((stock) => ({
        symbol: stock.symbol,
        ltp: stock.lastPrice,
        percentChange: stock.pChange,
        volume: stock.totalTradedVolume,
        volumeRatio: 1.5,
        sector: stock.sector,
      }));

      return NextResponse.json(losers);
    }

    case "sectors": {
      const data = await fetchNSE<{
        data: Array<{
          key: string;
          indexSymbol: string;
          last: number;
          percentChange: number;
        }>;
      }>("/api/allIndices");

      if (!data?.data) {
        return NextResponse.json({ error: "Failed to fetch sectors" }, { status: 500 });
      }

      const sectors = data.data
        .filter((idx) =>
          ["BFSI", "IT", "AUTO", "PHARMA", "METAL", "FMCG", "ENERGY", "REALTY", "MEDIA"].some(
            (sector) => idx.key?.includes(sector)
          )
        )
        .map((idx) => ({
          name: idx.key,
          symbol: idx.indexSymbol,
          value: idx.last,
          percentChange: idx.percentChange,
        }));

      return NextResponse.json(sectors);
    }

    case "constituents": {
      const index = searchParams.get("index") || "NIFTY 50";
      const data = await fetchNSE<{
        data: Array<{
          symbol: string;
          open: number;
          high: number;
          low: number;
          ltP: number | string;
          previousClose: number;
          change: number;
          perChange: number;
          trdVol: number;
          mktCap: number;
          series: string;
        }>;
        name: string;
      }>(`/api/equity-stockIndices?index=${encodeURIComponent(index)}`);

      if (!data?.data) {
        return NextResponse.json({ error: "Failed to fetch constituents" }, { status: 500 });
      }

      const stocks = data.data
        .filter((s) => s.series === "EQ" || s.series === "BE")
        .map((s) => ({
          symbol: s.symbol,
          last_price: typeof s.ltP === "string" ? parseFloat(s.ltP) || 0 : s.ltP || 0,
          previous_close: s.previousClose || 0,
          change: s.change || 0,
          percent_change: s.perChange || 0,
          volume: s.trdVol || 0,
          market_cap: (s.mktCap || 0) * 1e7,
          company_name: s.symbol,
        }));

      return NextResponse.json({ index: data.name || index, stocks, timestamp: Date.now() });
    }

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
