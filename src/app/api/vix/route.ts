import { NextResponse } from 'next/server';

export async function GET() {
  const vix = 15.2 + Math.random() * 3;
  const history = Array.from({ length: 21 }, (_, i) => 14 + Math.random() * 4 + i * 0.1);
  
  const ranks = history.sort((a, b) => a - b);
  const currentRank = ranks.findIndex(x => x >= vix);
  
  return NextResponse.json({
    vix: vix.toFixed(2),
    change: ((vix - 15) / 15 * 100).toFixed(1),
    rank: currentRank > 0 ? currentRank : Math.floor(Math.random() * 21),
    mean: (history.reduce((a, b) => a + b, 0) / history.length).toFixed(1),
    regime: vix < 12 ? 'LOW' : vix > 20 ? 'HIGH' : 'NORMAL',
    history: history.slice(-21).map(x => x.toFixed(1)),
    impliedMove: ((vix / 16) * 1.2).toFixed(2)
  });
}