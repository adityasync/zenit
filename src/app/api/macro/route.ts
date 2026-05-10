import { NextResponse } from "next/server";
import { fetchChart } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

const WORLD_BANK_API = "https://api.worldbank.org/v2";
const CACHE = new Map<string, { data: unknown; expiry: number }>();

// ─── World Bank: CPI, GDP, Growth ─────────────────────────────────

interface WorldBankIndicator {
  value: number | null;
  year: string;
}

async function fetchWorldBankIndicator(
  indicator: string,
  years = 5
): Promise<WorldBankIndicator[]> {
  const cacheKey = `wb:${indicator}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as WorldBankIndicator[];
  }

  try {
    const currentYear = new Date().getFullYear();
    const fromYear = currentYear - years;
    const res = await fetch(
      `${WORLD_BANK_API}/country/IND/indicator/${indicator}?format=json&date=${fromYear}:${currentYear}&per_page=${years}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return [];

    const json = await res.json();
    const records = json?.[1] || [];

    const result: WorldBankIndicator[] = records
      .filter((r: Record<string, unknown>) => r.value !== null)
      .map((r: Record<string, unknown>) => ({
        value: r.value as number,
        year: r.date as string,
      }));

    CACHE.set(cacheKey, { data: result, expiry: Date.now() + 86400000 }); // 24h cache
    return result;
  } catch {
    return [];
  }
}

async function fetchMacroFromWorldBank() {
  const [cpiData, gdpGrowthData, gdpData] = await Promise.all([
    fetchWorldBankIndicator("FP.CPI.TOTL.ZG"), // CPI inflation %
    fetchWorldBankIndicator("NY.GDP.MKTP.KD.ZG"), // GDP growth %
    fetchWorldBankIndicator("NY.GDP.MKTP.CD"), // GDP current USD
  ]);

  return {
    cpi: cpiData.length > 0 ? {
      inflation: cpiData[0].value,
      year: cpiData[0].year,
      previous: cpiData.length > 1 ? cpiData[1].value : null,
      history: cpiData.slice(0, 5),
    } : null,
    gdp: gdpGrowthData.length > 0 ? {
      growth: gdpGrowthData[0].value,
      year: gdpGrowthData[0].year,
      previous: gdpGrowthData.length > 1 ? gdpGrowthData[1].value : null,
      history: gdpGrowthData.slice(0, 5),
    } : null,
    gdpValue: gdpData.length > 0 ? {
      value: gdpData[0].value,
      year: gdpData[0].year,
      valueTrillion: gdpData[0].value ? (gdpData[0].value / 1e12).toFixed(2) : null,
    } : null,
  };
}

// ─── Yahoo Finance: FX rates ──────────────────────────────────────

async function fetchFXRates() {
  const cacheKey = "fx:rates";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as Record<string, number>;
  }

  const pairs = [
    { symbol: "INR=X", name: "usdInr" },
    { symbol: "EURINR=X", name: "eurInr" },
    { symbol: "GBPINR=X", name: "gbpInr" },
    { symbol: "JPYINR=X", name: "jpyInr" },
  ];

  const rates: Record<string, number> = {};

  await Promise.allSettled(
    pairs.map(async (pair) => {
      const result = await fetchChart(pair.symbol, { interval: "1d", range: "5d", cacheTtlMs: 60_000 });
      if (result) {
        const price = result.meta.regularMarketPrice;
        if (price) rates[pair.name] = Number(price.toFixed(4));
      }
    })
  );

  if (Object.keys(rates).length > 0) {
    CACHE.set(cacheKey, { data: rates, expiry: Date.now() + 60000 });
  }

  return rates;
}

// ─── RBI Rates (scraped from public sources) ──────────────────────

async function fetchRBIRates() {
  const cacheKey = "rbi:rates";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Try to fetch from RBI website
  try {
    const res = await fetch("https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      // Try to extract repo rate from the page
      const repoMatch = html.match(/repo\s*rate[^0-9]*(\d+\.?\d*)/i);
      if (repoMatch) {
        const repo = parseFloat(repoMatch[1]);
        const result = {
          repo,
          reverseRepo: repo - 0.25,
          crr: 4.5,
          slr: 18.0,
          msf: repo + 0.25,
          bankRate: repo + 0.25,
          source: "rbi",
        };
        CACHE.set(cacheKey, { data: result, expiry: Date.now() + 86400000 });
        return result;
      }
    }
  } catch {
    // fall through to defaults
  }

  // Known RBI rates (as of April 2025 policy)
  const defaults = {
    repo: 6.0,
    reverseRepo: 3.35,
    crr: 4.5,
    slr: 18.0,
    msf: 6.25,
    bankRate: 6.25,
    lastPolicyDate: "2025-04-09",
    nextPolicyDate: "2025-06-06",
    source: "default" as const,
  };

  CACHE.set(cacheKey, { data: defaults, expiry: Date.now() + 86400000 });
  return defaults;
}

// ─── IIP (Index of Industrial Production) ─────────────────────────

async function fetchIIP() {
  const cacheKey = "iip:data";
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Try World Bank industrial production growth
  try {
    const indicators = await fetchWorldBankIndicator("NV.IND.TOTL.KD.ZG", 3);
    if (indicators.length > 0) {
      const result = {
        growth: indicators[0].value,
        year: indicators[0].year,
        previous: indicators.length > 1 ? indicators[1].value : null,
        source: "worldbank",
      };
      CACHE.set(cacheKey, { data: result, expiry: Date.now() + 86400000 });
      return result;
    }
  } catch {
    // fall through
  }

  return {
    growth: null,
    year: new Date().getFullYear().toString(),
    previous: null,
    source: "unavailable",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // all, macro, ipo, fx

  try {
    const [worldBankData, fxRates, rbiRates, iip] = await Promise.all([
      type !== "fx" && type !== "ipo" ? fetchMacroFromWorldBank() : Promise.resolve(null),
      type !== "macro" && type !== "ipo" ? fetchFXRates() : Promise.resolve({}),
      type !== "fx" && type !== "ipo" ? fetchRBIRates() : Promise.resolve(null),
      type !== "fx" && type !== "ipo" ? fetchIIP() : Promise.resolve(null),
    ]);

    const response: Record<string, unknown> = { timestamp: Date.now() };

    if (type !== "fx" && type !== "ipo") {
      response.macro = {
        cpi: worldBankData?.cpi || null,
        gdp: worldBankData?.gdp || null,
        gdpValue: worldBankData?.gdpValue || null,
        iip,
        rbiRates,
      };
    }

    if (type !== "macro" && type !== "ipo") {
      response.fx = {
        ...fxRates,
        source: Object.keys(fxRates).length > 0 ? "yahoo" : "unavailable",
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Macro API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch macro data" },
      { status: 500 }
    );
  }
}
