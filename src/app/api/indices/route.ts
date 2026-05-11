import { NextResponse } from 'next/server';
import { fetchIndexStocks } from '@/lib/nse-indices';

export async function GET() {
  try {
    const stocks = await fetchIndexStocks('nifty50');
    return NextResponse.json({ stocks });
  } catch {
    return NextResponse.json({ error: true }, { status: 503 });
  }
}
