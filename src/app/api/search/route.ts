import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Use Yahoo Finance search API
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ results: [] });

    const data = await res.json();
    const quotes = (data.quotes || [])
      .filter((q: Record<string, unknown>) => q.exchange === "NSI" || q.exchange === "BSE" || (q.symbol as string)?.endsWith(".NS") || (q.symbol as string)?.endsWith(".BO"))
      .map((q: Record<string, unknown>) => ({
        symbol: (q.symbol as string)?.replace(/\.NS$|\.BO$/, ""),
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange,
        type: q.quoteType,
      }));

    return NextResponse.json({ results: quotes });
  } catch {
    return NextResponse.json({ results: [] });
  }
}