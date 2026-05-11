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
  isDelayed?: boolean;
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
  title?: string;
  summary?: string;
  source: string;
  url: string;
  link?: string;
  timestamp: number;
  pubDate?: string;
  symbols?: string[];
  type?: string;
  priority?: number;
}

export interface SentimentData {
  score: number;
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  description?: string;
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

export interface CorporateAction {
  symbol: string;
  company: string;
  actionType: "dividend" | "split" | "bonus" | "rights" | "buyback";
  exDate: string;
  recordDate?: string;
  purpose: string;
  details?: string;
}

export interface EarningsCalendar {
  symbol: string;
  company: string;
  resultDate: string;
  quarter: string;
  isConfirmed: boolean;
  estimates?: {
    revenue?: number;
    profit?: number;
    eps?: number;
  };
}

export interface IPOCalendar {
  company: string;
  openDate: string;
  closeDate: string;
  priceBand: string;
  lotSize: number;
  gmp?: number;
  gmpPercent?: number;
  listingDate?: string;
  status: "upcoming" | "open" | "closed" | "listed";
}

export interface MacroData {
  iip?: { value: number; growth: number; month: string };
  cpi?: { value: number; cpiInflation: number; month: string };
  rbiRates?: { repo: number; reverseRepo: number; crr: number; slr: number; updated: string };
  fdIndices?: { usdInr: number; eurInr: number; gbpInr: number; yenInr: number };
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FOContract {
  symbol: string;
  lotSize: number;
  expiryDate: string;
  instrumentType: "FUT" | "CE" | "PE";
}

export interface PaperTradeOrder {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  orderType: "market" | "limit" | "stop-loss" | "target";
  quantity: number;
  price?: number;
  triggerPrice?: number;
  status: "pending" | "executed" | "cancelled" | "triggered";
  executedPrice?: number;
  executedAt?: number;
  pnl?: number;
  lotSize?: number;
}

export interface PendingOrder extends PaperTradeOrder {
  // Additional fields for pending orders
}
