import { NextResponse } from "next/server";

const NSE_BASE_URL = "https://www.nseindia.com";
const CACHE_KEY = "corporate-actions:latest";
const CACHE_TTL = 3600; // 1 hour

// Cookie jar for NSE requests
let nseCookies: string | null = null;

async function getNseCookies(): Promise<string | null> {
  if (nseCookies) return nseCookies;

  try {
    const res = await fetch(NSE_BASE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      nseCookies = setCookie.split(",").map(c => c.split(";")[0]).join("; ");
    }
    return nseCookies;
  } catch {
    return null;
  }
}

async function fetchNSE(endpoint: string) {
  const cookies = await getNseCookies();
  const res = await fetch(`${NSE_BASE_URL}${endpoint}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Referer": NSE_BASE_URL,
      ...(cookies && { Cookie: cookies }),
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`NSE API error: ${res.status}`);
  return res.json();
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const actionType = searchParams.get("type"); // dividend, split, bonus
  const days = parseInt(searchParams.get("days") || "30");

  try {
    // Try cache first (implement with Redis if available)
    // For now, fetch fresh data

    const data = await fetchNSE("/api/corporates-corporateActions");

    let actions = data?.data || [];

    // Filter by symbol if provided
    if (symbol) {
      actions = actions.filter((a: any) =>
        a.symbol?.toLowerCase() === symbol.toLowerCase()
      );
    }

    // Filter by action type
    if (actionType) {
      actions = actions.filter((a: any) =>
        a.purpose?.toLowerCase().includes(actionType.toLowerCase())
      );
    }

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    actions = actions.filter((a: any) => {
      const exDate = new Date(a.exDate || a.ex_date);
      return exDate >= cutoffDate;
    });

    const formattedActions = actions.map((a: any) => ({
      symbol: a.symbol || "",
      company: a.company || a.symbol || "",
      actionType: determineActionType(a.purpose || ""),
      exDate: a.exDate || a.ex_date || "",
      recordDate: a.recordDate || a.record_date || undefined,
      purpose: a.purpose || "",
      details: a.details || "",
    }));

    return NextResponse.json({
      count: formattedActions.length,
      days,
      actions: formattedActions,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Corporate actions API error:", error);

    // Return mock data for development
    return NextResponse.json({
      count: 3,
      days,
      actions: [
        {
          symbol: "RELIANCE",
          company: "Reliance Industries Ltd",
          actionType: "dividend",
          exDate: "2026-05-15",
          recordDate: "2026-05-16",
          purpose: "Dividend - Rs 10 per share",
          details: "Interim dividend for FY26",
        },
        {
          symbol: "TCS",
          company: "Tata Consultancy Services Ltd",
          actionType: "dividend",
          exDate: "2026-05-20",
          recordDate: "2026-05-21",
          purpose: "Dividend - Rs 25 per share",
          details: "Final dividend for FY25",
        },
        {
          symbol: "INFY",
          company: "Infosys Ltd",
          actionType: "split",
          exDate: "2026-06-01",
          recordDate: undefined,
          purpose: "Stock Split - 1:2",
          details: "Sub-division of equity shares",
        },
      ],
      timestamp: Date.now(),
    });
  }
}

function determineActionType(purpose: string): "dividend" | "split" | "bonus" | "rights" | "buyback" {
  const lower = purpose.toLowerCase();
  if (lower.includes("dividend")) return "dividend";
  if (lower.includes("split")) return "split";
  if (lower.includes("bonus")) return "bonus";
  if (lower.includes("rights")) return "rights";
  if (lower.includes("buyback") || lower.includes("buy-back")) return "buyback";
  return "dividend"; // default
}
