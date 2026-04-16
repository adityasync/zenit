import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

const RSS_FEEDS = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml" },
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { name: "Business Std", url: "https://www.business-standard.com/rss/markets/110" },
  { name: "Mint", url: "https://www.livemint.com/rss/markets" },
  { name: "CNBC", url: "https://www.cnbctv18.com/rssfeed.cfm" },
];

const CACHE = new Map<string, { data: unknown; expiry: number }>();

async function fetchRSSFeed(feed: { name: string; url: string }) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return parsed.items.slice(0, 20).map((item) => ({
      id: item.guid || item.link || crypto.randomUUID(),
      title: item.title || "No title",
      link: item.link || "",
      source: feed.name,
      pubDate: item.pubDate,
      timestamp: item.isoDate ? new Date(item.isoDate).getTime() : Date.now(),
    }));
  } catch {
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
    const allNews = await Promise.all(RSS_FEEDS.map(fetchRSSFeed));
    let news = allNews.flat();

    if (symbol) {
      const symbolPatterns = [
        new RegExp(`\\b${symbol}\\b`, "i"),
        new RegExp(`\\b${symbol.replace(/[A-Z]/g, (c) => ` ${c}`)}\\b`, "i"),
      ];
      news = news.filter(
        (item) =>
          symbolPatterns.some((p) => p.test(item.title))
      );
    }

    news = news
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map((item) => ({
        ...item,
        id: item.id + "-" + item.timestamp,
      }));

    CACHE.set(cacheKey, { data: news, expiry: Date.now() + 300000 });
    return NextResponse.json(news);
  } catch (error) {
    console.error("RSS fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
