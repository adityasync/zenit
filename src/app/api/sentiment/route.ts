import { NextResponse } from "next/server";

const REDIS_URL = process.env.REDIS_URL;
const REDDIT_URL = "https://www.reddit.com/r/IndianStreetBets/hot.json?limit=50";
const CACHE_KEY = "sentiment:reddit";
const CACHE_TTL = 600;

const BULLISH_KEYWORDS = [
  "bullish", "long", "buy", "moon", "rocket", "to the moon", "diamond hands",
  "hold", "hodl", "call", "CE", "breakout", "rally", "surge", "gain", "profit",
  "upgrade", "accumulate", "overweight", "outperform", "strong buy", "💎", "🚀", "📈"
];

const BEARISH_KEYWORDS = [
  "bearish", "short", "sell", "put", "PE", "crash", "dump", "breakdown",
  "loss", "downgrade", "underperform", "weak", "fear", "panic", "sell off",
  "bleeding", "bagholder", "📉", "🩸"
];

const TICKER_REGEX = /\b([A-Z]{2,5})\b/g;

async function getCachedReddit(): Promise<unknown | null> {
  if (!REDIS_URL) return null;
  try {
    const { redis } = await import("@/lib/redis");
    if (!redis) return null;
    const data = await redis.get(CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setCachedReddit(data: unknown): Promise<void> {
  if (!REDIS_URL) return;
  try {
    const { redis } = await import("@/lib/redis");
    if (!redis) return;
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export async function GET() {
  const cached = await getCachedReddit();
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const response = await fetch(REDDIT_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZenitBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error("Reddit API error");
    }

    const data = await response.json();
    const posts = data.data?.children || [];

    const tickerMentions: Map<string, { bullish: number; bearish: number; total: number }> = new Map();
    let totalBullish = 0;
    let totalBearish = 0;

    const bannedWords = new Set([
      "NSE", "BSE", "ETF", "IPO", "F&O", "API", "CPU", "CEO", "CFO", "CTO",
      "USA", "UK", "EU", "GDP", "RBI", "SEBI", "FDA", "WHO", "IMF", "OIL",
      "GOLD", "USD", "INR", "EUR", "GBP", "JPY", "CNY", "ITR", "GST", "HNI",
      "PMS", "SIP", "AMC", "NAV", "EPS", "PE", "ROE", "ROI", "NPA", "LTV",
    ]);

    for (const post of posts) {
      const title = (post.data?.title || "").toLowerCase();
      const body = (post.data?.selftext || "").toLowerCase();
      const content = title + " " + body;
      const upvotes = post.data?.ups || 1;

      let isBullish = false;
      let isBearish = false;

      for (const keyword of BULLISH_KEYWORDS) {
        if (content.includes(keyword)) {
          isBullish = true;
          break;
        }
      }

      for (const keyword of BEARISH_KEYWORDS) {
        if (content.includes(keyword)) {
          isBearish = true;
          break;
        }
      }

      const matches = title.match(TICKER_REGEX) || [];
      for (const match of matches) {
        if (bannedWords.has(match)) continue;

        const existing = tickerMentions.get(match) || { bullish: 0, bearish: 0, total: 0 };
        existing.total += upvotes;
        if (isBullish) existing.bullish += upvotes;
        if (isBearish) existing.bearish += upvotes;
        tickerMentions.set(match, existing);
      }

      if (isBullish) totalBullish += upvotes;
      if (isBearish) totalBearish += upvotes;
    }

    const topTickers = Array.from(tickerMentions.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([symbol, data]) => ({
        symbol,
        mentions: data.total,
        bullishRatio: data.total > 0 ? data.bullish / data.total : 0.5,
      }));

    const totalSentiment = totalBullish + totalBearish;
    const sentimentScore = totalSentiment > 0
      ? Math.round((totalBullish / totalSentiment) * 100)
      : 50;

    let label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
    if (sentimentScore < 20) label = "Extreme Fear";
    else if (sentimentScore < 40) label = "Fear";
    else if (sentimentScore < 60) label = "Neutral";
    else if (sentimentScore < 80) label = "Greed";
    else label = "Extreme Greed";

    const result = {
      score: sentimentScore,
      label,
      totalPosts: posts.length,
      bullishPosts: totalBullish,
      bearishPosts: totalBearish,
      topTickers,
      timestamp: Date.now(),
    };

    await setCachedReddit(result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reddit sentiment error:", error);
    return NextResponse.json({
      score: 50,
      label: "Neutral" as const,
      topTickers: [],
      timestamp: Date.now(),
      error: "Failed to fetch sentiment",
    });
  }
}
