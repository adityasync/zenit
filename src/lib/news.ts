import Parser from "rss-parser";
import { createHash } from "node:crypto";
import { getCachedData, setCachedData } from "@/lib/redis";

export type NewsCategory = "company" | "filing" | "markets" | "macro" | "global";

export interface MarketNewsItem {
  id: string;
  title: string;
  headline: string;
  link: string;
  url: string;
  source: string;
  timestamp: number;
  pubDate?: string;
  symbols: string[];
  type: NewsCategory;
  priority: number;
}

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "ZENIT/1.0 (+https://vercel.com)",
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: ["description"],
  },
});

const FEED_SOURCES = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/business.xml", weight: 18 },
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", weight: 20 },
  { name: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss", weight: 16 },
  { name: "Financial Express", url: "https://www.financialexpress.com/market/rss/", weight: 14 },
  { name: "Livemint", url: "https://www.livemint.com/rss/markets", weight: 16 },
] as const;

const INDIA_MARKET_KEYWORDS = [
  "india", "indian", "nse", "bse", "sensex", "nifty", "bank nifty", "rupee",
  "rbi", "sebi", "fii", "dii", "ipo", "qip", "bulk deal", "block deal",
  "results", "earnings", "dividend", "bonus", "split", "buyback", "board meeting",
];

const FILING_KEYWORDS = [
  "board meeting", "record date", "dividend", "stock split", "bonus", "buyback",
  "rights issue", "q1", "q2", "q3", "q4", "results", "earnings", "order win",
  "order book", "allotment", "merger", "acquisition", "approval", "sebi",
];

const MACRO_KEYWORDS = [
  "rbi", "inflation", "cpi", "wpi", "gdp", "rupee", "usd/inr", "bond yield",
  "crude", "oil", "fed", "tariff", "repo rate", "monsoon",
];

const GLOBAL_RISK_KEYWORDS = [
  "nasdaq", "dow", "s&p 500", "wall street", "european", "china", "middle east",
  "treasury", "bitcoin", "crypto",
];

const SYMBOL_ALIASES: Record<string, string[]> = {
  RELIANCE: ["reliance", "ril", "reliance industries"],
  TCS: ["tcs", "tata consultancy services"],
  INFY: ["infosys", "infy"],
  HDFCBANK: ["hdfc bank", "hdfcbank"],
  ICICIBANK: ["icici bank", "icicibank"],
  SBIN: ["sbi", "state bank of india", "sbin"],
  BHARTIARTL: ["bharti airtel", "airtel", "bhartiartl"],
  LT: ["larsen", "l&t", "larsen & toubro"],
  ITC: ["itc"],
  KOTAKBANK: ["kotak", "kotak mahindra bank"],
  HINDUNILVR: ["hindustan unilever", "hul"],
  MARUTI: ["maruti", "maruti suzuki"],
  SUNPHARMA: ["sun pharma", "sun pharmaceutical"],
  TITAN: ["titan"],
  BAJFINANCE: ["bajaj finance"],
  TATASTEEL: ["tata steel"],
  WIPRO: ["wipro"],
  HCLTECH: ["hcl tech", "hcltech"],
  TECHM: ["tech mahindra", "techm"],
  AXISBANK: ["axis bank", "axisbank"],
  NTPC: ["ntpc"],
  POWERGRID: ["power grid", "powergrid"],
  ONGC: ["ongc", "oil and natural gas"],
  COALINDIA: ["coal india"],
  TATAMOTORS: ["tata motors"],
  DRREDDY: ["dr reddy", "dr. reddy", "dr reddy's"],
  CIPLA: ["cipla"],
  BPCL: ["bpcl", "bharat petroleum"],
  LUPIN: ["lupin"],
  APOLLOHOSP: ["apollo hospitals", "apollo hosp"],
  JSWSTEEL: ["jsw steel"],
  HINDALCO: ["hindalco"],
  VEDL: ["vedanta", "vedl"],
  DLF: ["dlf"],
  NESTLEIND: ["nestle india", "nestleind"],
  INDUSIND: ["indusind bank", "indusind"],
  GODREJPRO: ["godrej properties", "godrejpro"],
  OBEROIRLTY: ["oberoi realty", "oberoirlty"],
  NIFTY: ["nifty", "nifty 50"],
  BANKNIFTY: ["bank nifty", "nifty bank", "banknifty"],
  SENSEX: ["sensex"],
};

const CACHE_TTL_SECONDS = 20;
const MEMORY_CACHE = new Map<string, { expiry: number; data: MarketNewsItem[] }>();

