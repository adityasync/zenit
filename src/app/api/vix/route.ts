import { NextResponse } from 'next/server';
import { fetchChart, extractCandles } from '@/lib/yahoo';

export async function GET() {
  try {
    const result = await fetchChart('^INDIAVIX', { interval: '1d', range: '1mo', cacheTtlMs: 30_000 });
    if (!result) throw new Error('No data');

    const meta = result.meta;
    const currentPrice = meta?.regularMarketPrice || 0;
    const previousClose = meta?.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const percentChange = previousClose > 0 ? (change / previousClose) * 100 : 0;

    let regime = 'NORMAL';
    if (currentPrice > 20) regime = 'HIGH';
    else if (currentPrice < 12) regime = 'LOW';

    const impliedMove = (currentPrice / 100) * Math.sqrt(30) * 1.5;

    const candles = extractCandles(result);
    const history = candles.map(c => c.close).slice(-21);

    return NextResponse.json({
      vix: currentPrice.toFixed(2),
      change: change.toFixed(2),
      percentChange: percentChange.toFixed(2),
      rank: 0,
      mean: history.length > 0 ? (history.reduce((a, b) => a + b, 0) / history.length).toFixed(2) : currentPrice.toFixed(2),
      regime,
      impliedMove: impliedMove.toFixed(2),
      history,
    });
  } catch (e) {
    console.error('VIX fetch error:', e);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}