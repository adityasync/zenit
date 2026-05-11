/**
 * Shared Yahoo Finance fetcher with in-memory caching, retry, and parallel batch support.
 *
 * Every route that hits Yahoo Finance should import from here instead of
 * constructing URLs and parsing responses manually.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface YahooChartMeta {
  regularMarketPrice: number;
  previousClose: number;
  chartPreviousClose: number;
  regularMarketVolume: number;
  shortName: string;
  longName: string;
  currency: string;
  exchangeName: string;
  instrumentType: string;
  regularMarketTime: number;
  [key: string]: unknown;
}

export interface YahooChartQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

export interface YahooChartResult {
  meta: YahooChartMeta;
  timestamp: number[];
  indicators: {
    quote: YahooChartQuote[];
  };
}

export interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: unknown;
  };
}

export interface YahooQuoteResult {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketDayRange: string;
  regularMarketVolume: number;
  averageDailyVolume10days: number;
  marketCap: number;
  trailingPE: number;
  priceToBook: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  [key: string]: unknown;
}

export interface YahooQuoteResponse {
  quoteResponse: {
    result: YahooQuoteResult[];
    error: unknown;
  };
}

export interface YahooOptionContract {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  [key: string]: unknown;
}

export interface YahooOptionsResult {
  underlyingSymbol: string;
  expirationDates: number[];
  strikes: number[];
  calls: YahooOptionContract[];
  puts: YahooOptionContract[];
  [key: string]: unknown;
}

export interface YahooOptionsResponse {
  optionChain: {
    result: YahooOptionsResult[] | null;
    error: unknown;
  };
}

/** Normalized quote returned by fetchQuote / fetchBatchQuotes. */
export interface NormalizedQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  volume: number;
  previousClose: number;
  shortName: string;
}

/** Parsed candle from a chart response. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const CACHE = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  CACHE.delete(key);
  return null;
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  CACHE.set(key, { data, expiry: Date.now() + ttlMs });
}

/** Evict expired entries. Call periodically if memory is a concern. */
export function evictExpired(): number {
  const now = Date.now();
  let evicted = 0;
  CACHE.forEach((entry, key) => {
    if (entry.expiry <= now) {
      CACHE.delete(key);
      evicted++;
    }
  });
  return evicted;
}

// ─── Internal fetch helper ──────────────────────────────────────────

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
}

