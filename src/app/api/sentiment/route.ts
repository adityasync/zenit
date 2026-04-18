import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Use free NSE API that works
    const res = await fetch('https://nse-api-ruby.vercel.app/nse/nifty50');
    
    if (res.ok) {
      const data = await res.json();
      
      // Calculate sentiment from gainers/losers in Nifty 50
      let gains = 0, losses = 0;
      
      if (Array.isArray(data)) {
        data.forEach((stock: any) => {
          const change = stock?.percentChange || stock?.change || 0;
          if (change > 0) gains++;
          else if (change < 0) losses++;
        });
      }
      
      const total = gains + losses;
      const ratio = total > 0 ? (gains / total) * 100 : 50;
      
      let score = 50;
      let label = 'Neutral';
      
      if (ratio >= 65) { score = 75; label = 'Bullish'; }
      else if (ratio >= 55) { score = 60; label = 'Bullish'; }
      else if (ratio >= 45) { score = 50; label = 'Neutral'; }
      else if (ratio >= 35) { score = 40; label = 'Bearish'; }
      else { score = 25; label = 'Bearish'; }
      
      return NextResponse.json({
        score,
        label,
        gains,
        losses,
        advanceRatio: ratio.toFixed(1)
      });
    }
    
    throw new Error('API failed');
  } catch (e) {
    return NextResponse.json(
      { score: 50, label: 'Neutral', gains: 0, losses: 0, error: true },
      { status: 200 }
    );
  }
}