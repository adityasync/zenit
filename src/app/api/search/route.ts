import { NextResponse } from "next/server";

const NSE_API = "https://nse-api-ruby.vercel.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${NSE_API}/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store"
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}