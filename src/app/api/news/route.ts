import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({ timeout: 8000 });

// Working FREE RSS feeds
const RSS_FEEDS = [
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { name: "Business Std", url: "https://www.business-standard.com/rss/1050.xml" },
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml" },
  { name: "Investing", url: "https://in.investing.com/rss/news.rss" },
];

const CACHE = new Map<string, { data: unknown; expiry: number }>();

async function fetchRSSFeed(feed: { name: string; url: string }) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return parsed.items.slice(0, 10).map((item) => ({
      id: item.guid || item.link || crypto.randomUUID(),
      title: item.title || "No title",
      link: item.link || "",
      source: feed.name,
      pubDate: item.pubDate,
      timestamp: item.isoDate ? new Date(item.isoDate).getTime() : Date.now(),
    }));
  } catch (err) {
    console.warn(`RSS failed: ${feed.name}`);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const forceRefresh = searchParams.get("refresh") === "true";

  const cacheKey = `news:${symbol || "all"}`;
  const cached = CACHE.get(cacheKey);

  if (!forceRefresh && cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSSFeed));
    
    let news = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    if (symbol) {
      const filtered = news.filter((item) => new RegExp(`\\b${symbol}\\b`, "i").test(item.title));
      news = filtered.length > 0 ? filtered : news;
    }

    news = news
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30)
      .map((item) => ({
        ...item,
        id: (item.id || "") + "-" + item.timestamp,
      }));

    CACHE.set(cacheKey, { data: news, expiry: Date.now() + 300000 });
    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json([]);
  }
}