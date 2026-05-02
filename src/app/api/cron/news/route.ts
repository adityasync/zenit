import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/news";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const news = await getMarketNews({ limit: 60 });
    return NextResponse.json({
      success: true,
      fetched: news.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Cron news fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
