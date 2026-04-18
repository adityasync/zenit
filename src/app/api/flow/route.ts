import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';
  
  try {
    // Get option chain data from Yahoo for order flow analysis
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/options/${encodeURIComponent(symbol)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    
    if (!res.ok) throw new Error('Yahoo failed');
    
    const data = await res.json();
    const options = data?.optionChain?.result?.[0];
    
    if (!options) throw new Error('No options data');
    
    const calls = options.calls || [];
    const puts = options.puts || [];
    
    // Calculate order flow (Delta)
    let buyVol = 0, sellVol = 0;
    
    calls.forEach((opt: any) => {
      if (opt.volume > opt.openInterest) buyVol += opt.volume;
      else sellVol += opt.volume;
    });
    
    puts.forEach((opt: any) => {
      if (opt.volume > opt.openInterest) buyVol += opt.volume;
      else sellVol += opt.volume;
    });
    
    const total = buyVol + sellVol;
    const delta = total > 0 ? ((buyVol - sellVol) / total * 100).toFixed(1) : '0';
    
    // Calculate PCR from OI
    const callOI = calls.reduce((sum: number, c: any) => sum + (c.openInterest || 0), 0);
    const putOI = puts.reduce((sum: number, c: any) => sum + (c.openInterest || 0), 0);
    const pcr = callOI > 0 ? (putOI / callOI).toFixed(2) : '0';
    
    // Get implied vol (ATM)
    const atmCall = calls.find((c: any) => c.inTheMoney === false);
    const iv = atmCall?.impliedVolatility || 0;
    
    return NextResponse.json({
      symbol,
      callVolume: calls.reduce((sum: number, c: any) => sum + (c.volume || 0), 0),
      putVolume: puts.reduce((sum: number, c: any) => sum + (c.volume || 0), 0),
      callOI,
      putOI,
      pcr,
      delta: parseFloat(delta),
      impliedVol: (iv * 100).toFixed(1),
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Options fetch error:', e);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}