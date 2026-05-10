import { NextResponse } from 'next/server';
import { fetchGrowwOptionChain, type GrowwResult } from '@/lib/yahoo';

function calculatePCR(data: GrowwResult) {
  let totalCEOI = 0;
  let totalPEOI = 0;
  let maxPain = 0;
  let maxPainOI = 0;

  // Find ATM strike (closest to spot price)
  let atmStrike = 0;
  let minDiff = Infinity;
  for (const s of data.strikes) {
    const diff = Math.abs(s.strike - data.spotPrice);
    if (diff < minDiff) {
      minDiff = diff;
      atmStrike = s.strike;
    }
  }

  // Process ±7 strikes around ATM
  const step = atmStrike > 20000 ? 100 : 50;
  const relevant = data.strikes.filter(
    (s) => Math.abs(s.strike - atmStrike) <= 7 * step
  );

  for (const s of relevant) {
    totalCEOI += s.ce.oi;
    totalPEOI += s.pe.oi;
    const totalOI = s.ce.oi + s.pe.oi;
    if (totalOI > maxPainOI) {
      maxPainOI = totalOI;
      maxPain = s.strike;
    }
  }

  // Map to the shape the OptionsChain component expects
  const chain = relevant.map((s) => ({
    strike: s.strike,
    isATM: s.strike === atmStrike,
    ce: {
      strikePrice: s.strike,
      openInterest: s.ce.oi,
      changeinOpenInterest: s.ce.oiChange,
      totalTradedVolume: s.ce.volume,
      impliedVolatility: 0,
      lastPrice: s.ce.ltp,
      change: 0,
      pChange: 0,
      bidprice: 0,
      askPrice: 0,
    },
    pe: {
      strikePrice: s.strike,
      openInterest: s.pe.oi,
      changeinOpenInterest: s.pe.oiChange,
      totalTradedVolume: s.pe.volume,
      impliedVolatility: 0,
      lastPrice: s.pe.ltp,
      change: 0,
      pChange: 0,
      bidprice: 0,
      askPrice: 0,
    },
  }));

  chain.sort((a, b) => a.strike - b.strike);

  return {
    symbol: data.symbol,
    underlyingValue: data.spotPrice,
    expiryDates: data.expiryDates.slice(0, 4),
    currentExpiry: data.currentExpiry,
    atmStrike,
    pcr: totalPEOI > 0 ? parseFloat((totalPEOI / totalCEOI).toFixed(2)) : 1.0,
    maxPain,
    maxPainOI,
    totalPEOI,
    totalCEOI,
    chain,
    timestamp: Date.now(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';

  const data = await fetchGrowwOptionChain(symbol);

  if (data) {
    return NextResponse.json(calculatePCR(data));
  }

  return NextResponse.json({
    symbol,
    underlyingValue: 0,
    pcr: 0,
    maxPain: 0,
    maxPainOI: 0,
    totalPEOI: 0,
    totalCEOI: 0,
    atmStrike: 0,
    chain: [],
    expiryDates: [],
    timestamp: Date.now(),
    source: 'unavailable',
    message: 'Options data unavailable.',
  });
}
