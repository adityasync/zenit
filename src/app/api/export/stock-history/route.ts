import { NextResponse } from "next/server";

const YAHOO_FINANCE_API = "https://query1.finance.yahoo.com/v8/finance/chart";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.toUpperCase().replace(".NS", "");
    const range = searchParams.get("range") || "1mo";
    const interval = searchParams.get("interval") || "1d";

    if (!symbol) {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const res = await fetch(
      `${YAHOO_FINANCE_API}/${symbol}.NS?range=${range}&interval=${interval}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) throw new Error("Yahoo API error");

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error("No data found");

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const { open = [], high = [], low = [], close = [], volume = [] } = quotes;

    // Generate CSV
    let csv = "Date,Open,High,Low,Close,Volume\n";

    for (let i = 0; i < timestamps.length; i++) {
      if (open[i] != null && close[i] != null) {
        const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        csv += `${date},${open[i]},${high[i]},${low[i]},${close[i]},${volume[i] || 0}\n`;
      }
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="zennit-${symbol}-${range}-${interval}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export stock history error:", error);
    return NextResponse.json({ error: "Failed to export stock history" }, { status: 500 });
  }
}
