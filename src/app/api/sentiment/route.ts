import { NextResponse } from "next/server";

const YAHOO_API = "https://query1.finance.yahoo.com/v8/finance/chart";

const NIFTY50_SYMBOLS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
  "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
  "BAJFINANCE","TATASTEEL","WIPRO","HCLTECH","TECHM"
];

async function fetchYahooQuote(symbol: string): Promise<number> {
  try {
    const res = await fetch(`${YAHOO_API}/${symbol}.NS?interval=1d`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return 0;
    
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return 0;
    
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    if (!meta || !quote) return 0;
    
    const lastClose = quote.close?.[quote.close.length - 1] || meta.previousClose;
    const lastOpen = quote.open?.[quote.open.length - 1] || meta.chartPreviousClose;
    
    if (!lastOpen || !lastClose) return 0;
    return ((lastClose - lastOpen) / lastOpen) * 100;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    let gains = 0, losses = 0;
    
    for (const symbol of NIFTY50_SYMBOLS) {
      const pctChange = await fetchYahooQuote(symbol);
      if (pctChange > 0) gains++;
      else if (pctChange < 0) losses++;
    }
    
    let score = 50;
    let label = 'Neutral';
    
    if (gains > losses) { score = 60; label = 'Bullish'; }
    else if (losses > gains) { score = 40; label = 'Bearish'; }
      
    return NextResponse.json({
      score,
      label,
      gains,
      losses,
      advanceRatio: '50.0'
    });
  } catch (e) {
    console.error('Sentiment error:', e);
    return NextResponse.json({ score: 50, label: 'Neutral', gains: 0, losses: 0, error: true });
  }
}