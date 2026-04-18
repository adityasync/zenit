import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';
  
  const basePrice = symbol === 'NIFTY' ? 22500 : symbol === 'BANKNIFTY' ? 48000 : 22000;
  const strikes = Array.from({ length: 15 }, (_, i) => basePrice + (i - 7) * 50);
  
  const buys = strikes.map(price => ({
    price: price + Math.random() * 10,
    quantity: Math.floor(Math.random() * 50000) + 5000
  })).sort((a, b) => b.price - a.price);
  
  const sells = strikes.map(price => ({
    price: price + Math.random() * 10,
    quantity: Math.floor(Math.random() * 50000) + 5000
  })).sort((a, b) => a.price - b.price);

  return NextResponse.json({
    symbol,
    buys: buys.slice(0, 10),
    sells: sells.slice(0, 10),
    totalVolume: Math.floor(Math.random() * 10000000),
    trades: Math.floor(Math.random() * 50000)
  });
}