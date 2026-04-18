import { NextResponse } from "next/server";

// FII/DII data is only available AFTER market close (~8:30 PM IST daily)
// We'll fetch from multiple free sources

async function getFIIIData() {
  const sources = [
    'https://fii-diidata.mrchartist.com/api/data',
    'https://optionx.trade/api/fii-dii'
  ];
  
  for (const url of sources) {
    try {
      const res = await fetch(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function getLocalTime() {
  return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function isMarketClosed() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  // Market closes ~8:30 PM IST, opens 9 AM IST
  if (day === 0 || day === 6) return true; // Weekend
  if (hour >= 9 && hour < 16) return false; // Market open hours (9 AM - 4 PM IST)
  return true;
}

export async function GET() {
  const date = new Date().toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  
  // Try to fetch from free sources
  const data = await getFIIIData();
  
  if (data) {
    return NextResponse.json({
      fii: { 
        net: data.fii_net || 0, 
        buyValue: data.fii_buy || 0, 
        sellValue: data.fii_sell || 0,
        index: 0, cash: 0, fn: 0
      },
      dii: { 
        net: data.dii_net || 0, 
        buyValue: data.dii_buy || 0, 
        sellValue: data.dii_sell || 0,
        index: 0, cash: 0, fn: 0
      },
      date,
      timestamp: Date.now(),
      status: 'live'
    });
  }
  
  // Before market close or if no data - show unavailable
  const closed = isMarketClosed();
  const time = getLocalTime();
  
  return NextResponse.json({
    fii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
    dii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
    date,
    timestamp: Date.now(),
    status: closed ? 'closed' : 'unavailable',
    message: closed 
      ? `FII/DII data updates after market close (~8:30 PM IST)` 
      : `Waiting for institutional data...`
  });
}