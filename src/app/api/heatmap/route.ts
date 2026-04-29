import { NextResponse } from "next/server";

const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

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

async function fetchYahooQuote(symbol: string): Promise<any> {
  try {
    const res = await fetch(`${YAHOO_API}/${symbol}.NS?interval=1d`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    if (!meta || !quote) return null;
    
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const change = price - prevClose;
    const percentChange = prevClose > 0 ? (change / prevClose) * 100 : 0;
    
    return {
      symbol,
      last_price: price,
      previous_close: prevClose,
      change,
      percent_change: percentChange,
      volume: meta.regularMarketVolume || 0,
      market_cap: 0,
      sector: '',
      company_name: meta.shortName || symbol
    };
  } catch {
    return null;
  }
}

async function fetchBatchQuotes(symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  
  for (const symbol of symbols) {
    const quote = await fetchYahooQuote(symbol);
    if (quote) {
      results.push(quote);
    }
  }
  
  return results;
}

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
    let stocks: any[] = [];
    let groups: Record<string, any[]> = {};

    if (view === "sectors") {
      const allSymbols = Object.values(SECTOR_MAPPINGS).flat();
      stocks = await fetchBatchQuotes(allSymbols);
      
      for (const [sector, symbols] of Object.entries(SECTOR_MAPPINGS)) {
        groups[sector] = stocks.filter(s => symbols.includes(s.symbol));
      }
    } else {
      const symbols = INDEX_STOCKS[view] || INDEX_STOCKS['nifty50'];
      stocks = await fetchBatchQuotes(symbols);
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
    if (cached) {
       return NextResponse.json(cached.data);
    }
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}