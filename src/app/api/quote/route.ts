import { NextResponse } from 'next/server';
import { fetchQuote, fetchChart, normalizeChartQuote } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE';

  try {
    // Try v7 quote API first (richer data: PE, market cap, 52w range)
    const quote = await fetchQuote(symbol, { timeoutMs: 6000, cacheTtlMs: 60000 });

    if (quote) {
      return NextResponse.json({
        symbol: quote.symbol || symbol,
        ltp: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        percentChange: quote.regularMarketChangePercent || 0,
        open: quote.regularMarketOpen || 0,
        high: quote.regularMarketDayHigh || 0,
        low: quote.regularMarketDayLow || 0,
        close: quote.regularMarketPrice || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap || 0,
        pe: quote.trailingPE || 0,
        sector: '',
        companyName: quote.shortName || quote.longName || symbol,
        timestamp: Date.now(),
        isDelayed: false,
      });
    }

    // Fallback to chart API
    const chart = await fetchChart(symbol, { range: '1d', interval: '1d', timeoutMs: 6000, cacheTtlMs: 60000 });
    if (chart) {
      const q = normalizeChartQuote(chart);
      return NextResponse.json({
        symbol: symbol,
        ltp: q.price,
        change: q.change,
        percentChange: q.percentChange,
        open: q.price - q.change,
        high: 0,
        low: 0,
        close: q.previousClose,
        volume: q.volume,
        marketCap: 0,
        pe: 0,
        sector: '',
        companyName: q.shortName || symbol,
        timestamp: Date.now(),
        isDelayed: false,
      });
    }

    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}