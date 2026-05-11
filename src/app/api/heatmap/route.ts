import { NextResponse } from "next/server";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";
import { getCachedData, setCachedData } from "@/lib/redis";

const SECTOR_MAPPINGS: Record<string, string[]> = {
  'IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM'],
  'BFSI': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSINDBK'],
  'AUTO': ['MARUTI','TATAMOTORS','BAJFINANCE'],
  'PHARMA': ['SUNPHARMA','DRREDDY','CIPLA','LUPIN'],
  'FMCG': ['HINDUNILVR','ITC','NESTLEIND','TITAN'],
  'METAL': ['TATASTEEL','HINDALCO','JSWSTEEL','VEDL','COALINDIA'],
  'ENERGY': ['RELIANCE','ONGC','BPCL','NTPC','POWERGRID'],
  'REALTY': ['DLF','GODREJPRO','OBEROIRLTY']
};

const INDEX_STOCKS: Record<string, string[]> = {
  'nifty50': [
    'ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK',
    'BAJAJ-AUTO','BAJFINANCE','BAJAJFINSV','BHARTIARTL','BPCL',
    'BRITANNIA','CIPLA','COALINDIA','DIVISLAB','DRREDDY',
    'EICHERMOT','GRASIM','HCLTECH','HDFCBANK','HDFCLIFE',
    'HEROMOTOCO','HINDALCO','HINDUNILVR','ICICIBANK','INDUSINDBK',
    'INFY','ITC','JSWSTEEL','KOTAKBANK','LT',
    'M&M','MARUTI','NESTLEIND','NTPC','ONGC',
    'POWERGRID','RELIANCE','SBILIFE','SBIN','SUNPHARMA',
    'TCS','TATACONSUM','TATAMOTORS','TATASTEEL','TECHM',
    'TITAN','ULTRACEMCO','UPL','WIPRO','TRENT',
  ],
  'banknifty': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSINDBK'],
  'sensex': [
    'RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN',
    'BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI',
    'SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL','HCLTECH',
    'TECHM','NTPC','POWERGRID','AXISBANK','BAJAJ-AUTO',
    'TATAMOTORS','M&M','ULTRACEMCO',
  ],
};

interface HeatmapStock {
  symbol: string;
  last_price: number;
  previous_close: number;
  change: number;
  percent_change: number;
  volume: number;
  market_cap: number;
  sector: string;
  company_name: string;
}

function chartToStock(symbol: string, chart: import("@/lib/yahoo").YahooChartResult): HeatmapStock {
  const q = normalizeChartQuote(chart);
  // Yahoo chart API may return 0 for regularMarketVolume outside market hours;
  // fall back to the indicator volume array to get a usable weight for treemap sizing.
  const indicatorVolume = chart.indicators?.quote?.[0]?.volume?.find((v): v is number => v != null && v > 0) ?? 0;
  const volume = q.volume || indicatorVolume;

  return {
    symbol,
    last_price: q.price,
    previous_close: q.previousClose,
    change: q.change,
    percent_change: q.percentChange,
    volume,
    market_cap: 0,
    sector: "",
    company_name: q.shortName || symbol,
  };
}

const LOCAL_CACHE = new Map<string, { data: unknown; expiry: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "sectors";
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `heatmap:${view}`;

  if (!forceRefresh) {
    // Try Redis first (shared across instances), then local fallback
    const redisData = await getCachedData<unknown>(cacheKey);
    if (redisData) return NextResponse.json(redisData);
    const local = LOCAL_CACHE.get(cacheKey);
    if (local && local.expiry > Date.now()) return NextResponse.json(local.data);
  }

  try {
    const allSymbols = view === "sectors"
      ? Object.values(SECTOR_MAPPINGS).flat()
      : INDEX_STOCKS[view] || INDEX_STOCKS['nifty50'];

    const chartMap = await fetchChartBatch(allSymbols, { batchSize: 10, batchDelayMs: 100, timeoutMs: 3000 });
    const stocks: HeatmapStock[] = [];
    chartMap.forEach((chart, sym) => stocks.push(chartToStock(sym, chart)));

    let groups: Record<string, HeatmapStock[]> = {};
    if (view === "sectors") {
      for (const [sector, symbols] of Object.entries(SECTOR_MAPPINGS)) {
        groups[sector] = stocks.filter(s => symbols.includes(s.symbol));
      }
    } else {
      groups = { [view]: stocks };
    }

    const responseData = {
      view,
      timestamp: Date.now(),
      stocks,
      groups,
      totalStocks: stocks.length
    };

    // Write to both Redis (shared) and local (fast fallback)
    await setCachedData(cacheKey, responseData, 30);
    LOCAL_CACHE.set(cacheKey, { data: responseData, expiry: Date.now() + 30000 });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Heatmap error:", error);
    const local = LOCAL_CACHE.get(cacheKey);
    if (local) return NextResponse.json(local.data);
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}