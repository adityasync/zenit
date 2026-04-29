import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'http://65.0.104.9';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE';
  
  try {
    const res = await fetch(`${BASE_URL}/stock?symbol=${symbol}.NS&res=num`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    
    if (data.status === 'success' && data.data) {
      const d = data.data;
      const lastPrice = d.last_price;
      const prevClose = d.previous_close || 0;
      const isLive = typeof lastPrice === 'number' && lastPrice !== null && !isNaN(lastPrice);
      
      return NextResponse.json({
        symbol: data.symbol,
        ltp: isLive ? lastPrice : prevClose,
        change: isLive ? d.change : 0,
        percentChange: isLive ? d.percent_change : 0,
        open: isLive ? d.open : prevClose,
        high: isLive ? d.day_high : prevClose,
        low: isLive ? d.day_low : prevClose,
        close: prevClose,
        volume: d.volume,
        marketCap: d.market_cap,
        pe: d.pe_ratio,
        sector: d.sector,
        companyName: d.company_name,
        timestamp: Date.now(),
        isDelayed: !isLive,
      });
    }
    
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}