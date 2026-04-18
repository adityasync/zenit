import { NextResponse } from 'next/server';

const BASE_URL = 'https://nse-api-ruby.vercel.app';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'RELIANCE';
  
  try {
    const res = await fetch(`${BASE_URL}/quote/${symbol}.NS`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}