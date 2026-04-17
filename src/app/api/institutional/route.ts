import { NextResponse } from "next/server";

export async function GET() {
  // Mock realistic Institutional Flow figures (₹ Crores)
  // Usually FII and DII flows are slightly inverse.
  
  const generateRealisticFlow = () => {
    const isFIIMarketBullish = Math.random() > 0.4;
    const fiiNet = (isFIIMarketBullish ? 1 : -1) * (1500 + Math.random() * 4500); // 1.5K to 6K Crores
    
    // DII generally provides counter-balance but can be aligned in extreme days
    const isDIICounter = Math.random() > 0.2; 
    let diiNet = (isDIICounter ? (isFIIMarketBullish ? -1 : 1) : (isFIIMarketBullish ? 1 : -1)) * (800 + Math.random() * 3000);
    
    return {
      fii: {
        buy: Math.abs(fiiNet) + 8000 + Math.random() * 5000,
        sell: Math.abs(fiiNet) + 8000 + Math.random() * 5000 - fiiNet,
        net: parseFloat(fiiNet.toFixed(2))
      },
      dii: {
        buy: Math.abs(diiNet) + 6000 + Math.random() * 4000,
        sell: Math.abs(diiNet) + 6000 + Math.random() * 4000 - diiNet,
        net: parseFloat(diiNet.toFixed(2))
      },
      timestamp: Date.now()
    };
  };

  return NextResponse.json(generateRealisticFlow());
}
