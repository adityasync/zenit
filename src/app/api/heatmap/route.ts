import { NextResponse } from "next/server";

const NSE_API = "https://nse-api-ruby.vercel.app";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

const SECTOR_MAPPINGS: Record<string, string[]> = {
  'IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM','INFOYS','MPHASIS','Mindtree','LTI','COGNIZANT'],
  'BFSI': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSIND','BANKBARODA','FEDERALBNK','YESBANK','RBLBANK','AUBAND','BANDHANBNK'],
  'AUTO': ['MARUTI','M&M','TATAMOTORS','BAJFINANCE','HEROMOTOCO','EXIDEIND','BHARATPETROL'],
  'PHARMA': ['SUNPHARMA','DRREDDY','CIPLA','LUPIN','APOLLOHOSP','METROBRAND','GLAND','SEQUOIA'],
  'FMCG': ['HINDUNILVR','ITC','NESTLEIND','TITAN','COLGATE','DABUR','BRITANIA','MARICO'],
  'METAL': ['TATASTEEL','HINDALCO','JSWSTEEL','SAIL','NMDC','VEDL','COALINDIA','ANUPANCHI'],
  'ENERGY': ['RELIANCE','ONGC','BPCL','IOC','GAIL','CPCBRL','COFORGE','OIL','GUASOIL'],
  'REALTY': ['DLF','GODREJPRO','OBEROIRLTY','BRADAGEO','PERSISTENT','PHOENIXLTM']
};

const INDEX_STOCKS: Record<string, string[]> = {
  'Nifty 50': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL','WIPRO','M&M','NESTLEIND','ULTRACEMCO','ADANIENT','SBILIFE','AXISBANK','ASIANPAINT','HCLTECH','ADANIPORTS','COALINDIA','TATAMOTORS','BAJAJFINSV','DRREDDY','ONGC','CIPLA','BPCL','NTPC','POWERGRID','GRASIM','DIVISLAB','JSWSTEEL','ADANIGREEN','HAL','ZOMATO'],
  'nifty50': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL','WIPRO','M&M','NESTLEIND','ULTRACEMCO','ADANIENT','SBILIFE','AXISBANK','ASIANPAINT','HCLTECH','ADANIPORTS','COALINDIA','TATAMOTORS','BAJAJFINSV','DRREDDY','ONGC','CIPLA','BPCL','NTPC','POWERGRID','GRASIM','DIVISLAB','JSWSTEEL','ADANIGREEN','HAL','ZOMATO'],
  'Bank Nifty': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSIND','FEDERALBNK','YESBANK','RBLBANK','BANDHANBNK'],
  'banknifty': ['HDFCBANK','ICICIBANK','SBIN','KOTAKBANK','AXISBANK','INDUSIND','FEDERALBNK','YESBANK','RBLBANK','BANDHANBNK'],
  'Sensex': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL'],
  'sensex': ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL'],
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error('All retries failed');
}

async function fetchBatchQuotes(symbols: string[]): Promise<any[]> {
  const chunkSize = 5;
  const chunks: string[][] = [];
  
  for (let i = 0; i < symbols.length; i += chunkSize) {
    chunks.push(symbols.slice(i, i + chunkSize));
  }

  const flatResults: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const symList = chunk.join(',');
      const res = await fetchWithRetry(
        `${NSE_API}/stock/list?symbols=${symList}&res=num`,
        { signal: AbortSignal.timeout(45000) },
        3
      );
      const data = await res.json();
      
      if (data.stocks) {
        for (const stock of data.stocks) {
          const lastPrice = stock.last_price;
          const prevClose = stock.previous_close || 0;
          const isLive = typeof lastPrice === 'number' && !isNaN(lastPrice);
          
          flatResults.push({
            ...stock,
            last_price: isLive ? lastPrice : prevClose,
            percent_change: isLive ? stock.percent_change : 0,
            isDelayed: !isLive,
          });
        }
      }
    } catch (err) {
      console.error(`Heatmap chunk fetch failed for ${chunk.join(',')}`, err);
    }

    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  
  return flatResults;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "sectors";
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `heatmap:${view}`;
  const cached = CACHE.get(cacheKey);

  // Stale-While-Revalidate pattern: Refresh in background if slightly stale
  if (!forceRefresh && cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    let stocks: any[] = [];
    let groups: Record<string, any[]> = {};

    if (view === "sectors") {
      const allSymbols = Object.values(SECTOR_MAPPINGS).flat();
      stocks = await fetchBatchQuotes(allSymbols);
      
      Object.entries(SECTOR_MAPPINGS).forEach(([sector, symbols]) => {
        groups[sector] = stocks.filter(s => symbols.includes(s.symbol));
      });
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

    // Cache for 60 seconds for near-realtime freshness
    CACHE.set(cacheKey, { data: responseData, expiry: Date.now() + 60000 });
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Heatmap error:", error);
    // Return stale data on error if available
    if (cached) {
       return NextResponse.json(cached.data);
    }
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}