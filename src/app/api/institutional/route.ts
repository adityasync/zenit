import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MRCHARTIST = "https://fii-diidata.mrchartist.com";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

async function fetchJson(path: string, ttlMs: number): Promise<Record<string, unknown> | null> {
  const cached = CACHE.get(path);
  if (cached && cached.expiry > Date.now()) return cached.data as Record<string, unknown>;

  try {
    const res = await fetch(`${MRCHARTIST}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    CACHE.set(path, { data, expiry: Date.now() + ttlMs });
    return data;
  } catch {
    return null;
  }
}

interface SectorFlow {
  sector: string;
  name: string;
  netFlow: number;
  trend: "inflow" | "outflow";
  percentChange: number;
  fiiOwn: number;
  alpha: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const historyDays = parseInt(searchParams.get("history") || "30");
  const includeSectors = searchParams.get("sectors") !== "false";

  const [data, history, sectors] = await Promise.all([
    fetchJson("/api/data", 30_000),
    fetchJson("/api/history", 60_000),
    includeSectors ? fetchJson("/api/sectors", 300_000) : Promise.resolve(null),
  ]);

  if (!data) {
    return NextResponse.json({
      fii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
      dii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
      history: [],
      date: new Date().toLocaleDateString("en-IN"),
      timestamp: Date.now(),
      status: "unavailable",
      source: "unavailable",
    });
  }

  const fiiNet = (data.fii_net as number) || 0;
  const diiNet = (data.dii_net as number) || 0;

  // History from mrchartist (60 days of real data)
  const historyArr = Array.isArray(history) ? history : [];
  const mappedHistory = historyArr
    .slice(-historyDays)
    .map((h: Record<string, unknown>) => ({
      date: (h.date as string) || "",
      fiiNet: (h.fii_net as number) || 0,
      diiNet: (h.dii_net as number) || 0,
      fiiBuy: (h.fii_buy as number) || 0,
      fiiSell: (h.fii_sell as number) || 0,
      diiBuy: (h.dii_buy as number) || 0,
      diiSell: (h.dii_sell as number) || 0,
    }));

  // Parse date from mrchartist (format: "08-May-2026")
  const dateStr = (data.date as string) || "";

  const response: Record<string, unknown> = {
    fii: {
      net: fiiNet,
      buyValue: (data.fii_buy as number) || 0,
      sellValue: (data.fii_sell as number) || 0,
      index: (data.fii_idx_fut_net as number) || 0,
      cash: (data.fii_stk_fut_net as number) || 0,
      fn: (data.fii_idx_fut_net as number) || 0,
    },
    dii: {
      net: diiNet,
      buyValue: (data.dii_buy as number) || 0,
      sellValue: (data.dii_sell as number) || 0,
      index: (data.dii_idx_fut_net as number) || 0,
      cash: (data.dii_stk_fut_net as number) || 0,
      fn: (data.dii_idx_fut_net as number) || 0,
    },
    history: mappedHistory,
    date: dateStr,
    timestamp: Date.now(),
    status: "live",
    source: "mrchartist",
  };

  if (includeSectors && Array.isArray(sectors)) {
    const sectorFlows: SectorFlow[] = sectors.map((s: Record<string, unknown>) => {
      const fortnightCr = (s.fortnightCr as number) || 0;
      return {
        sector: (s.name as string) || "",
        name: (s.name as string) || "",
        netFlow: fortnightCr,
        trend: fortnightCr >= 0 ? "inflow" : "outflow",
        percentChange: 0,
        fiiOwn: (s.fiiOwn as number) || 0,
        alpha: (s.alpha as number) || 0,
      };
    });
    response.sectorFlows = sectorFlows;
  }

  return NextResponse.json(response);
}
