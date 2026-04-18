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
    const systemPrompt = `You are ZENIT, an Indian stock market intelligence assistant. You analyze market data and provide concise, helpful explanations.

Rules:
- Keep responses to 3-6 sentences maximum
- Focus on facts from the provided context
- If insufficient data, say "I don't have enough data to answer that"
- Never provide buy/sell recommendations
- Be specific about price levels and percentage moves
- Reference relevant news or technical factors when available`;

    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: "glm-4.7-flash",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `${contextString}\n\nUser question: ${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GLM API error:", errorText);
      return NextResponse.json(
        { response: "I'm having trouble connecting to the AI service. Please try again later.", error: true },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    if (data.error) {
       return NextResponse.json({ 
         response: `API Error: ${data.error.message || "Unknown API error"}`, 
         error: true 
       });
    }

    const message = data.choices?.[0]?.message;
    let responseText = "";
    
    if (message) {
       responseText = message.content || "";
    }
    
    responseText = responseText.trim();
    if (!responseText) {
       responseText = "I couldn't generate a response for this context. Please try again.";
    }

    const result = {
      response: responseText,
      timestamp: Date.now(),
      context: context || null,
    };

    CACHE.set(cacheKey, { data: result, expiry: Date.now() + 900000 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Copilot error:", error);
    return NextResponse.json(
      { response: "I'm having trouble processing your request. Please try again.", error: true },
      { status: 500 }
    );
  }
}

function buildContextString(context?: CopilotContext | string): string {
  if (!context) return "No market data available.";
  if (typeof context === "string") return `Current Market Data:\n${context}`;

  let str = "Current Market Data:\n";

  if (context.symbol) {
    str += `- Symbol: ${context.symbol}\n`;
  }
  if (context.price !== undefined) {
    str += `- Price: ₹${context.price.toFixed(2)}\n`;
  }
  if (context.change !== undefined) {
    const sign = context.change >= 0 ? "+" : "";
    str += `- Change: ${sign}₹${context.change.toFixed(2)} (${sign}${context.percentChange?.toFixed(2)}%)\n`;
  }
  if (context.volume !== undefined) {
    str += `- Volume: ${(context.volume / 1000).toFixed(0)}K\n`;
  }
  if (context.deliveryPercent !== undefined) {
    str += `- Delivery %: ${context.deliveryPercent.toFixed(1)}%\n`;
  }
  if (context.sector) {
    str += `- Sector: ${context.sector}\n`;
  }
  if (context.news && context.news.length > 0) {
    str += "\nRecent News:\n";
    context.news.slice(0, 5).forEach((item, i) => {
      str += `${i + 1}. ${item.headline} (${item.source})\n`;
    });
  }

  return str;
}
