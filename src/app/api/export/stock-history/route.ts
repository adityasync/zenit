import { NextResponse } from "next/server";
import { fetchChart, extractCandles } from "@/lib/yahoo";

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

    const result = await fetchChart(symbol, { interval, range, timeoutMs: 15000, useCache: false });
    if (!result) throw new Error("No data found");

    const candles = extractCandles(result);

    let csv = "Date,Open,High,Low,Close,Volume\n";
    for (const c of candles) {
      const date = new Date(c.time).toISOString().split("T")[0];
      csv += `${date},${c.open},${c.high},${c.low},${c.close},${c.volume}\n`;
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
