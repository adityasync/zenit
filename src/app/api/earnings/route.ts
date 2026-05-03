import { NextResponse } from "next/server";

const NSE_BASE_URL = "https://www.nseindia.com";
const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const symbol = searchParams.get("symbol");

  try {
    // For now, return a structured calendar
    // In production, this would fetch from NSE earnings calendar or similar API
    const today = new Date();
    const calendar: any[] = [];

    // Mock earnings data (in production, fetch from NSE/provider)
    const mockEarnings = [
      { symbol: "RELIANCE", company: "Reliance Industries Ltd", daysFromNow: 5, quarter: "Q4 FY25" },
      { symbol: "TCS", company: "Tata Consultancy Services Ltd", daysFromNow: 8, quarter: "Q4 FY25" },
      { symbol: "INFY", company: "Infosys Ltd", daysFromNow: 12, quarter: "Q4 FY25" },
      { symbol: "HDFCBANK", company: "HDFC Bank Ltd", daysFromNow: 15, quarter: "Q4 FY25" },
      { symbol: "ICICIBANK", company: "ICICI Bank Ltd", daysFromNow: 18, quarter: "Q4 FY25" },
      { symbol: "HINDUNILVR", company: "Hindustan Unilever Ltd", daysFromNow: 20, quarter: "Q4 FY25" },
      { symbol: "SBIN", company: "State Bank of India", daysFromNow: 22, quarter: "Q4 FY25" },
      { symbol: "BHARTIARTL", company: "Bharti Airtel Ltd", daysFromNow: 25, quarter: "Q4 FY25" },
      { symbol: "KOTAKBANK", company: "Kotak Mahindra Bank Ltd", daysFromNow: 28, quarter: "Q4 FY25" },
      { symbol: "LT", company: "Larsen & Toubro Ltd", daysFromNow: 30, quarter: "Q4 FY25" },
    ];

    for (const item of mockEarnings) {
      if (symbol && item.symbol !== symbol.toUpperCase()) continue;

      const resultDate = new Date(today);
      resultDate.setDate(today.getDate() + item.daysFromNow);

      if (item.daysFromNow > days) continue;

      calendar.push({
        symbol: item.symbol,
        company: item.company,
        resultDate: resultDate.toISOString().split("T")[0],
        quarter: item.quarter,
        isConfirmed: true,
        daysUntil: item.daysFromNow,
        estimates: {
          revenue: undefined,
          profit: undefined,
          eps: undefined,
        },
      });
    }

    return NextResponse.json({
      count: calendar.length,
      days,
      calendar,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Earnings calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings calendar" },
      { status: 500 }
    );
  }
}
