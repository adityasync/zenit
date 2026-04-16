import Redis from "ioredis";
import WebSocket from "ws";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const UPSTOX_WS_URL = "wss://api.upstox.com/v2/feed/market-data-feed";
const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY || "";
const UPSTOX_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN || "";

const INDICES = ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY AUTO", "SENSEX", "NIFTY PHARMA"];
const WATCHED_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL"];

const redis = new Redis(REDIS_URL);
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

interface TickerData {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  percentChange: number;
  timestamp: number;
}

interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  percentChange: number;
  timestamp: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cacheTicker(data: TickerData): Promise<void> {
  const key = `ticker:${data.symbol}`;
  await redis.setex(key, 5, JSON.stringify(data));
  await redis.publish("ticker:updates", JSON.stringify(data));
}

async function cacheIndex(data: IndexData): Promise<void> {
  const key = `index:${data.symbol}`;
  await redis.setex(key, 5, JSON.stringify(data));
  await redis.publish("index:updates", JSON.stringify(data));
}

function connectWebSocket(): void {
  if (!UPSTOX_API_KEY || !UPSTOX_ACCESS_TOKEN) {
    console.log("⚠️  Upstox credentials not configured. Running in mock mode.");
    startMockDataGenerator();
    return;
  }

  console.log("📡 Connecting to Upstox WebSocket...");

  ws = new WebSocket(UPSTOX_WS_URL);

  ws.on("open", () => {
    console.log("✅ Connected to Upstox WebSocket");
    reconnectAttempts = 0;

    const subscribeMessage = {
      guid: crypto.randomUUID(),
      method: "sub",
      data: {
        mode: "full",
        instruments: [
          ...INDICES.map((name) => ({
            exchangeType: 1,
            symbol: name.replace(" ", "%20"),
            token: "",
          })),
          ...WATCHED_SYMBOLS.map((symbol) => ({
            exchangeType: 1,
            symbol: symbol,
            token: "",
          })),
        ],
      },
    };

    ws?.send(JSON.stringify(subscribeMessage));
    console.log("📊 Subscribed to instruments");
  });

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === "fe" && message.data) {
        for (const instrument of message.data) {
          if (instrument.lp !== undefined) {
            const symbol = instrument.ts || instrument.sym;

            if (INDICES.some((idx) => symbol?.toString().includes(idx.replace(" ", "%20")))) {
              const indexData: IndexData = {
                symbol: symbol?.toString() || "",
                name: symbol?.toString().replace(/%20/g, " ") || "",
                value: parseFloat(instrument.lp) || 0,
                change: parseFloat(instrument.ch) || 0,
                percentChange: parseFloat(instrument.chp) || 0,
                timestamp: Date.now(),
              };
              await cacheIndex(indexData);
            } else {
              const tickerData: TickerData = {
                symbol: symbol?.toString() || "",
                ltp: parseFloat(instrument.lp) || 0,
                open: parseFloat(instrument.op) || 0,
                high: parseFloat(instrument.h) || 0,
                low: parseFloat(instrument.l) || 0,
                close: parseFloat(instrument.c) || 0,
                volume: parseInt(instrument.v) || 0,
                change: parseFloat(instrument.ch) || 0,
                percentChange: parseFloat(instrument.chp) || 0,
                timestamp: Date.now(),
              };
              await cacheTicker(tickerData);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    scheduleReconnect();
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

async function scheduleReconnect(): Promise<void> {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error("Max reconnect attempts reached. Starting mock data generator.");
    startMockDataGenerator();
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
  console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);

  await sleep(delay);
  connectWebSocket();
}

function startMockDataGenerator(): void {
  console.log("🎭 Starting mock data generator...");

  let baseNifty = 22850;
  let baseBank = 48500;
  let baseSensex = 75500;

  setInterval(() => {
    baseNifty += (Math.random() - 0.5) * 20;
    baseBank += (Math.random() - 0.5) * 50;
    baseSensex += (Math.random() - 0.5) * 80;

    const niftyChange = baseNifty - 22800;
    const bankChange = baseBank - 48200;
    const sensexChange = baseSensex - 75200;

    const indices: IndexData[] = [
      {
        symbol: "NIFTY%2050",
        name: "NIFTY 50",
        value: parseFloat(baseNifty.toFixed(2)),
        change: parseFloat(niftyChange.toFixed(2)),
        percentChange: parseFloat(((niftyChange / 22800) * 100).toFixed(2)),
        timestamp: Date.now(),
      },
      {
        symbol: "NIFTY%20BANK",
        name: "NIFTY BANK",
        value: parseFloat(baseBank.toFixed(2)),
        change: parseFloat(bankChange.toFixed(2)),
        percentChange: parseFloat(((bankChange / 48200) * 100).toFixed(2)),
        timestamp: Date.now(),
      },
      {
        symbol: "NIFTY%20IT",
        name: "NIFTY IT",
        value: parseFloat((41500 + (Math.random() - 0.5) * 100).toFixed(2)),
        change: parseFloat(((Math.random() - 0.5) * 150).toFixed(2)),
        percentChange: parseFloat(((Math.random() - 0.5) * 0.8).toFixed(2)),
        timestamp: Date.now(),
      },
      {
        symbol: "SENSEX",
        name: "SENSEX",
        value: parseFloat(baseSensex.toFixed(2)),
        change: parseFloat(sensexChange.toFixed(2)),
        percentChange: parseFloat(((sensexChange / 75200) * 100).toFixed(2)),
        timestamp: Date.now(),
      },
    ];

    for (const index of indices) {
      const key = `index:${index.symbol}`;
      redis.setex(key, 5, JSON.stringify(index)).catch(console.error);
      redis.publish("index:updates", JSON.stringify(index)).catch(console.error);
    }

    const mockTickers: TickerData[] = WATCHED_SYMBOLS.map((symbol) => {
      const basePrice = symbol === "RELIANCE" ? 2950 : symbol === "TCS" ? 3850 : 1200 + Math.random() * 500;
      const change = (Math.random() - 0.5) * basePrice * 0.02;
      return {
        symbol,
        ltp: parseFloat((basePrice + change).toFixed(2)),
        open: basePrice,
        high: basePrice * 1.01,
        low: basePrice * 0.99,
        close: basePrice,
        volume: Math.floor(100000 + Math.random() * 500000),
        change: parseFloat(change.toFixed(2)),
        percentChange: parseFloat(((change / basePrice) * 100).toFixed(2)),
        timestamp: Date.now(),
      };
    });

    for (const ticker of mockTickers) {
      const key = `ticker:${ticker.symbol}`;
      redis.setex(key, 5, JSON.stringify(ticker)).catch(console.error);
      redis.publish("ticker:updates", JSON.stringify(ticker)).catch(console.error);
    }
  }, 3000);

  setInterval(() => {
    const breadth = {
      advances: Math.floor(1200 + Math.random() * 200),
      declines: Math.floor(600 + Math.random() * 200),
      unchanged: Math.floor(30 + Math.random() * 30),
      timestamp: Date.now(),
    };
    redis.setex("breadth:market", 15, JSON.stringify(breadth)).catch(console.error);
  }, 15000);
}

async function fetchNSEIndices(): Promise<void> {
  try {
    const response = await fetch("https://www.nseindia.com/api/allIndices", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("📈 Fetched NSE indices successfully");
    }
  } catch (error) {
    console.error("Failed to fetch NSE indices:", error);
  }
}

async function main(): Promise<void> {
  console.log("🚀 ZENIT Worker starting...");

  try {
    await redis.ping();
    console.log("✅ Redis connected");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    process.exit(1);
  }

  connectWebSocket();

  setInterval(fetchNSEIndices, 60000);

  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down worker...");
    ws?.close();
    await redis.quit();
    process.exit(0);
  });
}

main().catch(console.error);
