import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STOCKINSIGHTS_API = "https://stockinsights-ai-main-95a26a0.zuplo.app/api/in/v0";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

interface EarningsEvent {
  symbol: string;
  company: string;
  resultDate: string;
  quarter: string;
  isConfirmed: boolean;
  daysUntil: number;
  estimates?: {
    revenue?: number;
    profit?: number;
    eps?: number;
  };
}

async function fetchStockInsightsCalendar(): Promise<EarningsEvent[]> {
  const cacheKey = "earnings:stockinsights";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as EarningsEvent[];
  }

  try {
    const res = await fetch(`${STOCKINSIGHTS_API}/results-calendar`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: EarningsEvent[] = (data || [])
      .map((item: Record<string, unknown>) => {
        const resultDate = new Date(item.date as string);
        resultDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((resultDate.getTime() - today.getTime()) / 86400000);

        return {
          symbol: (item.symbol as string) || "",
          company: (item.companyName as string) || (item.symbol as string) || "",
          resultDate: (item.date as string) || "",
          quarter: (item.quarter as string) || "",
          isConfirmed: true,
          daysUntil,
          estimates: {
            revenue: item.revenueEstimate as number | undefined,
            profit: item.profitEstimate as number | undefined,
            eps: item.epsEstimate as number | undefined,
          },
        };
      })
      .filter((e: EarningsEvent) => e.daysUntil >= 0);

    events.sort((a, b) => a.daysUntil - b.daysUntil);
    CACHE.set(cacheKey, { data: events, expiry: Date.now() + 300000 }); // 5 min cache
    return events;
  } catch {
    return [];
  }
}

async function fetchNSEBoardMeetings(): Promise<EarningsEvent[]> {
  const cacheKey = "earnings:nsemeetings";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as EarningsEvent[];
  }

  try {
    // Fetch NSE homepage for cookies
    const cookieRes = await fetch("https://www.nseindia.com", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
    });
    const cookies = cookieRes.headers.getSetCookie?.()?.join("; ") || "";

    const res = await fetch("https://www.nseindia.com/api/corporates-board-meetings", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: EarningsEvent[] = (data?.data || [])
      .filter((item: Record<string, unknown>) => {
        const purpose = (item.purpose as string)?.toLowerCase() || "";
        return purpose.includes("result") || purpose.includes("financial") || purpose.includes("quarterly");
      })
      .map((item: Record<string, unknown>) => {
        const dateStr = item.boardMeetingDate as string;
        const resultDate = new Date(dateStr);
        resultDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((resultDate.getTime() - today.getTime()) / 86400000);

        return {
          symbol: (item.symbol as string) || "",
          company: (item.companyName as string) || (item.symbol as string) || "",
          resultDate: dateStr,
          quarter: "",
          isConfirmed: true,
          daysUntil,
        };
      })
      .filter((e: EarningsEvent) => e.daysUntil >= 0);

    events.sort((a, b) => a.daysUntil - b.daysUntil);
    CACHE.set(cacheKey, { data: events, expiry: Date.now() + 300000 });
    return events;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const symbol = searchParams.get("symbol");

  try {
    // Fetch from both sources in parallel
    const [stockInsightsEvents, nseEvents] = await Promise.all([
      fetchStockInsightsCalendar(),
      fetchNSEBoardMeetings(),
    ]);

    // Merge and deduplicate by symbol + date
    const seen = new Set<string>();
    const merged: EarningsEvent[] = [];

    for (const event of [...stockInsightsEvents, ...nseEvents]) {
      const key = `${event.symbol}:${event.resultDate}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (symbol && event.symbol.toUpperCase() !== symbol.toUpperCase()) continue;
      if (event.daysUntil > days) continue;

      merged.push(event);
    }

    merged.sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({
      count: merged.length,
      days,
      calendar: merged,
      sources: {
        stockInsights: stockInsightsEvents.length > 0,
        nse: nseEvents.length > 0,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Earnings calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings calendar", calendar: [], count: 0 },
      { status: 500 }
    );
  }
}