async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 5000, retries = 1 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      // Don't retry on 4xx
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Yahoo returned ${res.status}`);
      }
      // Retry on 5xx
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      throw new Error(`Yahoo returned ${res.status}`);
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

// ─── Chart API (/v8/finance/chart) ─────────────────────────────────

export interface ChartFetchOptions {
  interval?: string;
  range?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  useCache?: boolean;
}

/**
 * Fetch OHLCV chart data for a symbol.
 *
 * @param symbol - Yahoo symbol (e.g. "RELIANCE.NS", "^NSEBANK").
 *                 If no dot or caret prefix, ".NS" is appended automatically.
 */
export async function fetchChart(
  symbol: string,
  opts: ChartFetchOptions = {}
): Promise<YahooChartResult | null> {
  const {
    interval = "1d",
    range = "1d",
    timeoutMs = 5000,
    cacheTtlMs = 30_000,
    useCache = true,
  } = opts;

  const yahooSymbol = normalizeSymbol(symbol);
  const cacheKey = `chart:${yahooSymbol}:${interval}:${range}`;

  if (useCache) {
    const cached = getCached<YahooChartResult>(cacheKey);
    if (cached) return cached;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    const res = await fetchWithRetry(url, { timeoutMs });
    const data: YahooChartResponse = await res.json();
    const result = data.chart?.result?.[0] ?? null;

    if (result && useCache) {
      setCache(cacheKey, result, cacheTtlMs);
    }

    return result;
  } catch {
    return null;
  }
}

/** Extract a normalized quote from a chart result. */
export function normalizeChartQuote(result: YahooChartResult): NormalizedQuote {
  const meta = result.meta;
  const price = meta.regularMarketPrice || meta.previousClose;
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const change = price - prevClose;
  const percentChange = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // meta.symbol contains the Yahoo symbol (e.g. "RELIANCE.NS"); strip suffix for the ticker
  const rawSymbol = (meta as Record<string, unknown>).symbol as string | undefined;
  const symbol = rawSymbol ? rawSymbol.replace(/\.NS$|\.BO$/, "") : "";

  return {
    symbol: symbol || meta.shortName || "",
    price,
    change,
    percentChange,
    volume: meta.regularMarketVolume || 0,
    previousClose: prevClose,
    shortName: meta.shortName || "",
  };
}

/** Extract candles from a chart result. */
export function extractCandles(result: YahooChartResult): Candle[] {
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  const { open = [], high = [], low = [], close = [], volume = [] } = quotes;

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (open[i] != null && close[i] != null) {
      candles.push({
        time: timestamps[i] * 1000,
        open: open[i]!,
        high: high[i] ?? open[i]!,
        low: low[i] ?? close[i]!,
        close: close[i]!,
        volume: volume[i] ?? 0,
      });
    }
  }
  return candles;
}

// ─── Quote API (/v7/finance/quote) ─────────────────────────────────

export interface QuoteFetchOptions {
  fields?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  useCache?: boolean;
}

const DEFAULT_FIELDS = [
  "shortName",
  "longName",
  "regularMarketPrice",
  "regularMarketChange",
  "regularMarketChangePercent",
  "regularMarketOpen",
  "regularMarketDayHigh",
  "regularMarketDayLow",
  "regularMarketDayRange",
  "regularMarketVolume",
  "averageDailyVolume10days",
  "marketCap",
  "trailingPE",
  "priceToBook",
  "regularMarketChange",
  "regularMarketChangePercent",
  "fiftyTwoWeekHigh",
  "fiftyTwoWeekLow",
].join(",");

/**
 * Fetch a detailed quote via the v7 endpoint.
 * Returns richer data than the chart endpoint (PE, PB, market cap, 52w range).
 */
export async function fetchQuote(
  symbol: string,
  opts: QuoteFetchOptions = {}
): Promise<YahooQuoteResult | null> {
  const {
    fields = DEFAULT_FIELDS,
    timeoutMs = 5000,
    cacheTtlMs = 30_000,
    useCache = true,
  } = opts;

  const yahooSymbol = normalizeSymbol(symbol);
  const cacheKey = `quote:${yahooSymbol}`;

  if (useCache) {
    const cached = getCached<YahooQuoteResult>(cacheKey);
    if (cached) return cached;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}&fields=${fields}`;
    const res = await fetchWithRetry(url, { timeoutMs });
    const data: YahooQuoteResponse = await res.json();
    const result = data.quoteResponse?.result?.[0] ?? null;

    if (result && useCache) {
      setCache(cacheKey, result, cacheTtlMs);
    }

    return result;
  } catch {
    return null;
  }
}

// ─── Options API (/v8/finance/options) ─────────────────────────────

export interface OptionsFetchOptions {
  expiry?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  useCache?: boolean;
}

/**
 * Fetch the options chain for a symbol.
 */
export async function fetchOptions(
  symbol: string,
  opts: OptionsFetchOptions = {}
): Promise<YahooOptionsResult | null> {
  const {
    expiry,
    timeoutMs = 5000,
    cacheTtlMs = 30_000,
    useCache = true,
  } = opts;

  const yahooSymbol = normalizeSymbol(symbol);
  const cacheKey = `options:${yahooSymbol}:${expiry || "default"}`;

  if (useCache) {
    const cached = getCached<YahooOptionsResult>(cacheKey);
    if (cached) return cached;
  }

  try {
    let url = `https://query1.finance.yahoo.com/v8/finance/options/${encodeURIComponent(yahooSymbol)}`;
    if (expiry) url += `?date=${expiry}`;

    const res = await fetchWithRetry(url, { timeoutMs });
    const data: YahooOptionsResponse = await res.json();
    const result = data.optionChain?.result?.[0] ?? null;

    if (result && useCache) {
      setCache(cacheKey, result, cacheTtlMs);
    }

    return result;
  } catch {
    return null;
  }
}

// ─── Batch fetcher ──────────────────────────────────────────────────

export interface BatchFetchOptions {
  interval?: string;
  range?: string;
  timeoutMs?: number;
  batchSize?: number;
  batchDelayMs?: number;
  cacheTtlMs?: number;
}

/**
 * Fetch chart data for many symbols in parallel batches.
 * Returns a Map keyed by original symbol string.
 */
export async function fetchChartBatch(
  symbols: string[],
  opts: BatchFetchOptions = {}
): Promise<Map<string, YahooChartResult>> {
  const {
    interval = "1d",
    range = "1d",
    timeoutMs = 3000,
    batchSize = 10,
    batchDelayMs = 100,
    cacheTtlMs = 30_000,
  } = opts;

  const result = new Map<string, YahooChartResult>();

  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    batches.push(symbols.slice(i, i + batchSize));
  }

  for (let b = 0; b < batches.length; b++) {
    if (b > 0) await new Promise((r) => setTimeout(r, batchDelayMs));

    const results = await Promise.allSettled(
      batches[b].map(async (symbol) => {
        const data = await fetchChart(symbol, {
          interval,
          range,
          timeoutMs,
          cacheTtlMs,
        });
        return { symbol, data };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.data) {
        result.set(r.value.symbol, r.value.data);
      }
    }
  }

  return result;
}

