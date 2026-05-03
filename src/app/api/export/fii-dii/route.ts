import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Fetch FII/DII data (reuse logic from institutional API)
    // For now, return a structured CSV

    let csv = "Date,FII Net (Cr),FII Buy (Cr),FII Sell (Cr),DII Net (Cr),DII Buy (Cr),DII Sell (Cr)\n";

    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Mock data (in production, fetch from your data source)
      const fiiNet = (Math.random() - 0.4) * 3000;
      const fiiBuy = Math.abs(fiiNet) + Math.random() * 5000;
      const fiiSell = Math.random() * 5000;
      const diiNet = (Math.random() - 0.3) * 2000;
      const diiBuy = Math.abs(diiNet) + Math.random() * 3000;
      const diiSell = Math.random() * 3000;

      csv += `${dateStr},${fiiNet.toFixed(2)},${fiiBuy.toFixed(2)},${fiiSell.toFixed(2)},${diiNet.toFixed(2)},${diiBuy.toFixed(2)},${diiSell.toFixed(2)}\n`;
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
