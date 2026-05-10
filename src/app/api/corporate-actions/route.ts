import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NSE_BASE_URL = "https://www.nseindia.com";

const SCAN_SYMBOLS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL",
  "LT", "ITC", "KOTAKBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN",
  "BAJFINANCE", "TATASTEEL", "WIPRO", "HCLTECH", "TECHM", "AXISBANK",
  "NTPC", "POWERGRID", "ONGC", "COALINDIA", "TATAMOTORS", "DRREDDY",
  "CIPLA", "BPCL", "JSWSTEEL", "HINDALCO", "VEDL", "NESTLEIND", "DIVISLAB",
];

interface CorporateAction {
  symbol: string;
  company: string;
  actionType: "dividend" | "split" | "bonus" | "rights" | "buyback";
  exDate: string;
  recordDate?: string;
  purpose: string;
  details: string;
}

function determineActionType(purpose: string): CorporateAction["actionType"] {
  const lower = purpose.toLowerCase();
  if (lower.includes("dividend") || lower.includes("div")) return "dividend";
  if (lower.includes("split") || lower.includes("sub-division")) return "split";
  if (lower.includes("bonus")) return "bonus";
  if (lower.includes("rights")) return "rights";
  if (lower.includes("buyback") || lower.includes("buy-back")) return "buyback";
  return "dividend";
}

function parseNseDate(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [day, mon, year] = parts;
  return `${year}-${months[mon] || "01"}-${day.padStart(2, "0")}`;
}

async function getNseCookies(): Promise<string | null> {
  try {
    const res = await fetch(NSE_BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.headers.getSetCookie?.()?.join("; ") || null;
  } catch {
    return null;
  }
}

const CACHE = new Map<string, { data: CorporateAction[]; expiry: number }>();

async function fetchCorporateActions(): Promise<CorporateAction[]> {
  const cacheKey = "corporate-actions:nse";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  try {
    const cookies = await getNseCookies();
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json",
      Referer: `${NSE_BASE_URL}/`,
      ...(cookies && { Cookie: cookies }),
    };

    const now = new Date();
    const fromDate = new Date(now.getFullYear() - 1, 0, 1); // Jan 1 of last year
    const toDate = new Date(now.getFullYear() + 1, 0, 1); // Jan 1 of next year
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    const from = fmt(fromDate);
    const to = fmt(toDate);

    // NSE requires per-symbol requests — batch with delays to avoid rate limiting
    const BATCH_SIZE = 6;
    const BATCH_DELAY = 300;
    const allData: Array<Record<string, unknown>> = [];

    for (let i = 0; i < SCAN_SYMBOLS.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY));
      const batch = SCAN_SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (symbol) => {
          const res = await fetch(
            `${NSE_BASE_URL}/api/corporates-corporateActions?index=equities&from_date=${from}&to_date=${to}&symbol=${symbol}`,
            { headers, signal: AbortSignal.timeout(8000) }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled") allData.push(...r.value);
      }
    }

    const actions: CorporateAction[] = [];

    for (const item of allData) {
      const subject = (item.subject as string) || "";
      const exDate = parseNseDate(item.exDate as string);
      actions.push({
        symbol: item.symbol as string,
        company: (item.comp as string) || (item.symbol as string),
        actionType: determineActionType(subject),
        exDate,
        recordDate: item.recDate && item.recDate !== "-" ? parseNseDate(item.recDate as string) : undefined,
        purpose: subject,
        details: subject,
      });
    }

    actions.sort((a, b) => b.exDate.localeCompare(a.exDate));
    CACHE.set(cacheKey, { data: actions, expiry: Date.now() + 3600_000 });
    return actions;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const actionType = searchParams.get("type");
  const days = parseInt(searchParams.get("days") || "30");

  try {
    let actions = await fetchCorporateActions();

    if (symbol) {
      actions = actions.filter(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    }
    if (actionType) {
      actions = actions.filter(a => a.actionType === actionType);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    actions = actions.filter(a => new Date(a.exDate) >= cutoffDate);

    return NextResponse.json({
      count: actions.length,
      days,
      actions,
      source: "nse",
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Corporate actions API error:", error);
    return NextResponse.json({
      count: 0,
      days,
      actions: [],
      source: "error",
      timestamp: Date.now(),
    });
  }
}
