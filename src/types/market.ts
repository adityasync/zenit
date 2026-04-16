export interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  percentChange: number;
  timestamp: number;
}

export interface StockQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  percentChange: number;
  deliveryPercent?: number;
  timestamp: number;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  timestamp: number;
}

export interface SectorData {
  name: string;
  symbol: string;
  value: number;
  percentChange: number;
}

export interface GainerLoser {
  symbol: string;
  ltp: number;
  percentChange: number;
  volume: number;
  volumeRatio: number;
  sector?: string;
}

export interface OptionsChain {
  strike: number;
  ce: {
    oi: number;
    oiChange: number;
    ltp: number;
    iv: number;
    volume: number;
  };
  pe: {
    oi: number;
    oiChange: number;
    ltp: number;
    iv: number;
    volume: number;
  };
}

export interface NewsItem {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  timestamp: number;
  symbols?: string[];
}

export interface SentimentData {
  score: number;
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  topTickers: { symbol: string; mentions: number; bullishRatio?: number }[];
  timestamp: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: number;
}

export interface SSEEvent {
  type: "tick" | "index" | "breadth" | "news" | "sentiment" | "heartbeat";
  data: unknown;
  timestamp: number;
}
