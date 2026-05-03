// F&O Lot Sizes for Indian Markets (as of 2026)
// NSE updates lot sizes periodically, this is a reference list

export interface FOLotData {
  symbol: string;
  lotSize: number;
  instrumentType: "EQ" | "FUT" | "CE" | "PE";
  expiry?: string; // Current expiry in format YYYY-MM-DD
}

// Major F&O stocks with their lot sizes
export const FO_LOT_SIZES: Record<string, number> = {
  // NIFTY 50 components (most liquid F&O stocks)
  "RELIANCE": 250,
  "TCS": 300,
  "HDFCBANK": 500,
  "INFY": 600,
  "ICICIBANK": 1375,
  "HINDUNILVR": 200,
  "ITC": 3200,
  "SBIN": 3000,
  "BHARTIARTL": 4100,
  "KOTAKBANK": 800,
  "LT": 250,
  "AXISBANK": 1200,
  "MARUTI": 50,
  "SUNPHARMA": 400,
  "TITAN": 350,
  "BAJFINANCE": 75,
  "HCLTECH": 750,
  "WIPRO": 3600,
  "ADANIPORTS": 1500,
  "ONGC": 4000,
  "POWERGRID": 4500,
  "NTPC": 7000,
  "COALINDIA": 3000,
  "TATASTEEL": 2400,
  "JSWSTEEL": 2000,
  "GRASIM": 300,
  "BAJAJFINSV": 75,
  "DRREDDY": 125,
  "DIVISLAB": 200,
  "BRITANNIA": 100,
  "EICHERMOT": 150,
  "HEROMOTOCO": 300,
  "INDUSINDBK": 1000,
  "BANKBARODA": 4500,
  "FEDERALBNK": 4000,
  "IDFCFIRSTB": 4800,
  "MOTHERSON": 3000,
  "MCDOWELL-N": 500,
  "TATACONSUM": 550,
  "VEDL": 2600,
  "CIPLA": 600,
  "BPCL": 1200,
  "HINDPETRO": 1300,
  "IOC": 4800,
  "GAIL": 3500,
  "BERGEPAINT": 350,
  "DABUR": 800,
  "GODREJCP": 600,
  "MARICO": 500,
  "COLPAL": 400,
  "UBL": 500,
  "PIDILITIND": 300,
  "ASIANPAINT": 150,
  "PAGEIND": 25,
  "BOSCHLTD": 10,
  "SIEMENS": 150,
  "ABB": 150,
  "HAVELLS": 500,
  "VOLTAS": 600,
  "CGPOWER": 1800,
  "BHEL": 9000,
  "CONCOR": 700,
  "APOLLOHOSP": 100,
  "FORTIS": 1200,
  "MAXHEALTH": 600,
  // Indices
  "NIFTY": 50,
  "BANKNIFTY": 15,
  "FINNIFTY": 40,
  "MIDCPNIFTY": 75,
};

// Get lot size for a symbol
export function getLotSize(symbol: string): number {
  const normalized = symbol.toUpperCase().replace(".NS", "").replace("-EQ", "");
  return FO_LOT_SIZES[normalized] || 1; // Default to 1 for non-F&O stocks
}

// Check if a stock is F&O eligible
export function isFOStock(symbol: string): boolean {
  const normalized = symbol.toUpperCase().replace(".NS", "").replace("-EQ", "");
  return normalized in FO_LOT_SIZES;
}

// Calculate quantity in lots
export function toLots(quantity: number, symbol: string): number {
  const lotSize = getLotSize(symbol);
  return Math.floor(quantity / lotSize);
}

// Calculate quantity from lots
export function fromLots(lots: number, symbol: string): number {
  const lotSize = getLotSize(symbol);
  return lots * lotSize;
}
