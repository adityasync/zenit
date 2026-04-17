"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import StockHeatmap from '@/components/StockHeatmap';
import RealCandlestickChart from '@/components/CandlestickChart';
import { 
  Zap, 
  Layers, 
  Bot,
  Activity, 
  Newspaper, 
  BarChart3, 
  X, 
  Command,
  Cpu,
  Loader2,
  SendHorizontal,
  Target,
  ArrowUp,
  ArrowDown,
  Globe,
  Search as SearchIcon,
  Flame,
  LineChart,
  Wallet,
  Compass,
  TrendingUp,
  MousePointer2,
  ExternalLink,
  TrendingDown,
  Plus,
  Star,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSE } from "@/hooks/useSSE";
import { MobileNav, MobileTab } from "@/components/mobile-nav";
import type { IndexData, StockQuote, MarketBreadth, GainerLoser, SectorData, SentimentData } from "@/types/market";
import type { LucideIcon } from "lucide-react";

const WATCHLIST_KEY = "nextick:watchlist";

const formatPrice = (val: number) => {
  if (typeof val !== 'number' || isNaN(val)) return "0.00";
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Mono = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-tighter ${className}`} style={{ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>{children}</span>
);

const WidgetHeader = ({ title, icon: Icon, extra }: { title: string; icon?: LucideIcon; extra?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={12} className="text-zinc-500" />}
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{title}</span>
    </div>
    {extra}
  </div>
);

const CandlestickChart = ({ height = 180, data, activeSymbol }: { height?: number; data?: number[]; activeSymbol?: string }) => {
  const candles = useMemo(() => {
    if (data && data.length > 0) {
      return data.map((val, i) => {
        const open = val * 0.99;
        const close = val;
        return { open, close, high: val * 1.01, low: open * 0.99 };
      });
    }
    return Array.from({ length: 40 }, (_, i) => {
      const base = 100 + Math.sin(i / 5) * 20;
      const open = base + (Math.random() - 0.5) * 10;
      const close = open + (Math.random() - 0.5) * 15;
      return { open, close, high: Math.max(open, close) + 5, low: Math.min(open, close) - 5 };
    });
  }, [data]);

  const max = Math.max(...candles.map(c => c.high));
  const min = Math.min(...candles.map(c => c.low));
  const range = max - min;
  const getY = (v: number) => height - ((v - min) / (range || 1)) * height;

  return (
    <div className="w-full bg-zinc-950/40 rounded border border-white/5 relative overflow-hidden" style={{ height }}>
      <svg width="100%" height={height} className="overflow-visible">
        {candles.map((c, i) => {
          const x = i * 11 + 10;
          const isUp = c.close >= c.open;
          const color = isUp ? '#10b981' : '#f43f5e';
          return (
            <g key={i} className="transition-all duration-500">
              <line x1={x + 4} x2={x + 4} y1={getY(c.high)} y2={getY(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x} y={Math.min(getY(c.open), getY(c.close))} width={8} height={Math.max(2, Math.abs(getY(c.open) - getY(c.close)))} fill={color} />
            </g>
          );
        })}
      </svg>
      <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Real-time OHLCV Stream</div>
    </div>
  );
};

interface WatchlistItem {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  percentChange: number;
  volume: number;
  timestamp: number;
}

interface SearchResult {
  symbol: string;
  name: string;
}

async function callCopilotAPI(query: string, context: string = "") {
  try {
    const res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context }),
    });
    if (res.ok) {
      const data = await res.json();
      return { text: data.response || data.text || "No response generated.", sources: data.sources || [] };
    }
  } catch (err) {
    console.error("Copilot API error:", err);
  }
  return { text: "Intelligence engine currently unavailable.", error: true };
}

export default function App() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null); 
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [heatmapView, setHeatmapView] = useState<"sectors" | "nifty50" | "banknifty" | "sensex">("sectors");
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("indices");
  
  const [stockInsight, setStockInsight] = useState({ text: "", loading: false });
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<{ text: string; loading: boolean; sources: { uri: string; title: string }[] }>({ text: "", loading: false, sources: [] });
  
  const [optionsChain, setOptionsChain] = useState<any>(null);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [institutionalData, setInstitutionalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  useEffect(() => {
    if (watchlist.length > 0) {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    }
  }, [watchlist]);

  const fetchStockQuote = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/quote?symbol=${symbol}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error(`Failed to fetch ${symbol}`, err);
    }
    return null;
  }, []);

  const searchStocks = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const matches = data.results.slice(0, 10).map((r: any) => ({
            symbol: r.symbol,
            name: r.company_name || r.symbol,
          }));
          setSearchResults(matches);
          setSearching(false);
          return;
        }
      }
    } catch {}
    
    const upperQuery = query.toUpperCase();
    const common = ['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','LT','ITC','KOTAKBANK','HINDUNILVR','MARUTI','SUNPHARMA','TITAN','BAJFINANCE','TATASTEEL','WIPRO','M&M','NESTLEIND','ULTRACEMCO','ADANIENT','SBILIFE','AXISBANK','ASIANPAINT','HCLTECH','ADANIPORTS','COALINDIA','TATAMOTORS','BAJAJFINSV','DRREDDY','ONGC','CIPLA','BPCL','NTPC','POWERGRID','GRASIM','DIVISLAB','JSWSTEEL','HAL','ZOMATO','POLYCAB','DMART','SEPC','LUPIN','APOLLOHOSP','AUBANK','BANDHANBNK','INDUSIND','FEDERALBNK','VEDL','HINDALCO','IRCTC','TECHM','ABB','GODREJPRO'];
    const matches = common.filter(s => s.includes(upperQuery)).slice(0, 10).map(s => ({ symbol: s, name: s }));
    setSearchResults(matches);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchStocks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStocks]);

  const addToWatchlist = useCallback(async (symbol: string, name: string) => {
    if (watchlist.some(w => w.symbol === symbol)) return;
    
    const quote = await fetchStockQuote(symbol);
    const newItem: WatchlistItem = {
      symbol,
      name,
      ltp: quote?.ltp || 0,
      change: quote?.change || 0,
      percentChange: quote?.percentChange || 0,
      volume: quote?.volume || 0,
      timestamp: Date.now(),
    };
    
    setWatchlist(prev => [...prev, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  }, [watchlist, fetchStockQuote]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
  }, []);

  const { isConnected, isConnecting } = useSSE({
    onIndexUpdate: useCallback((data: IndexData[]) => {
      setIndices(data);
      setLoading(false);
    }, []),
    onBreadthUpdate: useCallback((data: MarketBreadth) => {
      setBreadth(data);
    }, []),
    onTickerUpdate: useCallback((data: StockQuote) => {
      setWatchlist(prev => prev.map(w => 
        w.symbol === data.symbol 
          ? { ...w, ltp: data.ltp, change: data.change, percentChange: data.percentChange, volume: data.volume, timestamp: Date.now() }
          : w
      ));
    }, []),
    onGainersUpdate: useCallback((data: GainerLoser[]) => {
      setGainers(data);
    }, []),
    onLosersUpdate: useCallback((data: GainerLoser[]) => {
      setLosers(data);
    }, []),
    onSectorsUpdate: useCallback((data: SectorData[]) => {
      setSectors(data);
    }, []),
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCopilotOpen(true); }
      if (e.key === 'Escape') { setActiveOverlay(null); setIsCopilotOpen(false); setChartData([]); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (activeOverlay === 'options') {
      fetch('/api/options?symbol=NIFTY')
        .then(res => res.json())
        .then(data => setOptionsChain(data))
        .catch(() => setOptionsChain(null));
    }
    if (activeOverlay === 'heatmap') {
      fetch(`/api/heatmap?view=${heatmapView}`)
        .then(res => res.json())
        .then(data => setHeatmapData(data))
        .catch(() => setHeatmapData(null));
    }
  }, [activeOverlay, heatmapView]);

  const FALLBACK_NEWS = [
    { title: "SEBI issues new guidelines for FII investments", link: "#", source: "Markets" },
    { title: "RBI retains repo rate, positive on inflation", link: "#", source: "Economy" },
    { title: "FII flow turns positive amid global cues", link: "#", source: "Capital" },
    { title: "Q3 earnings season begins with strong results", link: "#", source: "Results" },
  ];

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNewsData(data.slice(0, 7));
        } else {
          setNewsData(FALLBACK_NEWS);
        }
      })
      .catch(() => setNewsData(FALLBACK_NEWS));

    fetch('/api/sentiment')
      .then(res => res.json())
      .then(data => setSentiment(data))
      .catch(() => setSentiment(null));
      
    fetch('/api/institutional')
      .then(res => res.json())
      .then(data => setInstitutionalData(data))
      .catch(console.error);
  }, []);

  const openStockDetail = useCallback(async (stock: WatchlistItem) => {
    setSelectedStock(stock);
    setActiveOverlay('detail');
    setStockInsight({ text: "", loading: true });
    setChartLoading(true);
    
    try {
      const [chartRes, insightRes] = await Promise.all([
        fetch(`/api/history?symbol=${stock.symbol}&days=90`),
        callCopilotAPI(`Analyze ${stock.symbol} - give a 2-sentence professional summary of the move.`, `Symbol: ${stock.symbol}, Price: ${stock.ltp}, Change: ${stock.percentChange}%`)
      ]);
      
      if (chartRes.ok) {
        const chartData = await chartRes.json();
        if (chartData.candles) {
          const formatted = chartData.candles.map((c: any) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
          }));
          setChartData(formatted);
        }
      }
      setStockInsight({ text: insightRes.text, loading: false });
    } catch (err) {
      setStockInsight({ text: "Failed to load data", loading: false });
    }
    setChartLoading(false);
  }, []);

  const handleCopilotSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotQuery.trim()) return;
    
    setCopilotResponse({ text: "", loading: true, sources: [] });
    
    const context = `Current indices: ${indices.map(i => `${i.name}: ${i.value}`).join(', ')}. ${institutionalData ? `Institutional Flows (in Crores): FII Net ${institutionalData.fii.net}, DII Net ${institutionalData.dii.net}.` : ''}`;
    const res = await callCopilotAPI(copilotQuery, context);
    setCopilotResponse({ text: res.text, loading: false, sources: res.sources || [] });
  }, [copilotQuery, indices]);

  const totalAdvances = breadth?.advances || 1482;
  const totalDeclines = breadth?.declines || 512;
  const totalStocks = totalAdvances + totalDeclines + (breadth?.unchanged || 42);
  const advancePercent = totalStocks > 0 ? (totalAdvances / totalStocks) * 100 : 74;

  const displaySectors = sectors.length > 0 ? sectors : [
    { name: 'NIFTY BANK', symbol: 'BFSI', value: 45234, percentChange: 0.85 },
    { name: 'NIFTY IT', symbol: 'IT', value: 38145, percentChange: -1.2 },
    { name: 'NIFTY AUTO', symbol: 'AUTO', value: 23856, percentChange: 2.1 },
    { name: 'NIFTY FMCG', symbol: 'FMCG', value: 52134, percentChange: -0.4 },
    { name: 'NIFTY METAL', symbol: 'METAL', value: 8456, percentChange: 3.2 },
    { name: 'NIFTY PHARMA', symbol: 'PHARMA', value: 17892, percentChange: 0.2 },
    { name: 'NIFTY REALTY', symbol: 'REALTY', value: 756, percentChange: 1.5 },
    { name: 'NIFTY ENERGY', symbol: 'ENERGY', value: 28145, percentChange: -1.8 },
  ];

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-300 select-none overflow-hidden font-sans flex flex-col h-screen">
      <div className="flex-none px-2 lg:px-4 pt-2 lg:pt-4">
        <header className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pr-4">
            <div className="flex items-center gap-2 group cursor-pointer">
              <Zap size={20} className="text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-black italic tracking-tighter text-2xl text-white">ZENIT</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            {(indices.length > 0 ? indices : [
              { name: 'NIFTY 50', value: 22453.20, percentChange: 0.45 },
              { name: 'BANKNIFTY', value: 48120.50, percentChange: -0.25 },
              { name: 'NIFTY IT', value: 35640.10, percentChange: 1.28 },
              { name: 'SENSEX', value: 73920.40, percentChange: 0.32 },
            ]).map((idx: any, i: number) => (
              <div key={idx.name + i} className="flex flex-col min-w-max px-3 border-r border-white/5 last:border-none">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">{idx.name}</span>
                <div className="flex items-center gap-2">
                  <Mono className="text-white text-sm">{formatPrice(idx.value)}</Mono>
                  <span className={`text-[10px] font-black ${(idx.percentChange || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {(idx.percentChange || 0) > 0 ? '+' : ''}{(idx.percentChange || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
              <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_4px_#10b981]' : 'bg-zinc-500'}`} />
              <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-tighter">
                {isConnecting ? 'SYNCING' : isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <button 
              onClick={() => setIsCopilotOpen(true)} 
              className="p-2 hover:bg-white/5 rounded-md text-zinc-500 hover:text-amber-500 transition-colors"
              title="Cmd+K Copilot"
            >
              <Command size={16} />
            </button>
          </div>
        </header>
      </div>

      <main className="flex-1 w-full px-2 pb-2 lg:px-4 lg:pb-4 grid grid-cols-12 grid-rows-[repeat(11,minmax(0,1fr))] gap-2 lg:gap-3 overflow-hidden pt-1 lg:pt-2">
        <section className="col-span-12 lg:col-span-3 row-span-11 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col overflow-hidden">
          <WidgetHeader title="Terminal Monitor" icon={Activity} />
          <div className="relative mb-3">
             <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
             <input 
              type="text" 
              placeholder="Search master stocks..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-[11px] text-zinc-300 outline-none focus:border-amber-500/50 transition-all"
             />
             {searchQuery && (
               <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                 <X size={14} />
               </button>
             )}
          </div>

          {searchQuery && (
            <div className="mb-3 -mt-1 bg-zinc-900 border border-white/10 rounded-lg overflow-hidden">
              {searching ? (
                <div className="p-4 text-center text-xs text-zinc-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(result => (
                    <button
                      key={result.symbol}
                      onClick={() => addToWatchlist(result.symbol, result.name)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-500/10 border-b border-white/5 last:border-0 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-white">{result.symbol}</span>
                        <span className="text-[10px] text-zinc-500">{result.name}</span>
                      </div>
                      <Plus size={14} className="text-emerald-500" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-zinc-600">No stocks found</div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {watchlist.length === 0 && !searchQuery ? (
              <div className="text-center py-8">
                <Star size={24} className="mx-auto mb-2 text-zinc-700" />
                <p className="text-[11px] text-zinc-600">Your watchlist is empty</p>
                <p className="text-[9px] text-zinc-700 mt-1">Search above to add stocks</p>
              </div>
            ) : (
              watchlist.map((stock) => (
                <div 
                  key={stock.symbol} 
                  onClick={() => openStockDetail(stock)}
                  className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5 transition-all"
                >
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-amber-500 transition-colors tracking-tighter">{stock.symbol}</div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">{stock.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                       <Mono className={`text-sm ${stock.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{formatPrice(stock.ltp)}</Mono>
                       <div className={`text-[10px] font-black ${stock.percentChange >= 0 ? 'text-emerald-500/40' : 'text-rose-500/40'}`}>
                         {stock.percentChange > 0 ? '+' : ''}{stock.percentChange.toFixed(2)}%
                       </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromWatchlist(stock.symbol); }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="hidden lg:flex col-span-9 row-span-4 gap-3">
          <div className="flex-1 bg-zinc-900/20 border border-white/5 rounded-xl p-2 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Layers size={12} className="text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Market Heatmap</span>
                </div>
                <button 
                  onClick={() => setActiveOverlay('heatmap')}
                  className="text-[8px] text-zinc-500 hover:text-amber-500 uppercase font-bold"
                >
                  Open →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 grid-rows-2 gap-1 h-[calc(100%-24px)] p-1">
              {displaySectors.slice(0, 8).map((s: any, i: number) => {
                const pct = s.percentChange || 0;
                const isPos = pct > 0;
                const intensity = Math.min(Math.abs(pct) / 3, 1);
                const bg = isPos 
                  ? `rgba(16,185,129,${0.1 + intensity * 0.5})`
                  : `rgba(244,63,94,${0.1 + intensity * 0.5})`;
                return (
                  <div 
                    key={s.symbol || i} 
                    className="rounded border border-white/5 flex flex-col justify-center items-center hover:scale-105 transition-transform cursor-pointer"
                    style={{ background: bg }}
                    onClick={() => setActiveOverlay('heatmap')}
                  >
                    <span className="text-[8px] font-black text-zinc-300 truncate">{s.name}</span>
                    <Mono className={`text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </Mono>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="col-span-3 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
            <WidgetHeader title="Breadth Gauge" icon={BarChart3} />
            <div className="flex-1 flex flex-col justify-center gap-4 px-2">
               <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-500 uppercase">Advances</span>
                    <Mono className="text-xl text-emerald-400">{(breadth?.advances || totalAdvances).toLocaleString()}</Mono>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] font-black text-rose-500 uppercase">Declines</span>
                    <Mono className="text-xl text-rose-400">{(breadth?.declines || totalDeclines).toLocaleString()}</Mono>
                  </div>
               </div>
               <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-emerald-500" style={{ width: `${advancePercent}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${100 - advancePercent}%` }} />
               </div>
               <div className="text-center">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                   {advancePercent > 60 ? 'Bullish' : advancePercent < 40 ? 'Bearish' : 'Neutral'}
                 </span>
               </div>
            </div>
          </div>
        </section>

        <section className="hidden lg:flex col-span-4 row-span-4 gap-2">
          <div className="flex-1 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LineChart size={14} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Price Chart</span>
              </div>
            </div>
            <select 
              className="mb-3 bg-zinc-950 text-[9px] text-zinc-300 border border-white/10 rounded px-2 py-1.5"
              value={chartSymbol}
              onChange={async (e) => {
                const sym = e.target.value;
                if (!sym) return;
                setChartSymbol(sym);
                setChartLoading(true);
                try {
                  const res = await fetch(`/api/history?symbol=${sym}&days=90`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data.candles) {
                      setChartData(data.candles.map((c: any) => ({
                        time: c.time,
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close
                      })));
                    }
                  }
                } catch {}
                setChartLoading(false);
              }}
            >
              <option value="">Select Stock to Chart</option>
              {watchlist.map(w => (
                <option key={w.symbol} value={w.symbol}>{w.symbol}</option>
              ))}
            </select>
            <div className="flex-1 min-h-0">
              {chartLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-zinc-600" size={24} />
                </div>
              ) : chartData.length > 0 ? (
                <RealCandlestickChart data={chartData} height={250} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px]">
                  Select a stock to view chart
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="hidden lg:flex col-span-5 row-span-7 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex-col">
           <WidgetHeader title="Intelligence Hub" icon={Globe} />
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic flex items-center gap-1">
                      <Flame size={10} className="text-amber-500" /> Sentiment
                    </span>
                    <Mono className="text-[10px] font-bold text-emerald-500">
                      {sentiment?.label || 'GREED'} ({sentiment?.score || 68})
                    </Mono>
                 </div>
                 <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" style={{ width: `${sentiment?.score || 68}%` }} />
                 </div>
                 <div className="text-[8px] text-zinc-600 italic tracking-tighter">Market sentiment reflects aggressive buying.</div>
              </div>

              {/* FII / DII Flow Widget */}
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col justify-between">
                  <span className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                    <Globe size={8} /> FII Flow
                  </span>
                  <div className="mt-1 flex items-end justify-between">
                    <Mono className={`text-sm font-bold ${institutionalData && institutionalData.fii.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {institutionalData ? `${institutionalData.fii.net >= 0 ? '+' : ''}${institutionalData.fii.net}` : '---'}
                    </Mono>
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Cr</span>
                  </div>
                </div>
                <div className="flex-1 p-2 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col justify-between">
                  <span className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                    <Layers size={8} /> DII Flow
                  </span>
                  <div className="mt-1 flex items-end justify-between">
                    <Mono className={`text-sm font-bold ${institutionalData && institutionalData.dii.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {institutionalData ? `${institutionalData.dii.net >= 0 ? '+' : ''}${institutionalData.dii.net}` : '---'}
                    </Mono>
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Cr</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {newsData.map((n: any, i: number) => (
                  <a 
                    key={i} 
                    href={n.link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block border-l-2 border-zinc-800 pl-3 py-2 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer group"
                  >
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{n.source}</span>
                       <span className="text-[8px] text-zinc-600 font-bold">{(n.timestamp ? new Date(n.timestamp).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : 'Now')}</span>
                     </div>
                     <p className="text-[11px] leading-snug text-zinc-300 group-hover:text-white transition-colors line-clamp-2">{n.title}</p>
                  </a>
                ))}
              </div>
           </div>
           <button onClick={() => setIsCopilotOpen(true)} className="mt-auto w-full py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
             Analyze Today ✨
           </button>
        </section>

        <section className="hidden lg:flex col-span-4 row-span-3 gap-2">
          <div className="flex-1 bg-zinc-900/20 border border-white/5 rounded-xl p-2 overflow-hidden flex flex-col">
             <WidgetHeader title="Top Movers" icon={Target} extra={<select className="bg-zinc-950 text-[8px] text-zinc-500 border border-white/10 rounded px-1"><option>Gainers</option></select>} />
             <div className="space-y-1.5 mt-1 overflow-y-auto no-scrollbar">
                {(gainers.length > 0 ? gainers.slice(0, 5) : [
                  { symbol: 'COALINDIA', percentChange: 3.4, volume: 2800000 },
                  { symbol: 'HAL', percentChange: 1.2, volume: 2100000 },
                  { symbol: 'ZOMATO', percentChange: 4.5, volume: 45000000 }
                ]).map((item: any, i: number) => (
                  <div key={item.symbol + i} className="flex items-center justify-between p-1.5 bg-zinc-950/50 rounded border border-white/5 hover:border-amber-500/30 cursor-pointer">
                     <span className="text-[10px] font-black text-zinc-200">{item.symbol}</span>
                     <div className="flex items-center gap-2">
                        <Mono className={`text-[10px] font-bold ${item.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%
                        </Mono>
                        <div className="w-10 h-4 bg-zinc-800 rounded overflow-hidden">
                          <div className="h-full bg-emerald-500/60" style={{ width: `${Math.min(100, (item.percentChange + 2) * 20)}%` }} />
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
          <div className="w-32 bg-zinc-900/20 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
             <WidgetHeader title="NIFTY PCR" icon={Cpu} />
             <div className="flex-1 flex flex-col items-center justify-center">
               <Mono className="text-3xl font-black text-emerald-400">{optionsChain?.pcr || '1.2'}</Mono>
               <span className="text-[8px] text-zinc-600 mt-1">Max Pain: {optionsChain?.maxPain || '22.4K'}</span>
               <button onClick={() => setActiveOverlay('options')} className="text-[8px] text-zinc-500 hover:text-amber-500 mt-2">Details →</button>
             </div>
          </div>
        </section>

      </main>

      <MobileNav
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenOptions={() => setActiveOverlay('options')}
      />

      <AnimatePresence>
        {activeOverlay === 'detail' && selectedStock && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveOverlay(null)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full lg:w-[500px] bg-zinc-950 border-l border-white/10 z-[60] p-8 overflow-y-auto shadow-2xl no-scrollbar"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">{selectedStock.symbol}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded font-black text-zinc-400 uppercase tracking-widest">{selectedStock.name}</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">NSE Real-time Feed</span>
                  </div>
                </div>
                <button onClick={() => { setActiveOverlay(null); setChartData([]); }} className="p-2 hover:bg-white/5 rounded-full transition-all text-zinc-500 hover:text-white"><X size={28} /></button>
              </div>

              <div className="space-y-10">
                <div className="space-y-3">
                  <WidgetHeader title="Technical Signature" icon={LineChart} />
                  {chartLoading ? (
                    <div className="w-full h-[320px] bg-zinc-900/40 rounded-lg border border-white/5 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-2 text-zinc-600" size={24} />
                        <span className="text-xs text-zinc-500">Loading chart...</span>
                      </div>
                    </div>
                  ) : (
                    <RealCandlestickChart data={chartData} height={320} />
                  )}
                </div>

                <div className="p-6 bg-zinc-900/40 border border-amber-500/20 rounded-2xl relative overflow-hidden">
                  <WidgetHeader title="Intelligence Reasoning" icon={Zap} />
                  {stockInsight.loading ? (
                    <div className="flex items-center gap-3 py-6 text-zinc-500 italic text-sm">
                      <Loader2 className="animate-spin" size={18} /> 
                      <span className="tracking-tight uppercase font-black text-[10px] opacity-60">Synthesizing liquidity map...</span>
                    </div>
                  ) : (
                    <p className="text-base text-zinc-300 leading-relaxed italic border-l-4 border-amber-500/40 pl-6">
                      "{stockInsight.text}"
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: 'Last Price', value: formatPrice(selectedStock.ltp), color: selectedStock.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                     { label: 'Day Change', value: `${selectedStock.percentChange.toFixed(2)}%`, color: selectedStock.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                     { label: 'Change', value: `${selectedStock.change >= 0 ? '+' : ''}${formatPrice(selectedStock.change)}`, color: selectedStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                     { label: 'Volume', value: (selectedStock.volume / 1000000).toFixed(1) + 'M', color: 'text-white' }
                   ].map((f, i) => (
                     <div key={f.label + i} className="p-4 bg-zinc-900/20 border border-white/5 rounded-xl">
                        <div className="text-[10px] text-zinc-600 font-black uppercase mb-1 tracking-widest">{f.label}</div>
                        <Mono className={`text-xl font-bold ${f.color}`}>{f.value}</Mono>
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeOverlay === 'options' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveOverlay(null)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-white/10">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter">NIFTY OPTIONS MATRIX</h3>
                  {optionsChain && (
                    <div className="flex gap-4 mt-2">
                      <span className="text-[10px] font-bold text-zinc-500">SPOT: <span className="text-emerald-500">{formatPrice(optionsChain.spotPrice || 0)}</span></span>
                      <span className="text-[10px] font-bold text-zinc-500">PCR: <span className={optionsChain.pcr > 1 ? 'text-emerald-500' : 'text-rose-500'}>{optionsChain.pcr}</span></span>
                      <span className="text-[10px] font-bold text-zinc-500">MAX PAIN: <span className="text-amber-500">{optionsChain.maxPain}</span></span>
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveOverlay(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                  <X size={32} className="text-zinc-600 hover:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {!optionsChain ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Activity size={32} className="mx-auto mb-2 text-zinc-700 animate-pulse" />
                      <p className="text-zinc-600 text-sm">Fetching options data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-max">
                    <div className="grid grid-cols-7 gap-1 p-4 bg-zinc-900/50 border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                      <div className="text-center">CE OI</div>
                      <div className="text-center">CE Chg</div>
                      <div className="text-center">CE LTP</div>
                      <div className="text-center bg-amber-500/10 text-amber-500">STRIKE</div>
                      <div className="text-center">PE LTP</div>
                      <div className="text-center">PE Chg</div>
                      <div className="text-center">PE OI</div>
                    </div>
                    {optionsChain.strikes?.map((s: any, i: number) => {
                      const isATM = Math.abs(s.strike - optionsChain.spotPrice) < 25;
                      return (
                        <div key={s.strike + i} className={`grid grid-cols-7 gap-1 p-3 border-b border-white/5 text-[10px] font-mono hover:bg-white/5 transition-colors ${isATM ? 'bg-emerald-500/5' : ''}`}>
                          <div className="text-center text-emerald-400">{(s.ce?.oi / 1000).toFixed(0)}K</div>
                          <div className={`text-center ${(s.ce?.oiChange || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(s.ce?.oiChange || 0) > 0 ? '+' : ''}{(s.ce?.oiChange / 1000).toFixed(0)}K</div>
                          <div className="text-center text-white">₹{(s.ce?.ltp || 0).toFixed(2)}</div>
                          <div className={`text-center font-black ${isATM ? 'text-amber-500 bg-amber-500/10 rounded px-2 py-1' : 'text-zinc-400'}`}>{s.strike.toLocaleString()}</div>
                          <div className="text-center text-white">₹{(s.pe?.ltp || 0).toFixed(2)}</div>
                          <div className={`text-center ${(s.pe?.oiChange || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(s.pe?.oiChange || 0) > 0 ? '+' : ''}{(s.pe?.oiChange / 1000).toFixed(0)}K</div>
                          <div className="text-center text-rose-400">{(s.pe?.oi / 1000).toFixed(0)}K</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeOverlay === 'heatmap' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveOverlay(null)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-4 lg:inset-12 bg-zinc-900 border border-white/10 rounded-2xl z-[60] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Layers size={20} className="text-amber-500" />
                  <h3 className="text-xl font-black text-white italic">Market Heatmap</h3>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    className="bg-zinc-950 border border-white/10 rounded text-xs text-zinc-400 px-3 py-1.5 uppercase font-bold"
                    onChange={async (e) => {
                      setHeatmapView(e.target.value as any);
                      setHeatmapData(null);
                      try {
                        const res = await fetch(`/api/heatmap?view=${e.target.value}`);
                        if (res.ok) {
                          const data = await res.json();
                          setHeatmapData(data);
                        }
                      } catch (err) {
                        console.warn('Heatmap fetch failed:', err);
                      }
                    }}
                    value={heatmapView}
                  >
                    <option value="sectors">Sectors</option>
                    <option value="nifty50">Nifty 50</option>
                    <option value="banknifty">Bank Nifty</option>
                    <option value="sensex">Sensex</option>
                  </select>
                  <button onClick={() => setActiveOverlay(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                    <X size={24} className="text-zinc-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                {!heatmapData ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Activity size={32} className="mx-auto mb-2 text-zinc-700 animate-pulse" />
                      <p className="text-zinc-600 text-sm">Loading heatmap data...</p>
                    </div>
                  </div>
                ) : (
                  <StockHeatmap data={heatmapData} onStockClick={(sym: string) => {
                    setActiveOverlay(null);
                    const stock = watchlist.find(w => w.symbol === sym);
                    if (stock) openStockDetail(stock);
                  }} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCopilotOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCopilotOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <form onSubmit={handleCopilotSubmit} className="flex items-center gap-4 p-6 border-b border-white/5 bg-zinc-950/50">
                <Command className="text-zinc-600" size={24} />
                <input 
                  autoFocus 
                  value={copilotQuery} 
                  onChange={(e) => setCopilotQuery(e.target.value)} 
                  placeholder="Ask Terminal Intelligence..." 
                  className="flex-1 bg-transparent border-none outline-none text-xl text-white placeholder-zinc-700 font-light" 
                />
                <button type="submit" className="p-3 text-amber-500 bg-amber-500/10 rounded-xl hover:bg-amber-500/20 transition-all">
                  <SendHorizontal size={20} />
                </button>
              </form>
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar min-h-[350px]">
                {copilotResponse.loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-5 text-zinc-600 py-24">
                    <Loader2 className="animate-spin" size={48} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Consulting Market Intelligence...</span>
                  </div>
                ) : copilotResponse.text ? (
                  <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-zinc-300 font-light text-lg">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <Bot size={18} />
                        </div>
                        <div className="flex-1 space-y-4">
                          {copilotResponse.text.split('\n').map((line, i) => {
                            if (!line.trim()) return null;
                            const isListItem = line.trim().startsWith('- ') || line.trim().match(/^\d+\.\s/);
                            
                            // Split line by **text**
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            
                            return (
                              <p key={i} className={`leading-relaxed ${isListItem ? 'pl-4 relative before:content-["•"] before:absolute before:left-0 before:text-amber-500' : ''}`}>
                                {parts.map((part, j) => 
                                  part.startsWith('**') && part.endsWith('**') 
                                    ? <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong> 
                                    : part.replace(/^- |\d+\.\s/, '') // Remove list markers if we use custom bullets
                                )}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {copilotResponse.sources?.length > 0 && (
                      <div className="border-t border-white/10 pt-4">
                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Sources</div>
                        <div className="flex flex-wrap gap-2">
                          {copilotResponse.sources.map((s, i) => (
                            <a 
                              key={i}
                              href={s.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-zinc-500 hover:text-amber-500 flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              {s.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em]">Common Market Commands</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        "Why is the IT sector dragging today?",
                        "Analyze Nifty F&O sentiment and PCR",
                        "Is HDFC Bank showing a delivery breakout?",
                        "Summarize current FII/DII flow synthesis"
                      ].map((s, i) => (
                        <button 
                          key={s + i}
                          type="button" 
                          onClick={() => { setCopilotQuery(s); handleCopilotSubmit(); }} 
                          className="flex items-center gap-4 p-6 bg-zinc-950 border border-white/5 rounded-2xl hover:border-amber-500/50 text-left transition-all"
                        >
                          <Zap size={16} className="text-zinc-700" />
                          <span className="text-[13px] text-zinc-500 font-medium">{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}