function decodeHtml(text: string): string {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(live|updates|today|india|indian|stocks|stock|shares|market)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashId(source: string, title: string, link: string): string {
  return createHash("sha1").update(`${source}|${title}|${link}`).digest("hex").slice(0, 16);
}

function detectSymbols(text: string): string[] {
  const lower = text.toLowerCase();
  const matched = new Set<string>();

  Object.entries(SYMBOL_ALIASES).forEach(([symbol, aliases]) => {
    if (aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
      matched.add(symbol);
    }
  });

  return Array.from(matched);
}

function classifyNews(text: string, symbols: string[]): NewsCategory {
  const lower = text.toLowerCase();

  if (FILING_KEYWORDS.some((keyword) => lower.includes(keyword))) return "filing";
  if (symbols.length > 0) return "company";
  if (MACRO_KEYWORDS.some((keyword) => lower.includes(keyword))) return "macro";
  if (INDIA_MARKET_KEYWORDS.some((keyword) => lower.includes(keyword))) return "markets";
  if (GLOBAL_RISK_KEYWORDS.some((keyword) => lower.includes(keyword))) return "global";
  return "markets";
}

function scoreNews(item: Omit<MarketNewsItem, "priority">, requestedSymbol?: string): number {
  const lower = `${item.title} ${item.headline}`.toLowerCase();
  const ageMinutes = Math.max(0, (Date.now() - item.timestamp) / 60000);
  const ageScore = Math.max(0, 28 - ageMinutes / 12);
  const sourceScore = FEED_SOURCES.find((source) => source.name === item.source)?.weight ?? 10;
  const indiaScore = INDIA_MARKET_KEYWORDS.some((keyword) => lower.includes(keyword)) ? 14 : 0;
  const filingScore = item.type === "filing" ? 22 : 0;
  const companyScore = item.type === "company" ? 16 : item.symbols.length > 0 ? 10 : 0;
  const globalPenalty = item.type === "global" && item.symbols.length === 0 ? -10 : 0;
  const requestedBoost =
    requestedSymbol && item.symbols.includes(requestedSymbol.toUpperCase()) ? 28 : 0;

  return Math.round(sourceScore + ageScore + indiaScore + filingScore + companyScore + requestedBoost + globalPenalty);
}

async function fetchFeed(source: (typeof FEED_SOURCES)[number]): Promise<MarketNewsItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || [])
      .slice(0, 20)
      .map((entry) => {
        const title = decodeHtml(entry.title || "");
        const headline = decodeHtml((entry as { contentSnippet?: string; description?: string }).contentSnippet || (entry as { description?: string }).description || title);
        const link = entry.link || "";
        const publishedAt = entry.isoDate || entry.pubDate || "";
        const timestamp = publishedAt ? new Date(publishedAt).getTime() : Date.now();
        const symbols = detectSymbols(`${title} ${headline}`);
        const type = classifyNews(`${title} ${headline}`, symbols);
        const base = {
          id: hashId(source.name, title, link),
          title,
          headline: title,
          link,
          url: link,
          source: source.name,
          timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
          pubDate: publishedAt,
          symbols,
          type,
        };
        return {
          ...base,
          priority: scoreNews(base),
        };
      })
      .filter((item) => item.title.length > 20 && item.timestamp > Date.now() - 1000 * 60 * 60 * 72);
  } catch {
    return [];
  }
}

async function getPooledNews(): Promise<MarketNewsItem[]> {
  const memoryHit = MEMORY_CACHE.get("latest");
  if (memoryHit && memoryHit.expiry > Date.now()) {
    return memoryHit.data;
  }

  const redisHit = await getCachedData<MarketNewsItem[]>("news:latest:pool");
  if (redisHit && redisHit.length > 0) {
    MEMORY_CACHE.set("latest", {
      data: redisHit,
      expiry: Date.now() + CACHE_TTL_SECONDS * 1000,
    });
    return redisHit;
  }

  const fetched = await Promise.all(FEED_SOURCES.map(fetchFeed));
  const deduped = new Map<string, MarketNewsItem>();

  fetched.flat().forEach((item) => {
    const key = normalizeTitle(item.title);
    const existing = deduped.get(key);

    if (!existing || item.priority > existing.priority || item.timestamp > existing.timestamp) {
      deduped.set(key, item);
    }
  });

  const ranked = Array.from(deduped.values())
    .sort((a, b) => (b.priority !== a.priority ? b.priority - a.priority : b.timestamp - a.timestamp))
    .slice(0, 60);

  MEMORY_CACHE.set("latest", {
    data: ranked,
    expiry: Date.now() + CACHE_TTL_SECONDS * 1000,
  });

  await setCachedData("news:latest:pool", ranked, CACHE_TTL_SECONDS);
  return ranked;
}

export async function getMarketNews(options: { symbol?: string; limit?: number } = {}): Promise<MarketNewsItem[]> {
  const { symbol, limit = 20 } = options;
  const normalizedSymbol = symbol?.toUpperCase().trim();
  const pooled = await getPooledNews();

  const rescored = pooled.map((item) => ({
    ...item,
    priority: scoreNews(item, normalizedSymbol),
  }));

  const filtered = normalizedSymbol
    ? rescored.filter((item) => item.symbols.includes(normalizedSymbol))
    : rescored;

  if (normalizedSymbol && filtered.length === 0) {
    return rescored
      .filter((item) => item.type === "filing" || item.type === "markets")
      .slice(0, Math.min(limit, 8));
  }

  return filtered
    .sort((a, b) => (b.priority !== a.priority ? b.priority - a.priority : b.timestamp - a.timestamp))
    .slice(0, limit);
}
