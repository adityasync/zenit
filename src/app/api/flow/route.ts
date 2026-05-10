import { NextResponse } from 'next/server';
import { fetchGrowwOptionChain, type GrowwResult } from '@/lib/yahoo';

function analyzeFlow(data: GrowwResult) {
  const { spotPrice, strikes } = data;

  // Find ATM strike
  let atmStrike = 0;
  let minDiff = Infinity;
  for (const s of strikes) {
    const diff = Math.abs(s.strike - spotPrice);
    if (diff < minDiff) { minDiff = diff; atmStrike = s.strike; }
  }

  // Process ±10 strikes around ATM
  const step = atmStrike > 20000 ? 100 : 50;
  const relevant = strikes.filter(
    (s) => Math.abs(s.strike - atmStrike) <= 10 * step
  );

  let totalCEOI = 0;
  let totalPEOI = 0;
  let callVolume = 0;
  let putVolume = 0;

  for (const s of relevant) {
    totalCEOI += s.ce.oi;
    totalPEOI += s.pe.oi;
    callVolume += s.ce.volume;
    putVolume += s.pe.volume;
  }

  const totalVol = callVolume + putVolume;
  const delta = totalVol > 0 ? ((callVolume - putVolume) / totalVol * 100) : 0;
  const pcr = totalCEOI > 0 ? (totalPEOI / totalCEOI) : 0;

  return {
    symbol: data.symbol,
    callVolume,
    putVolume,
    callOI: totalCEOI,
    putOI: totalPEOI,
    pcr: pcr.toFixed(2),
    delta: parseFloat(delta.toFixed(1)),
    impliedVol: '0',
    spotPrice,
    timestamp: Date.now(),
    source: 'groww',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';

  const data = await fetchGrowwOptionChain(symbol);

  if (data) {
    return NextResponse.json(analyzeFlow(data));
  }

  return NextResponse.json({
    symbol,
    callVolume: 0,
    putVolume: 0,
    callOI: 0,
    putOI: 0,
    pcr: '0',
    delta: 0,
    impliedVol: '0',
    timestamp: Date.now(),
    source: 'unavailable',
    message: 'Options flow data unavailable.',
  });
}
