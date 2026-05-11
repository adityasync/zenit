import { NextResponse } from "next/server";
import { fetchChartBatch, normalizeChartQuote } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

const SYMBOLS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL",
  "LT", "ITC", "KOTAKBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TITAN",
  "BAJFINANCE", "TATASTEEL", "WIPRO", "HCLTECH", "TECHM", "AXISBANK",
  "NTPC", "POWERGRID", "ONGC", "COALINDIA", "TATAMOTORS", "DRREDDY",
  "CIPLA", "BPCL", "LUPIN", "APOLLOHOSP", "JSWSTEEL", "HINDALCO",
  "VEDL", "DLF", "NESTLEIND", "INDUSINDBK", "GODREJPRO", "OBEROIRLTY",
  "ADANIENT", "ADANIPORTS", "ASIANPAINT", "BAJAJ-AUTO", "BAJAJFINSV",
  "BRITANNIA", "DIVISLAB", "EICHERMOT", "GRASIM", "HDFCLIFE",
  "HEROMOTOCO", "M&M", "SBILIFE", "TATACONSUM", "ULTRACEMCO", "UPL", "TRENT",
];

const INDEX_CONSTITUENTS: Record<string, { symbols: string[]; baseValue: number }> = {
  "NIFTY 50": {
    symbols: [
      "ADANIENT","ADANIPORTS","APOLLOHOSP","ASIANPAINT","AXISBANK",
      "BAJAJ-AUTO","BAJFINANCE","BAJAJFINSV","BHARTIARTL","BPCL",
      "BRITANNIA","CIPLA","COALINDIA","DIVISLAB","DRREDDY",
      "EICHERMOT","GRASIM","HCLTECH","HDFCBANK","HDFCLIFE",
      "HEROMOTOCO","HINDALCO","HINDUNILVR","ICICIBANK","INDUSINDBK",
      "INFY","ITC","JSWSTEEL","KOTAKBANK","LT",
      "M&M","MARUTI","NESTLEIND","NTPC","ONGC",
      "POWERGRID","RELIANCE","SBILIFE","SBIN","SUNPHARMA",
      "TCS","TATACONSUM","TATAMOTORS","TATASTEEL","TECHM",
      "TITAN","ULTRACEMCO","UPL","WIPRO","TRENT",
    ],
    baseValue: 24500,
  },
  "NIFTY BANK": {
    symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSINDBK"],
    baseValue: 52000,
  },
  "SENSEX": {
    symbols: ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "LT", "ITC"],
    baseValue: 81000,
  },
  "NIFTY IT": {
    symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"],
    baseValue: 38000,
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

// Lightweight endpoint for client-side polling fallback (uses Yahoo Finance)
export async function GET() {
  try {
    const chartMap = await fetchChartBatch(SYMBOLS, { batchSize: 10, batchDelayMs: 100, timeoutMs: 3000 });
    const stockMap = new Map<string, StockData>();

    chartMap.forEach((chart, symbol) => {
      const q = normalizeChartQuote(chart);
      stockMap.set(symbol, {
        symbol,
        last_price: q.price,
        change: q.change,
        percent_change: q.percentChange,
        volume: q.volume,
        sector: "",
        open: q.price - q.change,
        day_high: q.price * 1.01,
        day_low: q.price * 0.99,
        previous_close: q.previousClose,
      });
    });

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
