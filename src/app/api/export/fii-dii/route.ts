import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const res = await fetch("https://fii-diidata.mrchartist.com/api/history", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch FII/DII data" }, { status: 502 });
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No FII/DII data available" }, { status: 404 });
    }

    // Take last N days, reverse to chronological order
    const records = data.slice(-days).reverse();

    let csv = "Date,FII Net (Cr),FII Buy (Cr),FII Sell (Cr),DII Net (Cr),DII Buy (Cr),DII Sell (Cr)\n";

    for (const r of records) {
      const date = (r.date as string) || "";
      // mrchartist date format is "08-May-2026", convert to YYYY-MM-DD
      const parsed = parseMrchartistDate(date);
      csv += `${parsed},${(r.fii_net || 0).toFixed(2)},${(r.fii_buy || 0).toFixed(2)},${(r.fii_sell || 0).toFixed(2)},${(r.dii_net || 0).toFixed(2)},${(r.dii_buy || 0).toFixed(2)},${(r.dii_sell || 0).toFixed(2)}\n`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="zennit-fii-dii-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export FII/DII error:", error);
    return NextResponse.json({ error: "Failed to export FII/DII data" }, { status: 500 });
  }
}

function parseMrchartistDate(dateStr: string): string {
  // "08-May-2026" -> "2026-05-08"
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [day, mon, year] = parts;
  return `${year}-${months[mon] || "01"}-${day.padStart(2, "0")}`;
}
