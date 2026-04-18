import { NextResponse } from 'next/server';

const BASE_URL = 'https://nse-api-ruby.vercel.app';

export async function GET() {
  try {
    // Fetch Nifty 50 data
    const res = await fetch(`${BASE_URL}/nse/nifty50`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    // Fallback with mock data structure
    return NextResponse.json([
      { symbol: 'RELIANCE', price: 2920.5, change: 45.2, percentChange: 1.57 },
      { symbol: 'TCS', price: 4120.0, change: -12.5, percentChange: -0.30 },
      { symbol: 'HDFCBANK', price: 1680.25, change: 22.75, percentChange: 1.37 },
      { symbol: 'INFY', price: 1450.0, change: 8.5, percentChange: 0.59 },
      { symbol: 'SBIN', price: 725.0, change: -8.25, percentChange: -1.13 }
    ]);
  }
}