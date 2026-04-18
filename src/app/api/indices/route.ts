import { NextResponse } from 'next/server';

const BASE_URL = 'https://nse-api-ruby.vercel.app';

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/nse/nifty50`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    throw new Error('API failed');
  } catch (e) {
    return NextResponse.json({ error: true }, { status: 503 });
  }
}