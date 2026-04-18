import { NextResponse } from "next/server";

const GLM_API_KEY = process.env.GLM_API_KEY;
const CACHE = new Map<string, { data: unknown; expiry: number }>();

interface CopilotContext {
  symbol?: string;
  price?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  deliveryPercent?: number;
  sector?: string;
  news?: Array<{ headline: string; source: string; timestamp: number }>;
}

function buildContextString(context?: CopilotContext | string): string {
  if (!context) return "No market data available.";
  if (typeof context === "string") return `Current Market Data:\n${context}`;

  let str = "Current Market Data:\n";
  if (context.symbol) str += `- Symbol: ${context.symbol}\n`;
  if (context.price !== undefined) str += `- Price: ₹${context.price.toFixed(2)}\n`;
  if (context.change !== undefined) {
    const sign = context.change >= 0 ? "+" : "";
    str += `- Change: ${sign}₹${context.change.toFixed(2)} (${sign}${context.percentChange?.toFixed(2)}%)\n`;
  }
  if (context.volume !== undefined) str += `- Volume: ${(context.volume / 1000).toFixed(0)}K\n`;
  if (context.deliveryPercent !== undefined) str += `- Delivery %: ${context.deliveryPercent.toFixed(1)}%\n`;
  if (context.sector) str += `- Sector: ${context.sector}\n`;
  if (context.news && context.news.length > 0) {
    str += "\nRecent News:\n";
    context.news.slice(0, 5).forEach((item, i) => {
      str += `${i + 1}. ${item.headline} (${item.source})\n`;
    });
  }
  return str;
}

export async function POST(request: Request) {
  try {
    const { query, context } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const cacheKey = `copilot:${query}:${JSON.stringify(context || {})}`;
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    if (!GLM_API_KEY) {
      return NextResponse.json(
        { response: "AI features are currently unavailable (Missing API Key).", error: true },
        { status: 503 }
      );
    }

    const contextString = buildContextString(context);
    const systemPrompt = `You are ZENIT, an expert Indian stock market analyst. 

RESPONSE STYLE:
- Keep responses concise: 2-4 sentences maximum
- Use ₹ symbol for Indian stocks
- Be analytical and factual - never give buy/sell recommendations
- If data is insufficient, state "I don't have enough data"

OUTPUT FORMAT: Plain conversational text only.`;

    console.log(`[COPILOT] Query: "${query.substring(0, 40)}..."`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GLM_API_KEY}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "glm-4.5-flash",
          max_tokens: 1500,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${contextString}\n\nQuestion: ${query}` },
          ],
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error("[GLM ERROR]", response.status);
        return NextResponse.json(
          { response: "AI service error. Please try again.", error: true },
          { status: 502 }
        );
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content?.trim() || "No response generated.";

      const result = { response: responseText, timestamp: Date.now(), context: context || null };
      CACHE.set(cacheKey, { data: result, expiry: Date.now() + 60000 });
      return NextResponse.json(result);
      
    } catch (innerError: any) {
      clearTimeout(timeout);
      
      if (innerError.name === 'AbortError') {
        return NextResponse.json(
          { response: "Request timed out. Please try again.", error: true },
          { status: 408 }
        );
      }
      throw innerError;
    }
    
  } catch (error) {
    console.error("Copilot error:", error);
    return NextResponse.json(
      { response: "Having trouble processing request. Please try again.", error: true },
      { status: 500 }
    );
  }
}