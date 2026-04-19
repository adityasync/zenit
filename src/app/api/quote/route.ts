import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://nse-api-ruby.vercel.app';

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
      return NextResponse.json({
        symbol,
        ltp: d.last_price,
        change: d.change,
        percentChange: d.percent_change,
        open: d.open,
        high: d.day_high,
        low: d.day_low,
        close: d.previous_close,
        volume: d.volume,
        marketCap: d.market_cap,
        pe: d.pe_ratio,
        sector: d.sector,
        companyName: d.company_name,
        timestamp: Date.now(),
      });
    }
    
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}