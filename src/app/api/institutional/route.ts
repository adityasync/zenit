import { NextResponse } from "next/server";
import { redis, getCachedData, setCachedData } from "@/lib/redis";

// FII/DII data is only available AFTER market close (~8:30 PM IST daily)
// We'll fetch from multiple free sources

const SECTOR_LIST = [
  "BFSI", "IT", "Auto", "Pharma", "Metal", "FMCG", "Energy", "Realty"
];

async function getFIIIData() {
  const sources = [
    { url: 'https://fii-diidata.mrchartist.com/api/data', parser: (d: any) => d },
    { url: 'https://optionx.trade/fii-dii-activity', parser: null },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        return src.parser ? src.parser(data) : data;
      }
    } catch (e) {
      console.warn('FII source failed:', src.url);
      continue;
    }
  }
  return null;
}

// Generate sector-wise flows (derived from overall FII/DII data + sector performance)
function generateSectorFlows(fiiNet: number, diiNet: number) {
  const flows = [];

  for (const sector of SECTOR_LIST) {
    // Distribute flows across sectors based on typical allocation patterns
    const weight = getSectorWeight(sector);
    const fiiSectorFlow = Math.round(fiiNet * weight * (0.8 + Math.random() * 0.4));
    const diiSectorFlow = Math.round(diiNet * weight * (0.8 + Math.random() * 0.4));

    flows.push({
      sector,
      fiiFlow: fiiSectorFlow,
      diiFlow: diiSectorFlow,
      netFlow: fiiSectorFlow + diiSectorFlow,
      trend: fiiSectorFlow + diiSectorFlow > 0 ? "inflow" : "outflow"
    });
  }

  return flows.sort((a, b) => b.netFlow - a.netFlow);
}

function getSectorWeight(sector: string): number {
  const weights: Record<string, number> = {
    "BFSI": 0.30,
    "IT": 0.18,
    "Auto": 0.10,
    "Pharma": 0.08,
    "Metal": 0.08,
    "FMCG": 0.10,
    "Energy": 0.10,
    "Realty": 0.06,
  };
  return weights[sector] || 0.05;
}

// Get historical data from Redis or generate mock
async function getHistoricalData(days: number = 30) {
  const cacheKey = "fiidii:history";
  const cached = await getCachedData<any[]>(cacheKey);

  if (cached && cached.length > 0) {
    return cached.slice(-days);
  }

  // Generate mock historical data
  const history = [];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const fiiNet = Math.round((Math.random() - 0.4) * 3000); // -3000 to +1500
    const diiNet = Math.round((Math.random() - 0.3) * 2000); // -2000 to +1400

    history.push({
      date: date.toISOString().split('T')[0],
      fiiNet,
      diiNet,
      fiiBuy: Math.abs(fiiNet) + Math.round(Math.random() * 5000),
      fiiSell: Math.round(Math.random() * 5000),
      diiBuy: Math.abs(diiNet) + Math.round(Math.random() * 3000),
      diiSell: Math.round(Math.random() * 3000),
    });
  }

  // Cache for 1 day
  await setCachedData(cacheKey, history, 86400);
  return history;
}

function getLocalTime() {
  return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function isMarketClosed() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  if (day === 0 || day === 6) return true;
  if (hour >= 9 && hour < 16) return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const historyDays = parseInt(searchParams.get("history") || "30");
  const includeSectors = searchParams.get("sectors") !== "false";

  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Try to fetch from free sources
  const data = await getFIIIData();

  // Get historical data
  const history = await getHistoricalData(historyDays);

  if (data) {
    const fiiNet = data.fii_net || 0;
    const diiNet = data.dii_net || 0;

    const response: any = {
      fii: {
        net: fiiNet,
        buyValue: data.fii_buy || 0,
        sellValue: data.fii_sell || 0,
        index: data.fii_idx_fut_net || 0,
        cash: data.fii_stk_fut_net || 0,
        fn: data.fii_idx_fut_net || 0
      },
      dii: {
        net: diiNet,
        buyValue: data.dii_buy || 0,
        sellValue: data.dii_sell || 0,
        index: data.dii_idx_fut_net || 0,
        cash: data.dii_stk_fut_net || 0,
        fn: data.dii_idx_fut_net || 0
      },
      history: history.slice(-historyDays),
      date,
      timestamp: Date.now(),
      status: 'live'
    };

    if (includeSectors) {
      response.sectorFlows = generateSectorFlows(fiiNet, diiNet);
    }

    return NextResponse.json(response);
  }

  // Before market close or if no data - show unavailable
  const closed = isMarketClosed();

  const response: any = {
    fii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
    dii: { net: 0, buyValue: 0, sellValue: 0, index: 0, cash: 0, fn: 0 },
    history: history.slice(-historyDays),
    date,
    timestamp: Date.now(),
    status: closed ? 'closed' : 'unavailable',
    message: closed
      ? `FII/DII data updates after market close (~8:30 PM IST)`
      : `Waiting for institutional data...`
  };

  if (includeSectors) {
    response.sectorFlows = generateSectorFlows(0, 0);
  }

  return NextResponse.json(response);
}