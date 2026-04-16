import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL not set. Using mock mode for development.");
}

export const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    })
  : null;

export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCachedData<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to cache ${key}:`, error);
  }
}

export async function publishEvent(
  channel: string,
  data: unknown
): Promise<void> {
  if (!redis) return;
  try {
    await redis.publish(channel, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to publish to ${channel}:`, error);
  }
}

export const REDIS_KEYS = {
  ticker: (symbol: string) => `ticker:${symbol}`,
  index: (name: string) => `index:${name}`,
  gainers: "gainers:top10",
  losers: "losers:top10",
  sector: (name: string) => `sector:${name}`,
  breadth: "breadth:market",
  news: (symbol?: string) => (symbol ? `news:${symbol}` : "news:latest"),
  sentiment: "sentiment:retail",
  options: (symbol: string, expiry: string) => `options:${symbol}:${expiry}`,
  breakout: "breakout:scanner",
} as const;

export const TTL = {
  TICKER: 5,
  INDEX: 5,
  GAINERS_LOSERS: 30,
  SECTOR: 15,
  BREADTH: 15,
  NEWS: 600,
  AI_INSIGHT: 900,
  SENTIMENT: 600,
  OPTIONS: 30,
  BREAKOUT: 300,
} as const;
