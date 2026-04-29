import { NextResponse } from 'next/server';

const BASE_URL = 'http://65.0.104.9';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }
  
  try {
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json([]);
  }
}