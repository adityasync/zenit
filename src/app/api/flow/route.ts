import { NextResponse } from 'next/server';

export async function GET() {
  const trades = Array.from({ length: 20 }, (_, i) => ({
    time: new Date(Date.now() - i * 60000),
    side: Math.random() > 0.5 ? 'BUY' : 'SELL',
    quantity: Math.floor(Math.random() * 1000) + 100,
    price: 22500 + Math.random() * 100
  }));

  return NextResponse.json(trades);
}