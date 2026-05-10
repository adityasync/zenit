import { NextResponse } from 'next/server';
import { fetchChart } from '@/lib/yahoo';
import { fetchGrowwOptionChain } from '@/lib/yahoo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';

  // Fetch spot price from Yahoo and option chain from Groww in parallel
  const yahooSymbol = symbol === 'BANKNIFTY' ? '^NSEBANK' : '^NSEI';
  const [yahooResult, growwData] = await Promise.all([
    fetchChart(yahooSymbol, { interval: '1d', range: '1d', cacheTtlMs: 30_000 }),
    fetchGrowwOptionChain(symbol),
  ]);

  const spot = yahooResult?.meta?.regularMarketPrice || growwData?.spotPrice || 0;

  if (!spot) {
    return NextResponse.json({
      underlying: 0, support: 0, pivot: 0, resistance: 0, maxPain: 0, pcr: '0',
      source: 'unavailable', timestamp: Date.now(),
    });
  }

  if (!growwData) {
    // Fallback: derive from spot price
    const rounded = Math.round(spot / 50) * 50;
    return NextResponse.json({
      underlying: spot, support: rounded - 100, pivot: rounded, resistance: rounded + 100,
      maxPain: rounded, pcr: '1.00', source: 'yahoo', timestamp: Date.now(),
    });
  }

  // Compute levels from option chain OI
  let supportStrike = 0;
  let supportOI = 0;
  let resistanceStrike = 0;
  let resistanceOI = 0;
  let maxPainStrike = 0;
  let maxPainOI = 0;
  let totalCEOI = 0;
  let totalPEOI = 0;

  for (const s of growwData.strikes) {
    totalCEOI += s.ce.oi;
    totalPEOI += s.pe.oi;

    // Support = strike with highest PUT OI
    if (s.pe.oi > supportOI) {
      supportOI = s.pe.oi;
      supportStrike = s.strike;
    }

    // Resistance = strike with highest CALL OI
    if (s.ce.oi > resistanceOI) {
      resistanceOI = s.ce.oi;
      resistanceStrike = s.strike;
    }

    // Max pain = strike with highest total OI
    const totalOI = s.ce.oi + s.pe.oi;
    if (totalOI > maxPainOI) {
      maxPainOI = totalOI;
      maxPainStrike = s.strike;
    }
  }

  const pcr = totalCEOI > 0 ? (totalPEOI / totalCEOI) : 0;
  const pivot = Math.round(spot / 50) * 50;

  return NextResponse.json({
    underlying: spot,
    support: supportStrike,
    pivot,
    resistance: resistanceStrike,
    maxPain: maxPainStrike,
    pcr: pcr.toFixed(2),
    supportOI,
    resistanceOI,
    source: 'groww',
    timestamp: Date.now(),
  });
}
