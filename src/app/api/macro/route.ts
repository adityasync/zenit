import { NextResponse } from "next/server";

const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";

export const dynamic = "force-dynamic";

// Fetch Indian macro indicators
async function fetchMacroIndicators() {
  try {
    // Fetch USD/INR for FX context
    const fxRes = await fetch(`${YAHOO_API}/INR%3DX?interval=1d&range=1d`, {
      signal: AbortSignal.timeout(5000),
    });
    const fxData = await fxRes.json();
    const usdInr = fxData.chart?.result?.[0]?.meta?.regularMarketPrice || 83.5;

    // Mock macro data (in production, fetch from RBI API or data providers)
    const currentMonth = new Date().toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
    const currentYear = new Date().getFullYear();

    return {
      iip: {
        value: 148.2,
        growth: 4.2,
        month: `${currentMonth} ${currentYear}`,
        previous: 3.8,
      },
      cpi: {
        value: 182.1,
        cpiInflation: 4.85,
        month: `${currentMonth} ${currentYear}`,
        previous: 5.1,
        foodInflation: 5.2,
        coreInflation: 4.3,
      },
      rbiRates: {
        repo: 6.5,
        reverseRepo: 3.35,
        crr: 4.5,
        slr: 18.0,
        msf: 6.75,
        bankRate: 6.75,
        updated: "2024-12-06", // Last RBI policy date
        nextPolicy: "2026-06-06", // Next policy date
      },
      fx: {
        usdInr: Number(usdInr.toFixed(2)),
        eurInr: Number((usdInr * 0.92).toFixed(2)),
        gbpInr: Number((usdInr * 0.79).toFixed(2)),
        yenInr: Number((usdInr * 0.0068).toFixed(2)),
        change: 0.12,
      },
    };
  } catch (error) {
    console.error("Macro indicators fetch error:", error);
    return getDefaultMacro();
  }
}

function getDefaultMacro() {
  return {
    iip: { value: 148.2, growth: 4.2, month: "Apr 2026", previous: 3.8 },
    cpi: { value: 182.1, cpiInflation: 4.85, month: "Apr 2026", previous: 5.1, foodInflation: 5.2, coreInflation: 4.3 },
    rbiRates: { repo: 6.5, reverseRepo: 3.35, crr: 4.5, slr: 18.0, msf: 6.75, bankRate: 6.75, updated: "2024-12-06", nextPolicy: "2026-06-06" },
    fx: { usdInr: 83.45, eurInr: 76.77, gbpInr: 65.92, yenInr: 0.57, change: 0.12 },
  };
}

// IPO Calendar with Grey Market Premium
async function fetchIPOCalendar() {
  // Mock IPO data (in production, fetch from NSE/BSE or Chittorgarh API)
  const today = new Date();
  const ipos = [
    {
      company: "Sky Enterprises Ltd",
      openDate: new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0],
      closeDate: new Date(today.getTime() + 10 * 86400000).toISOString().split("T")[0],
      priceBand: "₹180-190",
      lotSize: 78,
      gmp: 45,
      gmpPercent: 23.7,
      listingDate: new Date(today.getTime() + 18 * 86400000).toISOString().split("T")[0],
      status: "upcoming" as const,
      issueSize: "₹450 Cr",
      industry: "Infrastructure",
    },
    {
      company: "TechVision Innovation Ltd",
      openDate: new Date(today.getTime() - 2 * 86400000).toISOString().split("T")[0],
      closeDate: new Date(today.getTime() + 1 * 86400000).toISOString().split("T")[0],
      priceBand: "₹420-440",
      lotSize: 34,
      gmp: 85,
      gmpPercent: 19.3,
      listingDate: new Date(today.getTime() + 9 * 86400000).toISOString().split("T")[0],
      status: "open" as const,
      issueSize: "₹1,200 Cr",
      industry: "Technology",
    },
    {
      company: "GreenEnergy Power Ltd",
      openDate: new Date(today.getTime() - 10 * 86400000).toISOString().split("T")[0],
      closeDate: new Date(today.getTime() - 7 * 86400000).toISOString().split("T")[0],
      priceBand: "₹310-325",
      lotSize: 46,
      gmp: 0,
      gmpPercent: 0,
      listingDate: new Date(today.getTime() - 3 * 86400000).toISOString().split("T")[0],
      status: "listed" as const,
      listingPrice: 348,
      listingGain: 7.1,
      issueSize: "₹800 Cr",
      industry: "Renewable Energy",
    },
    {
      company: "MediCare Plus Ltd",
      openDate: new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0],
      closeDate: new Date(today.getTime() + 17 * 86400000).toISOString().split("T")[0],
      priceBand: "₹250-265",
      lotSize: 56,
      gmp: null,
      gmpPercent: null,
      listingDate: new Date(today.getTime() + 25 * 86400000).toISOString().split("T")[0],
      status: "upcoming" as const,
      issueSize: "₹600 Cr",
      industry: "Healthcare",
    },
  ];

  return ipos;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all"; // all, macro, ipo

  try {
    const [macroData, ipoCalendar] = await Promise.all([
      type !== "ipo" ? fetchMacroIndicators() : Promise.resolve(null),
      type !== "macro" ? fetchIPOCalendar() : Promise.resolve(null),
    ]);

    const response: any = { timestamp: Date.now() };

    if (macroData) response.macro = macroData;
    if (ipoCalendar) response.ipoCalendar = ipoCalendar;

    return NextResponse.json(response);
  } catch (error) {
    console.error("Macro API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch macro data" },
      { status: 500 }
    );
  }
}
