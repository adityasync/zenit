import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Institutional flow data currently unavailable" },
    { status: 503 }
  );
}
