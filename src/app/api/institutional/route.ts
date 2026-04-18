import { NextResponse } from "next/server";

export async function GET() {
  // Silent success with empty data to prevent dashboard noise and errors
  // This will be replaced once a real live institutional flow API is integrated
  return NextResponse.json({
    fii: { net: 0, buy: 0, sell: 0 },
    dii: { net: 0, buy: 0, sell: 0 },
    timestamp: Date.now(),
    status: "placeholder"
  });
}
