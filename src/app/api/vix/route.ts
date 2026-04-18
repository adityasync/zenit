import { NextResponse } from 'next/server';

// Use Yahoo Finance for India VIX (FREE - no API key needed)
export async function GET() {
  try {
    // Yahoo Finance India VIX
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=1d',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );
    
    if (!res.ok) throw new Error('Yahoo failed');
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) throw new Error('No data');
    
    const meta = result.meta;
    const currentPrice = meta?.regularMarketPrice || 0;
    const previousClose = meta?.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const percentChange = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    // Calculate regime
    let regime = 'NORMAL';
    if (currentPrice > 20) regime = 'HIGH';
    else if (currentPrice < 12) regime = 'LOW';
    
    // Calculate implied move (annualized vol / sqrt(252))
    const impliedMove = (currentPrice / 100) * Math.sqrt(30) * 1.5;
    
    // Get recent history for chart
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0]?.close || [];
    
    const history: number[] = [];
    timestamps.slice(-21).forEach((t: number, i: number) => {
      const idx = timestamps.indexOf(t);
      if (quotes[idx] !== null && quotes[idx] !== undefined) {
        history.push(quotes[idx]);
      }
    });
    
    return NextResponse.json({
      vix: currentPrice.toFixed(2),
      change: change.toFixed(2),
      percentChange: percentChange.toFixed(2),
      rank: 0,
      mean: history.length > 0 ? (history.reduce((a, b) => a + b, 0) / history.length).toFixed(2) : '14.5',
      regime,
      impliedMove: impliedMove.toFixed(2),
      history: history.slice(-21)
    });
  } catch (e) {
    console.error('VIX fetch error:', e);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}