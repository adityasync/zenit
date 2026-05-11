/**
 * Fetches index constituents and live prices from NSE India.
 * Returns dynamic data — automatically reflects quarterly reshuffles.
 *
 * Primary: NSE `equity-stockIndices` endpoint (constituents + prices in one call)
 * Fallback: Yahoo Finance batch fetch (prices only, hardcoded constituents)
 */

import { getCachedData, setCachedData } from "./redis";
import { fetchChartBatch, normalizeChartQuote } from "./yahoo";

const NSE_BASE_URL = "https://www.nseindia.com";

export interface IndexStock {
  symbol: string;
  last_price: number;
  previous_close: number;
  change: number;
  percent_change: number;
  volume: number;
  market_cap: number;
  company_name: string;
}

// Sensex is a BSE index — NSE doesn't serve it. Hardcoded with fallback to Yahoo prices.
const SENSEX_SYMBOLS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
  "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
  "BAJFINANCE","TATASTEEL","HCLTECH","TECHM","NTPC","POWERGRID",
  "AXISBANK","BAJAJ-AUTO","TATAMOTORS","M&M","ULTRACEMCO",
];

// Map view names to NSE index parameter values
const NSE_INDEX_MAP: Record<string, string> = {
  nifty50: "NIFTY 50",
  banknifty: "NIFTY BANK",
  niftyit: "NIFTY IT",
  niftyauto: "NIFTY AUTO",
  niftypharma: "NIFTY PHARMA",
};

// In-memory cookie cache (NSE requires a session cookie)
let nseCookies: string | null = null;
let nseCookiesExpiry = 0;

