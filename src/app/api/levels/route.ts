import { NextResponse } from 'next/server';

async function getYahooOptionChain(symbol: string = 'NIFTY') {
  const YahooSymbol = symbol === 'NIFTY' ? '%5ENSEI' : symbol === 'BANKNIFTY' ? '%5EBANKIX' : '%5ENSEI';
  
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${YahooSymbol}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function getNiftyLevels(spot: number): { support: number; resistance: number; pivot: number; maxPain: number; pcr: string } {
  const rounded = Math.round(spot / 50) * 50;
  return {
    support: rounded - 100,
    pivot: rounded,
    resistance: rounded + 100,
    maxPain: rounded,
    pcr: '1.00'
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';
  
  const data = await getYahooOptionChain(symbol);
  
  if (data?.chart?.result?.[0]) {
    const spot = data.chart.result[0].meta?.regularMarketPrice;
    if (spot) {
      const levels = getNiftyLevels(spot);
      return NextResponse.json({
        underlying: spot,
        ...levels,
        source: 'yahoo',
        timestamp: Date.now()
      });
    }
  }
  
  // Fallback - use last known or placeholder
  return NextResponse.json({
    underlying: 22800,
    support: 22700,
    pivot: 22800,
    resistance: 22900,
    maxPain: 22800,
    pcr: '1.05',
    source: 'fallback',
    timestamp: Date.now(),
    error: 'Live data unavailable'
  }, { status: 200 });
}