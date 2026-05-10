import { NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/yahoo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE';

  try {
    const quote = await fetchQuote(symbol, { cacheTtlMs: 15_000 });
    if (!quote) throw new Error('No quote data');

    return NextResponse.json({
      symbol: quote.symbol || symbol,
      name: quote.shortName || quote.longName || symbol,
      ltp: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      percentChange: quote.regularMarketChangePercent || 0,
      open: quote.regularMarketOpen || quote.regularMarketPrice - (quote.regularMarketChange || 0),
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      dayRange: quote.regularMarketDayRange || `${quote.regularMarketDayLow || 0} - ${quote.regularMarketDayHigh || 0}`,
      volume: quote.regularMarketVolume || 0,
      avgVolume: quote.averageDailyVolume10days || 0,
      marketCap: quote.marketCap || 0,
      pe: quote.trailingPE || 0,
      pb: quote.priceToBook || 0,
      weekHigh52: quote.fiftyTwoWeekHigh || 0,
      weekLow52: quote.fiftyTwoWeekLow || 0,
    });
  } catch (e) {
    console.error('Depth fetch error:', e);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}