import { NextResponse } from "next/server";
import { fetchIndexStocks, type IndexStock } from "@/lib/nse-indices";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";
import { getCachedData, setCachedData } from "@/lib/redis";

// Sector groupings — used only for the "sectors" view
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

function toHeatmapStock(s: IndexStock, sector?: string): HeatmapStock {
  return {
    symbol: s.symbol,
    last_price: s.last_price,
    previous_close: s.previous_close,
    change: s.change,
    percent_change: s.percent_change,
    volume: s.volume,
    market_cap: s.market_cap,
    sector: sector || "",
    company_name: s.company_name,
  };
}

const LOCAL_CACHE = new Map<string, { data: unknown; expiry: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "sectors";
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `heatmap:${view}`;

  if (!forceRefresh) {
    const redisData = await getCachedData<unknown>(cacheKey);
    if (redisData) return NextResponse.json(redisData);
    const local = LOCAL_CACHE.get(cacheKey);
    if (local && local.expiry > Date.now()) return NextResponse.json(local.data);
  }

  try {
    let stocks: HeatmapStock[];
    let groups: Record<string, HeatmapStock[]> = {};

    if (view === "sectors") {
      // Sectors view: fetch all sector stocks from Yahoo (NSE doesn't have a sector-stocks endpoint)
      const allSymbols = Object.values(SECTOR_MAPPINGS).flat();
      const chartMap = await fetchChartBatch(allSymbols, { batchSize: 10, batchDelayMs: 100, timeoutMs: 3000 });
      const allStocks: HeatmapStock[] = [];
      chartMap.forEach((chart, sym) => {
        const q = normalizeChartQuote(chart);
        const indicatorVolume = chart.indicators?.quote?.[0]?.volume?.find((v): v is number => v != null && v > 0) ?? 0;
        allStocks.push({
          symbol: sym,
          last_price: q.price,
          previous_close: q.previousClose,
          change: q.change,
          percent_change: q.percentChange,
          volume: q.volume || indicatorVolume,
          market_cap: 0,
          sector: "",
          company_name: q.shortName || sym,
        });
      });
      stocks = allStocks;
      for (const [sector, symbols] of Object.entries(SECTOR_MAPPINGS)) {
        groups[sector] = stocks.filter(s => symbols.includes(s.symbol));
      }
    } else {
      // Index views (nifty50, banknifty, sensex): fetch from NSE dynamically
      const indexStocks = await fetchIndexStocks(view);
      stocks = indexStocks.map(s => toHeatmapStock(s));
      groups = { [view]: stocks };
    }

    const responseData = {
      view,
      timestamp: Date.now(),
      stocks,
      groups,
      totalStocks: stocks.length
    };

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
