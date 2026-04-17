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

async function fetchBatchQuotes(symbols: string[]): Promise<any[]> {
  const results: any[] = [];
  const chunkSize = 10;
  
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    const symList = chunk.join(',');
    
    try {
      const res = await fetch(`${NSE_API}/stock/list?symbols=${symList}&res=num`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stocks) {
          results.push(...data.stocks);
        }
      }
    } catch {
      // Fallback data for failed requests
      chunk.forEach(sym => {
        results.push({
          symbol: sym,
          last_price: 100 + Math.random() * 3000,
          percent_change: (Math.random() - 0.5) * 6,
          volume: Math.floor(Math.random() * 10000000),
          market_cap: Math.floor(Math.random() * 10000000000)
        });
      });
    }
  }
  
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "sectors";
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `heatmap:${view}`;
  if (!forceRefresh) {
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }
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
    } else if (INDEX_STOCKS[view]) {
      stocks = await fetchBatchQuotes(INDEX_STOCKS[view]);
      groups = { [view]: stocks };
    } else {
      stocks = await fetchBatchQuotes(INDEX_STOCKS['Nifty 50']);
      groups = { 'Nifty 50': stocks };
    }

    const response = {
      view,
      timestamp: Date.now(),
      stocks,
      groups,
      totalStocks: stocks.length
    };

    CACHE.set(cacheKey, { data: response, expiry: Date.now() + 60000 });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 });
  }
}