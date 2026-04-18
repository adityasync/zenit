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
    CACHE.set(cacheKey, { data, expiry: Date.now() + 30000 });
    return data;
  } catch {
    return null;
  }
}

interface OptionStrike {
  strike: number;
  ce: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    ltp: number;
    bid: number;
    ask: number;
  };
  pe: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    ltp: number;
    bid: number;
    ask: number;
  };
}

interface OptionsChain {
  symbol: string;
  underlying: string;
  spotPrice: number;
  pcr: number;
  maxPain: number;
  expiry: string;
  expiryDates: string[];
  strikes: OptionStrike[];
  timestamp: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "NIFTY";
  const expiry = searchParams.get("expiry");

  const upperSymbol = symbol.toUpperCase();

  const data = await fetchNSE<{
    records: {
      expiryDates: string[];
      data: Array<{
        strikePrices: number[];
        options: Array<{
          PE: {
            strikePrice: number;
            expiryDate: string;
            underlying: string;
            openInterest: number;
            changeinOpenInterest: number;
            totalTradedVolume: number;
            impliedVolatility: number;
            lastPrice: number;
            change: number;
            bidprice: number;
            askPrice: number;
          };
          CE: {
            strikePrice: number;
            expiryDate: string;
            underlying: string;
            openInterest: number;
            changeinOpenInterest: number;
            totalTradedVolume: number;
            impliedVolatility: number;
            lastPrice: number;
            change: number;
            bidprice: number;
            askPrice: number;
          };
        }>;
      }>;
      underlying: string;
      spotPrice: number;
    };
  }>(`/api/option-chain-indices?symbol=${upperSymbol}`, true);

  if (!data?.records) {
    return NextResponse.json({ error: "Options data not available" }, { status: 404 });
  }

  const expiryDates = data.records.expiryDates || [];
  const selectedExpiry = expiry || expiryDates[0];

  const optionsData = data.records.data?.find(
    (d) => d.options[0]?.CE?.expiryDate === selectedExpiry
  ) || data.records.data?.[0];

  if (!optionsData?.options) {
    return NextResponse.json({ error: "Options data not available for expiry" }, { status: 404 });
  }

  const strikes: OptionStrike[] = optionsData.options
    .filter((opt) => opt.CE && opt.PE)
    .map((opt) => ({
      strike: opt.CE.strikePrice,
      ce: {
        oi: opt.CE.openInterest || 0,
        oiChange: opt.CE.changeinOpenInterest || 0,
        volume: opt.CE.totalTradedVolume || 0,
        iv: opt.CE.impliedVolatility || 0,
        ltp: opt.CE.lastPrice || 0,
        bid: opt.CE.bidprice || 0,
        ask: opt.CE.askPrice || 0,
      },
      pe: {
        oi: opt.PE.openInterest || 0,
        oiChange: opt.PE.changeinOpenInterest || 0,
        volume: opt.PE.totalTradedVolume || 0,
        iv: opt.PE.impliedVolatility || 0,
        ltp: opt.PE.lastPrice || 0,
        bid: opt.PE.bidprice || 0,
        ask: opt.PE.askPrice || 0,
      },
    }))
    .sort((a, b) => a.strike - b.strike);

  const totalCEOI = strikes.reduce((sum, s) => sum + s.ce.oi, 0);
  const totalPEOI = strikes.reduce((sum, s) => sum + s.pe.oi, 0);
  const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0;

  const atmStrike = strikes.reduce((prev, curr) =>
    Math.abs(curr.strike - (data.records.spotPrice || 0)) <
    Math.abs(prev.strike - (data.records.spotPrice || 0))
      ? curr
      : prev
  ).strike;

  const chain: OptionsChain = {
    symbol: upperSymbol,
    underlying: data.records.underlying || upperSymbol,
    spotPrice: data.records.spotPrice || 0,
    pcr: parseFloat(pcr.toFixed(2)),
    maxPain: atmStrike,
    expiry: selectedExpiry,
    expiryDates,
    strikes,
    timestamp: Date.now(),
  };

  return NextResponse.json(chain);
}
