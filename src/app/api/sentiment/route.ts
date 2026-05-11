import { NextResponse } from "next/server";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";
import { getCachedData, setCachedData } from "@/lib/redis";

const MRCHARTIST = "https://fii-diidata.mrchartist.com";

const NIFTY50_SYMBOLS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
  "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
  "BAJFINANCE","TATASTEEL","WIPRO","HCLTECH","TECHM"
];

async function fetchMrchartist(path: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${MRCHARTIST}${path}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const cacheKey = "sentiment:dashboard";

  // Try Redis first (shared across all instances)
  const cached = await getCachedData<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // Fetch advance/decline from Yahoo + sentiment from mrchartist in parallel
    const [chartMap, regimeData, flowData, fiiData] = await Promise.all([
      fetchChartBatch(NIFTY50_SYMBOLS, { batchSize: 10, batchDelayMs: 100, timeoutMs: 3000 }),
      fetchMrchartist("/api/agents/regime"),
      fetchMrchartist("/api/agents/flow-strength"),
      fetchMrchartist("/api/data"),
    ]);

    // Advance/decline from Yahoo
    let gains = 0, losses = 0;
    chartMap.forEach((chart) => {
      const q = normalizeChartQuote(chart);
      if (q.percentChange > 0.05) gains++;
      else if (q.percentChange < -0.05) losses++;
    });

    // Sentiment from mrchartist
    const sentimentScore = (fiiData?.sentiment_score as number) ?? 50;
    const pcr = (fiiData?.pcr as number) ?? 0;
    const regime = (regimeData?.regime as string) || "UNKNOWN";
    const recommendation = (regimeData?.recommendation as string) || "";
    const fiiCumulative = (regimeData?.fii_cumulative_10d as number) || 0;
    const diiCumulative = (regimeData?.dii_cumulative_10d as number) || 0;
    const events = (flowData?.last_alerted_events as string[]) || [];

    let label = "Neutral";
    if (sentimentScore >= 75) label = "Extreme Greed";
    else if (sentimentScore > 60) label = "Greed";
    else if (sentimentScore <= 25) label = "Extreme Fear";
    else if (sentimentScore < 40) label = "Fear";

    const responseData = {
      score: sentimentScore,
      label,
      topTickers: [],
      gains,
      losses,
      advanceRatio: (gains + losses > 0 ? (gains / (gains + losses) * 100).toFixed(1) : "50.0"),
      pcr,
      regime,
      recommendation,
      fiiCumulative10d: fiiCumulative,
      diiCumulative10d: diiCumulative,
      flowEvents: events,
      timestamp: Date.now(),
      source: "mrchartist",
    };

    // Cache in Redis for 60s so all instances return the same data
    await setCachedData(cacheKey, responseData, 60);
    return NextResponse.json(responseData);
  } catch (e) {
    console.error("Sentiment error:", e);
    return NextResponse.json({ score: 50, label: "Neutral", topTickers: [], gains: 0, losses: 0, timestamp: Date.now(), source: "error", error: true });
  }
}
