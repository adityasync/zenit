import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STOCK_API = "https://nse-api-ruby.vercel.app";

const SYMBOLS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL",
  "LT", "ITC", "KOTAKBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN",
  "BAJFINANCE", "TATASTEEL", "WIPRO", "HCLTECH", "TECHM", "AXISBANK",
  "NTPC", "POWERGRID", "ONGC", "COALINDIA", "TATAMOTORS", "DRREDDY",
  "CIPLA", "BPCL", "LUPIN", "APOLLOHOSP", "JSWSTEEL", "HINDALCO",
  "VEDL", "DLF", "NESTLEIND", "INDUSIND", "GODREJPRO", "OBEROIRLTY",
];

const INDEX_CONSTITUENTS: Record<string, { symbols: string[]; baseValue: number }> = {
  "NIFTY 50": {
    symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "LT", "ITC", "KOTAKBANK"],
    baseValue: 22850,
  },
  "NIFTY BANK": {
    symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSIND"],
    baseValue: 48500,
  },
  "SENSEX": {
    symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "LT", "ITC"],
    baseValue: 75500,
  },
  "NIFTY IT": {
    symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
    baseValue: 41500,
  },
};

const SECTOR_STOCKS: Record<string, { name: string; symbols: string[] }> = {
  BFSI: { name: "NIFTY BANK", symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"] },
  IT: { name: "NIFTY IT", symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"] },
  AUTO: { name: "NIFTY AUTO", symbols: ["MARUTI", "TATAMOTORS", "BAJFINANCE"] },
  PHARMA: { name: "NIFTY PHARMA", symbols: ["SUNPHARMA", "DRREDDY", "CIPLA", "LUPIN"] },
  METAL: { name: "NIFTY METAL", symbols: ["TATASTEEL", "HINDALCO", "JSWSTEEL", "VEDL", "COALINDIA"] },
  FMCG: { name: "NIFTY FMCG", symbols: ["HINDUNILVR", "ITC", "NESTLEIND", "TITAN"] },
  ENERGY: { name: "NIFTY ENERGY", symbols: ["RELIANCE", "ONGC", "BPCL", "NTPC", "POWERGRID"] },
};

interface StockData {
  symbol: string;
  last_price: number;
  change: number;
  percent_change: number;
  volume: number;
  sector: string;
  open: number;
  day_high: number;
  day_low: number;
  previous_close: number;
}

// Lightweight endpoint for client-side polling fallback
export async function GET() {
  try {
    const symList = SYMBOLS.join(",");
    const res = await fetch(`${STOCK_API}/stock/list?symbols=${symList}&res=num`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }

    const data = await res.json();
    const stocks = data.stocks || [];
    const stockMap = new Map<string, StockData>();

    for (const s of stocks) {
      const isLive = typeof s.last_price === "number" && !isNaN(s.last_price);
      stockMap.set(s.symbol, {
        symbol: s.symbol,
        last_price: isLive ? s.last_price : (s.previous_close || 0),
        change: isLive ? (s.change || 0) : 0,
        percent_change: isLive ? (s.percent_change || 0) : 0,
        volume: s.volume || 0,
        sector: s.sector || "",
        open: s.open || s.previous_close || 0,
        day_high: s.day_high || s.last_price || 0,
        day_low: s.day_low || s.last_price || 0,
        previous_close: s.previous_close || 0,
      });
    }

    // Derive indices
    const indices = Object.entries(INDEX_CONSTITUENTS).map(([name, config]) => {
      const changes: number[] = [];
      for (const sym of config.symbols) {
        const stock = stockMap.get(sym);
        if (stock && stock.percent_change !== 0) changes.push(stock.percent_change);
      }
      const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      const value = config.baseValue * (1 + avgChange / 100);
      return {
        symbol: name.replace(/\s/g, ""),
        name,
        value: parseFloat(value.toFixed(2)),
        change: parseFloat((value - config.baseValue).toFixed(2)),
        percentChange: parseFloat(avgChange.toFixed(2)),
        timestamp: Date.now(),
      };
    });

    // Derive breadth
    let advances = 0, declines = 0, unchanged = 0;
    stockMap.forEach(stock => {
      if (stock.percent_change > 0.05) advances++;
      else if (stock.percent_change < -0.05) declines++;
      else unchanged++;
    });
    const scale = Math.max(1, Math.round(1800 / Math.max(1, stockMap.size)));

    // Derive sectors
    const sectors = Object.entries(SECTOR_STOCKS).map(([symbol, config]) => {
      const changes: number[] = [];
      for (const sym of config.symbols) {
        const stock = stockMap.get(sym);
        if (stock && stock.percent_change !== 0) changes.push(stock.percent_change);
      }
      const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
      return {
        name: config.name,
        symbol,
        value: parseFloat((10000 * (1 + avgChange / 100)).toFixed(2)),
        percentChange: parseFloat(avgChange.toFixed(2)),
      };
    });

    // Gainers / Losers
    const allStocks = Array.from(stockMap.values()).filter(s => s.percent_change !== 0 && s.last_price > 0);
    const sorted = [...allStocks].sort((a, b) => b.percent_change - a.percent_change);
    const gainers = sorted.slice(0, 10).filter(s => s.percent_change > 0).map(s => ({
      symbol: s.symbol, ltp: s.last_price, percentChange: s.percent_change, volume: s.volume, volumeRatio: 1.0, sector: s.sector,
    }));
    const losers = sorted.slice(-10).reverse().filter(s => s.percent_change < 0).map(s => ({
      symbol: s.symbol, ltp: s.last_price, percentChange: s.percent_change, volume: s.volume, volumeRatio: 1.0, sector: s.sector,
    }));

    // Screener
    const screener = allStocks
      .filter(s => Math.abs(s.percent_change) >= 3 || s.volume > 5000000)
      .slice(0, 6)
      .map(s => ({
        symbol: s.symbol,
        type: s.percent_change >= 3 ? '🚀 Breakout' : s.percent_change <= -3 ? '🔴 Breakdown' : '⚡ Volume Shock',
        ltp: s.last_price,
        percentChange: s.percent_change,
      }));

    // Tickers for watchlist
    const tickers = Array.from(stockMap.values()).map(s => ({
      symbol: s.symbol,
      ltp: s.last_price,
      open: s.open || s.previous_close || s.last_price,
      high: s.day_high || s.last_price,
      low: s.day_low || s.last_price,
      volume: s.volume,
      change: s.change,
      percentChange: s.percent_change,
      timestamp: Date.now(),
    }));

    return NextResponse.json({
      indices,
      breadth: { advances: advances * scale, declines: declines * scale, unchanged: unchanged * scale, timestamp: Date.now() },
      sectors,
      gainers,
      losers,
      screener,
      tickers,
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