/**
 * Convenience: fetch many symbols and return normalized quotes.
 */
export async function fetchQuoteBatch(
  symbols: string[],
  opts: BatchFetchOptions = {}
): Promise<Map<string, NormalizedQuote>> {
  const chartResults = await fetchChartBatch(symbols, opts);
  const quotes = new Map<string, NormalizedQuote>();

  chartResults.forEach((chart, symbol) => {
    quotes.set(symbol, {
      ...normalizeChartQuote(chart),
      symbol,
    });
  });

  return quotes;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Normalize a user-supplied symbol to a Yahoo Finance symbol.
 * - "^NSEI" / "^BANKNIFTY" → kept as-is (indices)
 * - "INR=X" / "EURINR=X" → kept as-is (currency pairs)
 * - "RELIANCE" → "RELIANCE.NS"
 * - "RELIANCE.NS" → kept as-is
 * - "RELIANCE.BO" → kept as-is
 */
function normalizeSymbol(symbol: string): string {
  if (symbol.startsWith("^") || symbol.includes(".") || symbol.includes("=")) return symbol;
  return `${symbol}.NS`;
}

// ─── Groww Option Chain ───────────────────────────────────────────

export interface GrowwStrike {
  strike: number;
  ce: { ltp: number; oi: number; oiChange: number; volume: number; buyQty: number; sellQty: number };
  pe: { ltp: number; oi: number; oiChange: number; volume: number; buyQty: number; sellQty: number };
}

export interface GrowwResult {
  symbol: string;
  spotPrice: number;
  expiryDates: string[];
  currentExpiry: string;
  lotSize: number;
  strikes: GrowwStrike[];
}

const GROWW_PATHS: Record<string, string> = {
  NIFTY: "nifty",
  BANKNIFTY: "nifty-bank",
};

export async function fetchGrowwOptionChain(symbol: string): Promise<GrowwResult | null> {
  const key = symbol === "BANKNIFTY" ? "BANKNIFTY" : "NIFTY";
  const path = GROWW_PATHS[key];
  const cacheKey = `groww:${key}`;
  const cached = getCached<GrowwResult>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://groww.in/v1/api/option_chain_service/v1/option_chain/${path}`;
    const res = await fetchWithRetry(url, { timeoutMs: 8000, retries: 1 });
    const json = await res.json();
    const oc = json?.optionChain;
    const chains: Array<Record<string, unknown>> = oc?.optionChains || [];
    const expiryDto = oc?.expiryDetailsDto as Record<string, unknown> | undefined;
    const expiryDates = (expiryDto?.expiryDates as string[]) || [];
    const currentExpiry = (expiryDto?.currentExpiry as string) || "";
    const lotSize = (expiryDto?.expiryLotSize as number) || 50;

    if (chains.length === 0) return null;

    const strikes: GrowwStrike[] = chains.map((c) => {
      const ce = c.callOption as Record<string, number> | undefined;
      const pe = c.putOption as Record<string, number> | undefined;
      return {
        strike: (c.strikePrice as number) / 100,
        ce: {
          ltp: ce?.ltp || 0,
          oi: ce?.openInterest || 0,
          oiChange: (ce?.openInterest || 0) - (ce?.prevOpenInterest || 0),
          volume: ce?.volume || 0,
          buyQty: ce?.totalBuyQty || 0,
          sellQty: ce?.totalSellQty || 0,
        },
        pe: {
          ltp: pe?.ltp || 0,
          oi: pe?.openInterest || 0,
          oiChange: (pe?.openInterest || 0) - (pe?.prevOpenInterest || 0),
          volume: pe?.volume || 0,
          buyQty: pe?.totalBuyQty || 0,
          sellQty: pe?.totalSellQty || 0,
        },
      };
    });

    // Derive spot price from ATM strike (middle of chain)
    const midIdx = Math.floor(strikes.length / 2);
    const spotPrice = strikes[midIdx]?.strike || 0;

    const result: GrowwResult = { symbol: key, spotPrice, expiryDates, currentExpiry, lotSize, strikes };
    setCache(cacheKey, result, 30_000);
    return result;
  } catch {
    return null;
  }
}
