import { NextResponse } from 'next/server';
import { fetchChartBatch, normalizeChartQuote } from '@/lib/yahoo';

const NIFTY50_SYMBOLS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
  "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
  "BAJFINANCE","TATASTEEL","WIPRO","NESTLEIND","ULTRACEMCO"
];

export async function GET() {
  try {
    const chartMap = await fetchChartBatch(NIFTY50_SYMBOLS, { batchSize: 10, batchDelayMs: 100, timeoutMs: 5000 });
    const stocks: Record<string, unknown>[] = [];

    chartMap.forEach((chart, symbol) => {
      const q = normalizeChartQuote(chart);
      stocks.push({
        symbol,
        last_price: q.price,
        change: q.change,
        percent_change: q.percentChange,
        volume: q.volume,
        previous_close: q.previousClose,
        company_name: q.shortName || symbol,
      });
    });

    return NextResponse.json({ stocks });
  } catch {
    return NextResponse.json({ error: true }, { status: 503 });
  }
}