async function getNseCookies(): Promise<string | null> {
  if (nseCookies && Date.now() < nseCookiesExpiry) return nseCookies;
  try {
    const res = await fetch(NSE_BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    nseCookies = res.headers.getSetCookie?.()?.join("; ") || null;
    nseCookiesExpiry = Date.now() + 60_000; // refresh cookies every 60s
    return nseCookies;
  } catch {
    return null;
  }
}

interface NseStockRaw {
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
}

interface NseIndexResponse {
  data: NseStockRaw[];
  name: string;
  timestamp: string;
}

/**
 * Fetch index constituents + live prices from NSE.
 * Caches the constituent list for 1 hour (reshuffles are quarterly).
 * Caches prices for 30s (live during market hours).
 */
export async function fetchNseIndex(view: string): Promise<IndexStock[] | null> {
  const indexName = NSE_INDEX_MAP[view];
  if (!indexName) return null;

  const cacheKey = `nse-index:${view}`;

  // Try Redis first
  const cached = await getCachedData<IndexStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const cookies = await getNseCookies();
    const res = await fetch(
      `${NSE_BASE_URL}/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          ...(cookies && { Cookie: cookies }),
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;

    const json: NseIndexResponse = await res.json();
    if (!json.data?.length) return null;

    const stocks: IndexStock[] = json.data
      .filter((s) => s.series === "EQ" || s.series === "BE")
      .map((s) => ({
        symbol: s.symbol,
        last_price: typeof s.ltP === "string" ? parseFloat(s.ltP) || 0 : s.ltP || 0,
        previous_close: s.previousClose || 0,
        change: s.change || 0,
        percent_change: s.perChange || 0,
        volume: s.trdVol || 0,
        market_cap: (s.mktCap || 0) * 1e7, // NSE returns in Cr, convert to absolute
        company_name: s.symbol,
      }));

    // Cache for 30s — prices are live during market hours
    await setCachedData(cacheKey, stocks, 30);
    return stocks;
  } catch {
    return null;
  }
}

/**
 * Fetch Sensex constituents — uses Yahoo Finance since Sensex is a BSE index.
 */
export async function fetchSensexStocks(): Promise<IndexStock[] | null> {
  const cacheKey = "nse-index:sensex";

  const cached = await getCachedData<IndexStock[]>(cacheKey);
  if (cached) return cached;

  try {
    const chartMap = await fetchChartBatch(SENSEX_SYMBOLS, {
      batchSize: 10,
      batchDelayMs: 100,
      timeoutMs: 3000,
    });

    const stocks: IndexStock[] = [];
    chartMap.forEach((chart, symbol) => {
      const q = normalizeChartQuote(chart);
      const indicatorVolume =
        chart.indicators?.quote?.[0]?.volume?.find(
          (v): v is number => v != null && v > 0
        ) ?? 0;
      stocks.push({
        symbol,
        last_price: q.price,
        previous_close: q.previousClose,
        change: q.change,
        percent_change: q.percentChange,
        volume: q.volume || indicatorVolume,
        market_cap: 0,
        company_name: q.shortName || symbol,
      });
    });

    await setCachedData(cacheKey, stocks, 30);
    return stocks;
  } catch {
    return null;
  }
}

/**
 * Universal fetcher — tries NSE first, falls back to Yahoo Finance.
 * For Sensex, always uses Yahoo (BSE index, NSE doesn't serve it).
 */
export async function fetchIndexStocks(view: string): Promise<IndexStock[]> {
  // Sensex is BSE — always use Yahoo
  if (view === "sensex") {
    return (await fetchSensexStocks()) || [];
  }

  // Try NSE first (dynamic constituents + live prices)
  const nseStocks = await fetchNseIndex(view);
  if (nseStocks?.length) return nseStocks;

  // Fallback: Yahoo Finance with hardcoded constituents
  return fetchYahooFallback(view);
}

/**
 * Yahoo Finance fallback — used when NSE is unavailable.
 * Uses hardcoded constituent lists (may drift from current index composition).
 */
async function fetchYahooFallback(view: string): Promise<IndexStock[]> {
  const FALLBACK_SYMBOLS: Record<string, string[]> = {
    nifty50: [
      "ADANIENT","ADANIPORTS","APOLLOHOSP","ASIANPAINT","AXISBANK",
      "BAJAJ-AUTO","BAJFINANCE","BAJAJFINSV","BHARTIARTL","BPCL",
      "BRITANNIA","CIPLA","COALINDIA","DIVISLAB","DRREDDY",
      "EICHERMOT","GRASIM","HCLTECH","HDFCBANK","HDFCLIFE",
      "HEROMOTOCO","HINDALCO","HINDUNILVR","ICICIBANK","INDUSINDBK",
      "INFY","ITC","JSWSTEEL","KOTAKBANK","LT",
      "M&M","MARUTI","NESTLEIND","NTPC","ONGC",
      "POWERGRID","RELIANCE","SBILIFE","SBIN","SUNPHARMA",
      "TCS","TATACONSUM","TATAMOTORS","TATASTEEL","TECHM",
      "TITAN","ULTRACEMCO","UPL","WIPRO","TRENT",
    ],
    banknifty: [
      "HDFCBANK","ICICIBANK","SBIN","KOTAKBANK","AXISBANK","INDUSINDBK",
      "BANDHANBNK","FEDERALBNK","IDFCFIRSTB","PNB","AUBANK","BANKBARODA",
    ],
  };

  const symbols = FALLBACK_SYMBOLS[view];
  if (!symbols) return [];

  const cacheKey = `yahoo-fallback:${view}`;
  const cached = await getCachedData<IndexStock[]>(cacheKey);
  if (cached) return cached;

  const chartMap = await fetchChartBatch(symbols, {
    batchSize: 10,
    batchDelayMs: 100,
    timeoutMs: 3000,
  });

  const stocks: IndexStock[] = [];
  chartMap.forEach((chart, symbol) => {
    const q = normalizeChartQuote(chart);
    const indicatorVolume =
      chart.indicators?.quote?.[0]?.volume?.find(
        (v): v is number => v != null && v > 0
      ) ?? 0;
    stocks.push({
      symbol,
      last_price: q.price,
      previous_close: q.previousClose,
      change: q.change,
      percent_change: q.percentChange,
      volume: q.volume || indicatorVolume,
      market_cap: 0,
      company_name: q.shortName || symbol,
    });
  });

  await setCachedData(cacheKey, stocks, 30);
  return stocks;
}
