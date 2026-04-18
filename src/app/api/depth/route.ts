import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE';
  
  try {
    // Get detailed quote with level 2 data from Yahoo
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/${symbol}?fields=shortName,longName,regularMarketPrice,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,averageDailyVolume,marketCap,peRatio,priceToBook,regularMarketChange,regularMarketChangePercent`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!res.ok) throw new Error('Yahoo failed');
    
    const data = await res.json();
    const quote = data?.quoteResponse?.result?.[0];
    
    if (!quote) throw new Error('No quote data');
    
    return NextResponse.json({
      symbol: quote.symbol || symbol,
      name: quote.shortName || quote.longName || symbol,
      ltp: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      percentChange: quote.regularMarketChangePercent || 0,
      open: quote.regularMarketPrice - (quote.regularMarketChange || 0),
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume || 0,
      marketCap: quote.marketCap || 0,
      pe: quote.peRatio || 0,
      pb: quote.priceToBook || 0
    });
  } catch (e) {
    console.error('Depth fetch error:', e);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}