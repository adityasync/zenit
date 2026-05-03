import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { watchlist, positions } = body;

    // Generate CSV for watchlist
    let csv = "Symbol,Name,LTP,Change,Change %,Volume,Alert Price\n";

    if (Array.isArray(watchlist)) {
      for (const item of watchlist) {
        csv += `${item.symbol},"${item.name || item.symbol}",${item.ltp || 0},${item.change || 0},${item.percentChange || 0},${item.volume || 0},${item.alertPrice || ""}\n`;
      }
    }

    // Add positions if provided
    if (Array.isArray(positions) && positions.length > 0) {
      csv += "\n\nPositions\n";
      csv += "Symbol,Quantity,Avg Price,Current Price,P&L,P&L %\n";
      for (const pos of positions) {
        const pnl = (pos.currentPrice - pos.avgPrice) * pos.quantity;
        const pnlPct = (pnl / (pos.avgPrice * pos.quantity)) * 100;
        csv += `${pos.symbol},${pos.quantity},${pos.avgPrice},${pos.currentPrice},${pnl.toFixed(2)},${pnlPct.toFixed(2)}\n`;
      }
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="zennit-watchlist-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export watchlist error:", error);
    return NextResponse.json({ error: "Failed to export watchlist" }, { status: 500 });
  }
}
