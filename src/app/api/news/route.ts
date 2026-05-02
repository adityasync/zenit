import { NextResponse } from "next/server";
import { getMarketNews, clearNewsCache } from "@/lib/news";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const force = searchParams.get("force") === "1";

  try {
    if (force) {
      console.log("Force refresh requested - clearing cache");
      clearNewsCache();
    }

    const news = await getMarketNews({
      symbol: symbol || undefined,
      limit: isNaN(limit) ? 25 : limit,
    });

    console.log(`News API: returning ${news.length} items, force=${force}`);

    return NextResponse.json(news, {
      headers: {
        'Cache-Control': force ? 'no-cache' : 's-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    console.error('News API error:', e);
    return NextResponse.json([]);
  }
}