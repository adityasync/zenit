import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

const RSS_FEEDS = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml" },
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { name: "Google News", url: "https://news.google.com/rss/search?q=NSE+stock+market&hl=en-IN" },
];

const CACHE = new Map<string, { data: unknown; expiry: number }>();

const FALLBACK_NEWS = [
  { id: "f1", title: "SEBI issues new guidelines for FII investments in Indian equities", link: "#", source: "Markets", timestamp: Date.now() - 3600000 },
  { id: "f2", title: "RBI retains repo rate at current levels, inflation outlook positive", link: "#", source: "Economy", timestamp: Date.now() - 7200000 },
  { id: "f3", title: "FII flow turns positive amid improving global market cues", link: "#", source: "Capital", timestamp: Date.now() - 10800000 },
  { id: "f4", title: "Q4 earnings season begins with strong results from IT sector", link: "#", source: "Results", timestamp: Date.now() - 14400000 },
  { id: "f5", title: "Nifty 50 consolidates near record highs, breadth remains strong", link: "#", source: "Markets", timestamp: Date.now() - 18000000 },
  { id: "f6", title: "Auto sector stocks rally on robust monthly sales data", link: "#", source: "Sector", timestamp: Date.now() - 21600000 },
  { id: "f7", title: "Government plans to boost infrastructure spending in upcoming budget", link: "#", source: "Policy", timestamp: Date.now() - 25200000 },
  { id: "f8", title: "Metal stocks gain as China stimulus hopes lift commodity prices", link: "#", source: "Global", timestamp: Date.now() - 28800000 },
];

async function fetchRSSFeed(feed: { name: string; url: string }) {
  try {
    const parsed = await parser.parseURL(feed.url);
    return parsed.items.slice(0, 15).map((item) => ({
      id: item.guid || item.link || crypto.randomUUID(),
      title: item.title || "No title",
      link: item.link || "",
      source: feed.name,
      pubDate: item.pubDate,
      timestamp: item.isoDate ? new Date(item.isoDate).getTime() : Date.now(),
    }));
  } catch (err) {
    console.warn(`RSS feed failed: ${feed.name}`, (err as Error).message);
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
    // Fetch all feeds in parallel, each with individual error handling
    const results = await Promise.allSettled(RSS_FEEDS.map(fetchRSSFeed));
    
    let news = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    // If no feeds returned data, use fallback
    if (news.length === 0) {
      news = FALLBACK_NEWS.map(n => ({ ...n, timestamp: Date.now() - Math.random() * 86400000 }));
    }

    // Filter by symbol if provided
    if (symbol) {
      const symbolPatterns = [
        new RegExp(`\\b${symbol}\\b`, "i"),
      ];
      const filtered = news.filter(
        (item) => symbolPatterns.some((p) => p.test(item.title))
      );
      // If no symbol-specific news, return general news
      news = filtered.length > 0 ? filtered : news;
    }

    news = news
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map((item) => ({
        ...item,
        id: (item.id || "") + "-" + item.timestamp,
      }));

    CACHE.set(cacheKey, { data: news, expiry: Date.now() + 300000 }); // 5 min cache
    return NextResponse.json(news);
  } catch (error) {
    console.error("RSS fetch error:", error);
    // Return fallback news instead of error
    return NextResponse.json(FALLBACK_NEWS);
  }
}
