import { NextResponse } from 'next/server';

const BASE_URL = 'http://65.0.104.9';
const NIFTY50_SYMBOLS = [
  "RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SBIN","BHARTIARTL",
  "LT","ITC","KOTAKBANK","HINDUNILVR","MARUTI","SUNPHARMA","TITAN",
  "BAJFINANCE","TATASTEEL","WIPRO","NESTLEIND","ULTRACEMCO"
];

export async function GET() {
  try {
    const symList = NIFTY50_SYMBOLS.map(s => s.includes('&') ? s.replace('&', '%26') : s).join(",");
    const res = await fetch(`${BASE_URL}/stock/list?symbols=${symList}&res=num`);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    throw new Error('API failed');
  } catch (e) {
    return NextResponse.json({ error: true }, { status: 503 });
  }
}