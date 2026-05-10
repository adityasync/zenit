import { NextResponse } from "next/server";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";

const SECTOR_MAPPINGS: Record<string, string[]> = {
  'IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM'],
  'BFSI': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSIND'],
  'AUTO': ['MARUTI','TATAMOTORS','BAJFINANCE'],
  'PHARMA': ['SUNPHARMA','DRREDDY','CIPLA','LUPIN'],
  'FMCG': ['HINDUNILVR','ITC','NESTLEIND','TITAN'],
  'METAL': ['TATASTEEL','HINDALCO','JSWSTEEL','VEDL','COALINDIA'],
  'ENERGY': ['RELIANCE','ONGC','BPCL','NTPC','POWERGRID'],
  'REALTY': ['DLF','GODREJPRO','OBEROIRLTY']
};

const INDEX_STOCKS: Record<string, string[]> = {
  'nifty50': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL','WIPRO','HCLTECH'],
  'banknifty': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSIND'],
  'sensex': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL'],
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
  return {
    symbol,
    last_price: q.price,
    previous_close: q.previousClose,
    change: q.change,
    percent_change: q.percentChange,
    volume: q.volume,
    market_cap: 0,
    sector: "",
    company_name: q.shortName || symbol,
  };
}

const CACHE = new Map<string, { data: unknown; expiry: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "sectors";
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `heatmap:${view}`;
  const cached = CACHE.get(cacheKey);

  if (!forceRefresh && cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
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

    CACHE.set(cacheKey, { data: responseData, expiry: Date.now() + 30000 });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Heatmap error:", error);
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}