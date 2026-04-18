import { NextResponse } from 'next/server';

async function fetchNSEOptionChain(symbol: string) {
  const nseSymbol = symbol === 'NIFTY' ? 'NIFTY' : symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
  
  try {
    const res = await fetch(
      `https://www.nseindia.com/api/option-chain-indices?symbol=${nseSymbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      }
    );
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

function calculatePCR(data: any) {
  if (!data?.records) return null;
  
  try {
    const strikes = data.records;
    let totalCEOI = 0;
    let totalPEOI = 0;
    let maxPain = 0;
    let maxPainOI = 0;
    
    const processedStrikes = [];
    
    for (const record of strikes) {
      const strikePrice = record.strikePrice;
      const ceOI = record.CE?.openInterest || 0;
      const peOI = record.PE?.openInterest || 0;
      
      totalCEOI += ceOI;
      totalPEOI += peOI;
      
      const totalOI = ceOI + peOI;
      if (totalOI > maxPainOI) {
        maxPainOI = totalOI;
        maxPain = strikePrice;
      }
      
      processedStrikes.push({
        strike: strikePrice,
        ce: { ltp: record.CE?.lastPrice || 0, oi: ceOI, oiChange: record.CE?.changeinOpenInterest || 0, volume: record.CE?.totalTradedVolume || 0 },
        pe: { ltp: record.PE?.lastPrice || 0, oi: peOI, oiChange: record.PE?.changeinOpenInterest || 0, volume: record.PE?.totalTradedVolume || 0 }
      });
      
      if (processedStrikes.length >= 15) break;
    }
    
    return {
      symbol: data.underlying || 'NIFTY',
      spotPrice: data.records?.[5]?.underlyingValue || 0,
      pcr: totalPEOI > 0 ? (totalPEOI / totalCEOI).toFixed(2) : '1.00',
      maxPain,
      strikes: processedStrikes,
      totalCEOI,
      totalPEOI
    };
  } catch (e) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'NIFTY';
  
  const nseData = await fetchNSEOptionChain(symbol);
  
  if (nseData) {
    const result = calculatePCR(nseData);
    if (result) return NextResponse.json(result);
  }
  
  // Return error - no mock data
  return NextResponse.json(
    { error: 'Live data unavailable. Market may be closed.' },
    { status: 503 }
  );
}