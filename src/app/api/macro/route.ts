import { NextResponse } from 'next/server';

export async function GET() {
  async function fetchWithTimeout(url: string, timeout = 6000) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0)' },
        signal: AbortSignal.timeout(timeout)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  const results = await Promise.allSettled([
    fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?interval=1d&range=5d'),
    fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/INR%3DX?interval=1d&range=5d'),
  ]);

  let vix = { value: 14.5, change: 0 };
  let usdInr = 83.5;

  try {
    if (results[0].status === 'fulfilled' && results[0].value?.chart?.result?.[0]) {
      const r = results[0].value.chart.result[0];
      vix = { value: r.meta?.regularMarketPrice || 14.5, change: 0 };
    }
  } catch {}

  try {
    if (results[1].status === 'fulfilled' && results[1].value?.chart?.result?.[0]) {
      usdInr = results[1].value.chart.result[0].meta?.regularMarketPrice || 83.5;
    }
  } catch {}

  return NextResponse.json({
    vix: { value: vix.value.toFixed(2), change: vix.change.toFixed(2), percentChange: 0 },
    usdInr: usdInr.toFixed(2),
    correlations: {
      itNasdaq: vix.value < 15 ? 0.65 : 0.35,
      itUsd: 0.42,
      bankYield: 0.28,
      vixNifty: -0.72
    },
    timestamp: Date.now(),
    status: 'ok'
  });
}