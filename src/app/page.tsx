"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { formatNumber } from '@/lib/utils';
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
  Minus,
  Bell,
  Maximize2,
  Minimize2,
  Users,
  Gauge,
  BarChart2,
  Building2,
  Landmark,
  Calendar,
  PieChart
} from 'lucide-react';
import { StartupLoading } from "@/components/startup-loading";
import { motion, AnimatePresence } from 'framer-motion';
import { MarketProvider, useMarket } from "@/contexts/MarketContext";
import { OverlayProvider, useOverlay } from "@/contexts/OverlayContext";
import { usePaperTrading } from "@/hooks/usePaperTrading";
import { MobileNav, MobileTab, MobileView } from "@/components/mobile-nav";
import type { StockQuote } from "@/types/market";
import type { LucideIcon } from "lucide-react";
import { getLotSize, isFOStock, toLots, fromLots } from "@/lib/fo-lots";
import { OptionsChain } from "@/components/options-chain";
import { SentimentGauge } from "@/components/sentiment-gauge";
import { OIWall } from "@/components/oi-wall";
import { EarningsContent } from "@/components/EarningsWidget";
import { CorporateActionsContent } from "@/components/CorporateActionsWidget";
import { EconomicCalendarContent } from "@/components/EconomicCalendarWidget";
import { DockPanel } from "@/components/dock-panel";
import { Mono } from "@/components/ui/mono";
import { WidgetHeader } from "@/components/ui/widget-header";
import { VIXCard } from "@/components/widgets/vix-card";
import { FlowCard } from "@/components/widgets/flow-card";
import { InstitutionalCard } from "@/components/widgets/institutional-card";
import { SectorFlowsCard } from "@/components/widgets/sector-flows-card";
import { InstitutionalHistoryCard } from "@/components/widgets/institutional-history-card";
import { FXRatesCard } from "@/components/widgets/fx-rates-card";
import { RBIRatesCard } from "@/components/widgets/rbi-rates-card";
import { MacroIndicatorsCard } from "@/components/widgets/macro-indicators-card";
import { GridProvider, useGrid } from "@/contexts/GridContext";
import { PinnedStrip } from "@/components/pinned-strip";
import { ScrollSection } from "@/components/mobile/scroll-section";
import { QuickJumpBar } from "@/components/mobile/quick-jump-bar";

const WATCHLIST_KEY = "zenit:watchlist";

type DesktopView = "overview" | "fo" | "institutional" | "earnings" | "macro";

const DESKTOP_VIEWS: { id: DesktopView; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "fo", label: "F&O", icon: BarChart3 },
  { id: "institutional", label: "Institutional", icon: Building2 },
  { id: "earnings", label: "Earnings", icon: Calendar },
  { id: "macro", label: "Macro", icon: Globe },
];

const formatPrice = (val: number) => {
  if (typeof val !== 'number' || isNaN(val)) return "0.00";
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const data = await res.json();
    if (res.ok) {
      return { text: data.response || "No response generated.", sources: data.sources || [] };
    } else {
      return { text: data.response || "AI service error occurred.", error: true };
    }
  } catch (err) {
    console.error("Copilot API error:", err);
    return { text: "Network error connecting to Intelligence Engine.", error: true };
  }
}

function AppContent({ tickerRef }: { tickerRef: React.MutableRefObject<((data: StockQuote) => void) | null> }) {
  const { indices, breadth, gainers, losers, sectors, sentiment, setSentiment, screenerSignals, isConnected, isConnecting, lastUpdate, loading } = useMarket();
  const overlay = useOverlay();
  const { selectedStockSymbol, selectStock } = useGrid();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [heatmapView, setHeatmapView] = useState<"sectors" | "nifty50" | "banknifty" | "sensex">("sectors");
  const [selectedStock, setSelectedStock] = useState<WatchlistItem | null>(null);
  const [activeDock, setActiveDock] = useState<DesktopView | null>(null);
  
  const [stockInsight, setStockInsight] = useState({ text: "", loading: false });
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotResponse, setCopilotResponse] = useState<{ text: string; loading: boolean; sources: { uri: string; title: string }[] }>({ text: "", loading: false, sources: [] });
  
  const [optionsChain, setOptionsChain] = useState<any>(null);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [institutionalData, setInstitutionalData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string>("");

  const {
    balance, positions, pendingOrders,
    orderType, setOrderType,
    limitPrice, setLimitPrice,
    stopLossPrice, setStopLossPrice,
    useLots, setUseLots,
    tradeQty, setTradeQty,
    alerts, alertInput, setAlertInput,
    executeTrade, addAlert, cancelOrder, removeAlert, handleTickerUpdate: handlePaperTickerUpdate,
  } = usePaperTrading();
  const [isInitializing, setIsInitializing] = useState(false);
  const [macroData, setMacroData] = useState({ usdInr: 0, bondYield: 0, vix: 14 });
  const [orderFlow, setOrderFlow] = useState({ buyDelta: 0, sellDelta: 0, callIV: 0, putIV: 0 });
  const [correlations, setCorrelations] = useState({ itNasdaq: 0, itUsd: 0, bankYield: 0, vixNifty: 0 });
  const [keyLevels, setKeyLevels] = useState({ support: 0, resistance: 0, pivot: 0, maxPain: 0, pcr: '0' });

  // Export functions
  const exportWatchlist = useCallback(async () => {
    try {
      const response = await fetch('/api/export/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist, positions }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zennit-watchlist-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export watchlist error:', error);
      alert('Failed to export watchlist');
    }
  }, [watchlist, positions]);

  const exportFIIDIIData = useCallback(async (days: number = 30) => {
    try {
      const response = await fetch(`/api/export/fii-dii?days=${days}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zennit-fii-dii-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export FII/DII error:', error);
      alert('Failed to export FII/DII data');
    }
  }, []);

  const exportStockHistory = useCallback(async (symbol: string, range: string = '1mo', interval: string = '1d') => {
    try {
      const response = await fetch(`/api/export/stock-history?symbol=${symbol}&range=${range}&interval=${interval}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zennit-${symbol}-${range}-${interval}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export stock history error:', error);
      alert('Failed to export stock history');
    }
  }, []);
  
  // Startup loading handled via state, no automatic initialization

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
      const res = await fetch(`/api/quote?symbol=${symbol}&refresh=true`);
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

  const handleTickerUpdate = useCallback((data: StockQuote) => {
    setWatchlist(prev => prev.map(w =>
      w.symbol === data.symbol
        ? { ...w, ltp: data.ltp, change: data.change, percentChange: data.percentChange, volume: data.volume, timestamp: Date.now() }
        : w
    ));
    handlePaperTickerUpdate(data);
  }, [handlePaperTickerUpdate]);
  tickerRef.current = handleTickerUpdate;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); overlay.push('copilot'); }
      if (e.key === 'Escape') { overlay.closeAll(); setChartData([]); selectStock(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (overlay.isOpen('options')) {
      fetch('/api/options?symbol=NIFTY')
        .then(res => res.json())
        .then(data => setOptionsChain(data))
        .catch(() => setOptionsChain(null));
    }
    if (overlay.isOpen('heatmap')) {
      const fetchHeatmap = () => {
        fetch(`/api/heatmap?view=${heatmapView}`)
          .then(res => res.json())
          .then(data => setHeatmapData(data))
          .catch(() => setHeatmapData(null));
      };
      fetchHeatmap();
      const heatmapRefresh = setInterval(fetchHeatmap, 60000);
      return () => clearInterval(heatmapRefresh);
    }
  }, [overlay, heatmapView]);



  useEffect(() => {
    const fetchNews = () => {
      fetch('/api/news?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setNewsData(data.slice(0, 12));
          } else {
            setNewsData([]);
          }
        })
        .catch(() => {});
    };

    fetchNews();
    const newsInterval = setInterval(fetchNews, 30000); // Refresh every 30s

    fetch('/api/sentiment')
      .then(res => res.json())
      .then(data => setSentiment(data))
      .catch(() => setSentiment(null));
      
    fetch('/api/institutional')
      .then(res => res.json())
      .then(data => setInstitutionalData(data))
      .catch(console.error);

    // Fetch macro data from our API
    fetch('/api/macro')
      .then(res => res.json())
      .then(data => {
        if (data.vix?.value) setMacroData(prev => ({ ...prev, vix: parseFloat(data.vix.value) }));
        if (data.usdInr) setMacroData(prev => ({ ...prev, usdInr: parseFloat(data.usdInr) }));
        if (data.correlations) setCorrelations(data.correlations);
      })
      .catch(() => {});

    // Fetch options chain for real PCR and IV data
    fetch('/api/options?symbol=NIFTY')
      .then(res => res.json())
      .then(data => {
        if (data.pcr) setOrderFlow(prev => ({ ...prev, callIV: 18, putIV: parseFloat(data.pcr) * 18 }));
      })
      .catch(() => {});

    // Fetch FII/DII for order flow delta
    fetch('/api/institutional')
      .then(res => res.json())
      .then(data => {
        const pcrVal = data.pcr || 1;
        setOrderFlow(prev => ({ 
          ...prev, 
          buyDelta: Math.round((data.fii?.net || 0) / 100),
          sellDelta: Math.round((data.dii?.net || 0) / 100),
          callIV: parseFloat(pcrVal) > 1 ? 15 : 22,
          putIV: parseFloat(pcrVal) < 1 ? 15 : 22
        }));
      })
      .catch(() => {});

    fetch('/api/levels?symbol=NIFTY')
      .then(res => res.json())
      .then(data => {
        if (data.underlying) {
          setKeyLevels({ 
            support: data.support || 0, 
            resistance: data.resistance || 0, 
            pivot: data.underlying || 0,
            maxPain: data.maxPain || 0,
            pcr: data.pcr || '0'
          });
          setMacroData(prev => ({ ...prev, vix: data.pcr ? parseFloat(data.pcr) * 15 : 14 }));
        }
      })
      .catch(() => {});

    fetch('/api/macro')
      .then(res => res.json())
      .then(data => {
        if (data.correlations) {
          setCorrelations(data.correlations);
        }
      })
      .catch(() => {});

    fetch('/api/levels?symbol=NIFTY')
      .then(res => res.json())
      .then(data => {
        if (data.underlying) {
          setKeyLevels({ 
            support: data.support || 0, 
            resistance: data.resistance || 0, 
            pivot: data.underlying || 0,
            maxPain: data.maxPain || 0,
            pcr: data.pcr || '0'
          });
        }
      })
      .catch(() => {});

    // 30 second refresh for live data
    const refreshInterval = setInterval(() => {
      fetch('/api/macro')
        .then(res => res.json())
        .then(data => {
          if (data.vix?.value) {
            setMacroData(prev => ({ ...prev, vix: data.vix.value }));
          }
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const openStockDetail = useCallback(async (stock: WatchlistItem) => {
    setSelectedStock(stock);
    selectStock(stock.symbol);
    overlay.push('detail');
    setStockInsight({ text: "", loading: true });
    setChartLoading(true);
    
    // Fetch chart and insight independently to prevent blocking
    fetch(`/api/history?symbol=${stock.symbol}&days=90`)
      .then(async (res) => {
        if (res.ok) {
          const history = await res.json();
          if (history.candles && Array.isArray(history.candles)) {
            setChartData(history.candles);
          }
        }
      })
      .catch(err => console.error("Chart fetch error:", err))
      .finally(() => setChartLoading(false));

    callCopilotAPI(
      `Analyze ${stock.symbol} - give a 2-sentence professional summary of the move.`, 
      `Symbol: ${stock.symbol}, Price: ${stock.ltp}, Change: ${stock.percentChange}%`
    ).then(res => {
      setStockInsight({ text: res.text, loading: false });
    }).catch(err => {
      setStockInsight({ text: "Insight currently unavailable", loading: false });
    });
  }, [selectedStock]);

  const handleCopilotSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotQuery.trim()) return;
    
    setCopilotResponse({ text: "", loading: true, sources: [] });
    
    const context = `
      Current Indices: ${indices.map(i => i.name + ': ' + i.value + ' (' + (i.percentChange || 0).toFixed(2) + '%)').join(', ')}.
      Market Sentiment Score: ${sentiment?.score || 50} (${sentiment?.label || 'Neutral'}).
      ${institutionalData?.fii ? 'Institutional flows (in Cr): FII ' + (institutionalData.fii.net || 0) + ', DII ' + (institutionalData.dii.net || 0) + '.' : ''}
      Portfolio Balance: ₹${balance.toLocaleString()}.
      Current Watchlist: ${watchlist.map(w => w.symbol).join(', ')}.
    `.trim();

    const res = await callCopilotAPI(copilotQuery, context);
    setCopilotResponse({ text: res.text, loading: false, sources: res.sources || [] });
  }, [copilotQuery, indices, institutionalData, balance, sentiment, watchlist]);


  const totalAdvances = breadth?.advances || 0;
  const totalDeclines = breadth?.declines || 0;
  const totalStocks = totalAdvances + totalDeclines + (breadth?.unchanged || 0);
  const advancePercent = totalStocks > 0 ? (totalAdvances / totalStocks) * 100 : 0;

  const displaySectors = sectors;

  return (
    <AnimatePresence mode="wait">
      {isInitializing ? (
        <StartupLoading key="loading" />
      ) : (
        <motion.div 
          key="dashboard"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 bg-zinc-950 text-zinc-300 select-none overflow-hidden font-sans flex flex-col h-screen"
        >
          <div className="flex-none px-2 lg:px-4">
            <header className="flex items-center justify-between border-b border-white/5 py-1">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pr-4">
             <div className="flex items-center gap-2 group cursor-pointer shrink-0 ml-4">
               <img src="/icons/logo.png" alt="ZENIT Logo" className="w-7 h-7 object-contain group-hover:scale-110 transition-transform" />
             </div>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            {indices.map((idx: any, i: number) => (
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
            <div className="flex items-center gap-0.5 bg-zinc-900/60 rounded-lg border border-white/5 p-0.5">
              {DESKTOP_VIEWS.map(view => {
                const Icon = view.icon;
                const isActive = view.id === "overview" ? activeDock === null : activeDock === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => {
                      if (view.id === "overview") {
                        setActiveDock(null);
                      } else {
                        setActiveDock(prev => prev === view.id ? null : view.id);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                        : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon size={10} />
                    {view.label}
                  </button>
                );
              })}
            </div>
            <div className="h-5 w-[1px] bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
              <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_4px_#10b981]' : 'bg-zinc-500'}`} />
              <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-tighter">
                {isConnecting ? 'SYNCING' : isConnected ? 'LIVE · 5s' : 'POLLING'}
              </span>
            </div>
            {lastUpdate > 0 && (
              <span className="text-[8px] font-mono text-zinc-600 tabular-nums">
                {new Date(lastUpdate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            )}
            <button 
              onClick={() => overlay.push('copilot')} 
              className="p-2 hover:bg-white/5 rounded-md text-zinc-500 hover:text-amber-500 transition-colors"
              title="Cmd+K Copilot"
            >
              <Command size={16} />
            </button>
          </div>
        </header>
      </div>

      <div className="hidden lg:block px-4 shrink-0">
        <PinnedStrip />
      </div>

      <main className="flex-1 w-full px-2 pb-2 lg:px-4 lg:pb-4 flex flex-col lg:grid lg:grid-cols-12 lg:auto-rows-fr gap-2 lg:gap-3 overflow-y-auto lg:overflow-hidden pt-1 lg:pt-2 mb-16 lg:mb-0">

      {/* Mobile quick jump bar */}
      <div className="lg:hidden">
        <QuickJumpBar />
      </div>

      {/* ── Overview view (always rendered) ── */}
      {(<>
        <section className="lg:col-span-3 lg:row-span-11 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0">
<WidgetHeader 
              title="Terminal Monitor" 
              icon={Activity} 
              onExpand={() => overlay.push('expanded', { section: 'Watchlist' })}
              extra={
                <button
                  onClick={exportWatchlist}
                  className="p-1.5 hover:bg-white/5 rounded text-zinc-600 hover:text-amber-500 transition-colors"
                  title="Export Watchlist (CSV)"
                >
                  <ExternalLink size={12} />
                </button>
              }
            />
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
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg">
                    <div>
                      <div className="h-3 w-12 bg-zinc-800/50 animate-pulse rounded mb-1" />
                      <div className="h-2 w-20 bg-zinc-800/30 animate-pulse rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-14 bg-zinc-800/50 animate-pulse rounded" />
                      <div className="h-3 w-10 bg-zinc-800/30 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : watchlist.length === 0 && !searchQuery ? (
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
          <div className="bg-zinc-950/50 border-t border-white/10 p-4 shrink-0 flex flex-col gap-3">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1"><Wallet size={12}/> Paper Portfolio</span>
                 <div className="flex items-center gap-2">
                   <Mono className="text-sm font-bold text-emerald-400">₹{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Mono>
                   <button onClick={() => overlay.push('expanded', { section: 'Portfolio' })} className="text-zinc-700 hover:text-amber-500 transition-colors" title="Expand"><Maximize2 size={10} /></button>
                 </div>
               </div>
               <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar">
                 {positions.map(p => {
                   const pnl = (p.currentPrice - p.avgPrice) * p.quantity;
                   const pnlPct = (pnl / (p.avgPrice * p.quantity)) * 100;
                   const lotInfo = p.lotSize ? ` (${toLots(p.quantity, p.symbol)} lots)` : '';
                   return (
                     <div key={p.symbol} onClick={() => openStockDetail({symbol: p.symbol, name: p.symbol, ltp: p.currentPrice, change: 0, percentChange: 0, timestamp: 0, volume: 0})} className="flex justify-between items-center p-2 bg-zinc-900 rounded border border-white/5 cursor-pointer hover:border-amber-500/30">
                       <div>
                         <span className="text-xs font-bold text-white block">{p.symbol}</span>
                         <span className="text-[9px] text-zinc-500">{p.quantity}{lotInfo} @ {p.avgPrice.toFixed(1)}</span>
                       </div>
                       <div className="text-right">
                         <Mono className={`text-xs font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}
                         </Mono>
                         <span className={`text-[9px] font-bold block ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                           ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                         </span>
                       </div>
                     </div>
                   )
                 })}
               </div>

               {/* Pending Orders Section */}
               {pendingOrders.filter(o => o.status === "pending").length > 0 && (
                 <div className="mt-3 pt-3 border-t border-white/5">
                   <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-1">
                     <Target size={10} /> Pending Orders ({pendingOrders.filter(o => o.status === "pending").length})
                   </div>
                   <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                     {pendingOrders.filter(o => o.status === "pending").map(order => (
                       <div key={order.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-amber-500/20">
                         <div>
                           <span className={`text-[10px] font-bold ${order.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {order.type.toUpperCase()} {order.orderType === "stop-loss" ? "SL" : order.orderType === "target" ? "TGT" : ""}
                           </span>
                           <span className="text-[10px] text-white ml-2">{order.symbol}</span>
                           <span className="text-[9px] text-zinc-500 ml-1">×{order.quantity}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] text-amber-500 font-mono">₹{order.triggerPrice?.toFixed(2)}</span>
                           <button
                             onClick={() => cancelOrder(order.id)}
                             className="text-zinc-600 hover:text-rose-400 transition-colors"
                           >
                             <X size={10} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
           </div>
        </section>

        <section className="lg:col-span-9 lg:row-span-4 gap-3 flex flex-col lg:flex-row">
          <div className="flex-1 bg-zinc-900/20 border border-white/5 rounded-xl p-2 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Layers size={12} className="text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Market Heatmap</span>
                </div>
                <button 
                  onClick={() => overlay.push('heatmap')}
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
                    onClick={() => overlay.push('heatmap')}
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
            <WidgetHeader title="Breadth Gauge" icon={BarChart3} onExpand={() => overlay.push('expanded', { section: 'Breadth Gauge' })} />
            {loading ? (
              <div className="flex-1 flex flex-col justify-center gap-4 px-2">
                <div className="flex justify-between">
                  <div className="h-8 w-16 bg-zinc-800/50 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-zinc-800/50 animate-pulse rounded" />
                </div>
                <div className="h-3 w-full bg-zinc-800/30 animate-pulse rounded" />
                <div className="h-3 w-20 mx-auto bg-zinc-800/30 animate-pulse rounded" />
              </div>
            ) : (
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
            )}
          </div>
        </section>

        <section className={`gap-2 ${selectedStockSymbol ? 'lg:col-span-6 lg:row-span-5' : 'lg:col-span-4 lg:row-span-4'} flex flex-col min-h-[300px] lg:min-h-0`}>
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
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative mt-1 bg-zinc-950/20 rounded-lg">
              {chartLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-zinc-600" size={24} />
                </div>
              ) : chartData.length > 0 ? (
                <RealCandlestickChart data={chartData} height={selectedStockSymbol ? 300 : 200} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] italic">
                  Select a stock to generate chart
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-5 lg:row-span-7 bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col min-h-[400px] lg:min-h-0">
           <WidgetHeader title="Intelligence Hub" icon={Globe} onExpand={() => overlay.push('expanded', { section: 'Intelligence Hub' })} />
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
              <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic flex items-center gap-1">
                      <Flame size={10} className="text-amber-500" /> Sentiment
                    </span>
                    <Mono className={`font-bold ${
                      (sentiment?.score ?? 50) >= 60 ? 'text-emerald-400' :
                      (sentiment?.score ?? 50) <= 40 ? 'text-rose-400' :
                      'text-amber-400'
                    }`}>
                      {sentiment ? `${sentiment.label} (${sentiment.score})` : 'NEUTRAL (50)'}
                    </Mono>
                 </div>
                 <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (sentiment?.score ?? 50) >= 60 ? 'bg-emerald-500' :
                        (sentiment?.score ?? 50) <= 40 ? 'bg-rose-500' :
                        'bg-amber-500'
                      }`}
                      style={{ width: `${sentiment?.score || 50}%` }}
                    />
                 </div>
                 <div className="text-[8px] text-zinc-600 italic tracking-tighter">
                   {sentiment?.description || 'Loading market data...'}
                 </div>
              </div>

              {/* FII / DII Flow Widget */}
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col justify-between">
                  <span className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                    <Globe size={8} /> FII Flow
                  </span>
                  <div className="mt-1 flex items-end justify-between">
                    <Mono className={`text-sm font-bold ${institutionalData?.fii?.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {institutionalData?.fii ? `${institutionalData.fii.net >= 0 ? '+' : ''}${institutionalData.fii.net}` : '---'}
                    </Mono>
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Cr</span>
                  </div>
                </div>
                <div className="flex-1 p-2 bg-zinc-950/40 border border-white/5 rounded-lg flex flex-col justify-between">
                  <span className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                    <Layers size={8} /> DII Flow
                  </span>
                  <div className="mt-1 flex items-end justify-between">
                    <Mono className={`text-sm font-bold ${institutionalData?.dii?.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {institutionalData?.dii ? `${institutionalData.dii.net >= 0 ? '+' : ''}${institutionalData.dii.net}` : '---'}
                    </Mono>
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest mb-1.5">Cr</span>
                  </div>
                </div>
              </div>

              {/* Live Screener */}
              {screenerSignals.length > 0 && (
                <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                    <Zap size={8} /> Live Screener
                  </span>
                  <div className="space-y-1">
                    {screenerSignals.slice(0, 4).map((sig: any, i: number) => (
                      <div key={sig.symbol + i} className="flex items-center justify-between text-[9px] gap-2">
                        <span className="font-black text-zinc-200 w-16 truncate">{sig.symbol}</span>
                        <span className="text-zinc-500 text-[8px] w-20 truncate">{sig.type}</span>
                        <Mono className={`text-right ${sig.percentChange >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'} w-12`}>
                          {sig.percentChange >= 0 ? '+' : ''}{sig.percentChange.toFixed(1)}%
                        </Mono>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Alerts */}
              <div className="p-2 bg-zinc-950/40 border border-white/5 rounded-lg">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <Bell size={8} /> Price Alerts
                </span>
                <div className="flex gap-1 mb-2">
                  <input
                    placeholder="SYMBOL"
                    value={alertInput.symbol}
                    onChange={e => setAlertInput(prev => ({ ...prev, symbol: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[9px] text-white outline-none focus:border-amber-500/50"
                  />
                  <input
                    placeholder="₹ Price"
                    type="number"
                    value={alertInput.price}
                    onChange={e => setAlertInput(prev => ({ ...prev, price: e.target.value }))}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[9px] text-white outline-none focus:border-amber-500/50"
                  />
                  <button onClick={() => {
                    const sym = alertInput.symbol.toUpperCase();
                    const existing = positions.find(p => p.symbol === sym) || watchlist.find(w => w.symbol === sym);
                    const currentPrice = existing ? (existing as any).ltp ?? (existing as any).currentPrice ?? 0 : 0;
                    addAlert(currentPrice);
                  }} className="px-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded text-[9px] font-black hover:bg-amber-500/30 transition-all">
                    +
                  </button>
                </div>
                <div className="space-y-1 max-h-[60px] overflow-y-auto no-scrollbar">
                  {alerts.map((a, i) => (
                    <div key={i} className={`flex items-center justify-between text-[8px] px-1 rounded ${a.triggered ? 'opacity-40' : ''}`}>
                      <span className="font-black text-zinc-300">{a.symbol}</span>
                      <span className="text-zinc-500">{a.condition === 'above' ? '↑' : '↓'} ₹{a.targetPrice}</span>
                      <span className={a.triggered ? 'text-zinc-600' : 'text-amber-500'}>{a.triggered ? 'TRIGGERED' : 'WATCHING'}</span>
                      <button onClick={() => removeAlert(i)} className="text-zinc-700 hover:text-rose-500 ml-1">✕</button>
                    </div>
                  ))}
                  {alerts.length === 0 && <p className="text-[8px] text-zinc-700 italic">No alerts set.</p>}
                </div>
              </div>

              <div className="space-y-2">
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
           <button onClick={() => overlay.push('copilot')} className="mt-auto w-full py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
             Analyze Today ✨
           </button>
        </section>

        <section className="lg:col-span-4 lg:row-span-3 gap-2 flex flex-col lg:flex-row">
          <div className="flex-1 bg-zinc-900/20 border border-white/5 rounded-xl p-2 overflow-hidden flex flex-col">
             <WidgetHeader title="Top Movers" icon={Target} extra={<select className="bg-zinc-950 text-[8px] text-zinc-500 border border-white/10 rounded px-1"><option>Gainers</option></select>} onExpand={() => overlay.push('expanded', { section: 'Top Movers' })} />
             <div className="space-y-1.5 mt-1 overflow-y-auto no-scrollbar">
                {gainers && gainers.length > 0 ? gainers.slice(0, 5).map((item: any, i: number) => (
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
                )) : (
                  <div className="text-center py-4 text-zinc-600 text-[10px]">No gainer data available</div>
                )}
             </div>
          </div>
          <div className="w-32 bg-zinc-900/20 border border-white/5 rounded-xl p-2 flex flex-col justify-center">
             <WidgetHeader title="NIFTY PCR" icon={Cpu} />
             <div className="flex-1 flex flex-col items-center justify-center">
               <Mono className="text-3xl font-black text-emerald-400">{optionsChain?.pcr || '1.2'}</Mono>
               <span className="text-[8px] text-zinc-600 mt-1">Max Pain: {optionsChain?.maxPain || '22.4K'}</span>
               <button onClick={() => overlay.push('options')} className="text-[8px] text-zinc-500 hover:text-amber-500 mt-2">Details →</button>
             </div>
          </div>
        </section>
      </>)}

      </main>

      {/* ── Expanded Section Overlay ── */}
      <AnimatePresence>
        {overlay.isOpen('expanded') && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => overlay.pop()}
              className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150]"
            />
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed inset-3 lg:inset-6 bg-zinc-950 border border-white/10 rounded-2xl z-[160] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-base font-black text-white uppercase tracking-widest italic">{overlay.getProps('expanded')?.section}</h2>
                  <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Live Feed</span>
                </div>
                <button
                  onClick={() => overlay.pop()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                >
                  <Minimize2 size={12} /> Close
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 no-scrollbar">

                {overlay.getProps('expanded')?.section === 'Watchlist' && (
                  <div className="h-full flex flex-col gap-4 max-w-2xl mx-auto">
                    <div className="relative">
                      <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input type="text" placeholder="Search stocks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-300 outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
                      {watchlist.map((stock) => (
                        <div key={stock.symbol} onClick={() => { openStockDetail(stock); overlay.pop(); }}
                          className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 hover:bg-white/5 cursor-pointer border border-white/5 hover:border-amber-500/30 transition-all group">
                          <div>
                            <div className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">{stock.symbol}</div>
                            <div className="text-xs text-zinc-500">{stock.name}</div>
                          </div>
                          <div className="text-right">
                            <Mono className={`text-xl font-bold ${stock.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPrice(stock.ltp)}</Mono>
                            <div className={`text-sm font-black ${stock.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stock.percentChange > 0 ? '+' : ''}{stock.percentChange.toFixed(2)}%</div>
                          </div>
                        </div>
                      ))}
                      {watchlist.length === 0 && <div className="text-center py-20 text-zinc-600">Watchlist is empty. Search above to add stocks.</div>}
                    </div>
                  </div>
                )}

{overlay.getProps('expanded')?.section === 'Intelligence Hub' && (
                  <div className="h-full max-w-6xl mx-auto flex flex-col gap-4">
                    <div className="grid grid-cols-6 gap-2">
                      <div className="p-2 bg-zinc-900/60 border border-white/5 rounded-xl">
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">GIFT Nifty</span>
                        <Mono className="text-lg text-white">--</Mono>
                        <div className="text-[9px] text-zinc-600">pre-gap</div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 border border-white/5 rounded-xl">
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">USD/INR</span>
                        <Mono className="text-lg text-white">{macroData.usdInr.toFixed(1)}</Mono>
                        <div className="text-[9px] text-zinc-600">macro</div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 border border-white/5 rounded-xl">
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1">10Y G-Sec</span>
                        <Mono className="text-lg text-white">{macroData.bondYield.toFixed(1)}%</Mono>
                        <div className="text-[9px] text-zinc-600">bond</div>
                      </div>
<div className={`p-2 border rounded-xl ${Number(macroData.vix) > 16 ? 'bg-rose-900/30 border-rose-500/50' : 'bg-zinc-900/60 border-white/5'}`}>
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1 flex items-center gap-1"><Activity size={10} /> India VIX</span>
                        <Mono className={`text-lg ${Number(macroData.vix) > 16 ? 'text-rose-400' : 'text-amber-400'}`}>{Number(macroData.vix || 14).toFixed(1)}</Mono>
                        <div className="text-[9px] text-amber-500">{Number(macroData.vix) > 16 ? 'Reduce 50%!' : 'Normal'}</div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 border border-zinc-700/50 rounded-xl bg-zinc-800/30">
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1 flex items-center gap-1"><Activity size={10} /> Sentiment</span>
                        <Mono className={`text-lg ${
                          Number(macroData.vix) > 16 ? 'text-rose-400' :
                          (sentiment?.score ?? 50) >= 60 ? 'text-emerald-400' :
                          (sentiment?.score ?? 50) <= 40 ? 'text-rose-400' :
                          'text-amber-400'
                        }`}>{Number(macroData.vix) > 16 ? 'RISK OFF' : sentiment?.label || 'NEUTRAL'}</Mono>
                        <div className="text-[9px] text-zinc-500">{Number(macroData.vix) > 16 ? 'Gamma scalp' : sentiment?.description || '...'}</div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 border border-zinc-700/50 rounded-xl bg-zinc-800/30">
                        <span className="text-[8px] font-black text-emerald-400 uppercase block mb-1">Regime</span>
                        <Mono className={`text-lg ${
                          macroData.vix > 16 ? 'text-rose-400' :
                          (sentiment?.score ?? 50) >= 60 ? 'text-emerald-400' :
                          (sentiment?.score ?? 50) <= 40 ? 'text-rose-400' :
                          'text-amber-400'
                        }`}>{macroData.vix > 16 ? 'RISK OFF' : sentiment?.label || 'NEUTRAL'}</Mono>
                        <div className="text-[9px] text-zinc-500">{macroData.vix > 16 ? 'Gamma scalp' : sentiment?.description || '...'}</div>
                      </div>
                      <div className="p-2 bg-zinc-900/60 border border-white/5 rounded-xl">
                        <span className="text-[8px] font-black text-zinc-500 uppercase block mb-1 flex items-center gap-1"><Cpu size={10} /> PCR</span>
                        <Mono className="text-lg text-white">{optionsChain?.pcr || '--'}</Mono>
                        <div className="text-[9px] text-zinc-600">{optionsChain?.pcr > 1 ? 'Bullish' : 'Bearish'}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Users size={12} className="text-emerald-500" /> Institutional Flows (₹Cr)
                           <button
                             onClick={() => exportFIIDIIData(30)}
                             className="ml-auto p-1 hover:bg-white/5 rounded text-zinc-600 hover:text-amber-500 transition-colors"
                             title="Export FII/DII Data (CSV)"
                           >
                             <ExternalLink size={10} />
                           </button>
                         </span>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="col-span-2 p-3 bg-zinc-950 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase mb-2">🐻 FII (Today)</div>
                            <Mono className={`text-2xl font-bold ${(institutionalData?.fii?.net || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(institutionalData?.fii?.net || 0) >= 0 ? '+' : ''}{institutionalData?.fii?.net || 0}</Mono>
                            <div className="text-[10px] text-zinc-600 mt-1">Buy: {institutionalData?.fii?.buyValue || 0} / Sell: {institutionalData?.fii?.sellValue || 0}</div>
                          </div>
                          <div className="col-span-2 p-3 bg-zinc-950 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase mb-2">🐂 DII (Today)</div>
                            <Mono className={`text-2xl font-bold ${(institutionalData?.dii?.net || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(institutionalData?.dii?.net || 0) >= 0 ? '+' : ''}{institutionalData?.dii?.net || 0}</Mono>
                            <div className="text-[10px] text-zinc-600 mt-1">Buy: {institutionalData?.dii?.buyValue || 0} / Sell: {institutionalData?.dii?.sellValue || 0}</div>
                          </div>
                          <div className="p-3 bg-zinc-950 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase mb-2">Net Diff</div>
                            <Mono className={`text-xl font-bold ${((institutionalData?.dii?.net || 0) + (institutionalData?.fii?.net || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{((institutionalData?.dii?.net || 0) + (institutionalData?.fii?.net || 0)).toFixed(0)}</Mono>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          {[{l:'FII Index',v:institutionalData?.fii?.index},{l:'FII Cash',v:institutionalData?.fii?.cash},{l:'FII F&O',v:institutionalData?.fii?.fn}].map(item => (
                            <div key={item.l} className="text-center p-2 bg-zinc-950/50 rounded">
                              <div className="text-[9px] text-zinc-600 uppercase">{item.l}</div>
                              <Mono className={`text-sm ${(item.v || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(item.v || 0) >= 0 ? '+' : ''}{item.v || 0}</Mono>
                            </div>
                          ))}
                          {[{l:'DII Index',v:institutionalData?.dii?.index},{l:'DII Cash',v:institutionalData?.dii?.cash},{l:'DII F&O',v:institutionalData?.dii?.fn}].map(item => (
                            <div key={item.l} className="text-center p-2 bg-zinc-950/50 rounded">
                              <div className="text-[9px] text-zinc-600 uppercase">{item.l}</div>
                              <Mono className={`text-sm ${(item.v || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(item.v || 0) >= 0 ? '+' : ''}{item.v || 0}</Mono>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Layers size={12} className="text-amber-500" /> Key Levels (NIFTY)
                        </span>
                        <div className="space-y-2">
                          <div className="flex justify-between p-2 bg-emerald-950/30 rounded border border-emerald-500/30">
                            <span className="text-xs text-zinc-400">Support</span>
                            <Mono className="text-sm text-emerald-400">{keyLevels.support || '--'}</Mono>
                          </div>
                          <div className="flex justify-between p-2 bg-amber-950/30 rounded border border-amber-500/30">
                            <span className="text-xs text-zinc-400">Pivot</span>
                            <Mono className="text-sm text-amber-400">{keyLevels.pivot || '--'}</Mono>
                          </div>
                          <div className="flex justify-between p-2 bg-rose-950/30 rounded border border-rose-500/30">
                            <span className="text-xs text-zinc-400">Resistance</span>
                            <Mono className="text-sm text-rose-400">{keyLevels.resistance || '--'}</Mono>
                          </div>
                          <div className="flex justify-between p-2 bg-zinc-950 rounded mt-2 border border-white/5">
                            <span className="text-xs text-zinc-500">Max Pain</span>
                            <Mono className="text-sm text-white">{keyLevels.maxPain || '--'}</Mono>
                          </div>
                          <div className="flex justify-between p-2 bg-zinc-950 rounded border border-white/5">
                            <span className="text-xs text-zinc-500">PCR</span>
                            <Mono className="text-sm text-white">{keyLevels.pcr || '--'}</Mono>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <TrendingUp size={12} className="text-amber-500" /> Weekly Flow (7 Days)
                        </span>
                        <div className="flex items-end gap-1 h-20">
                          {(institutionalData?.weekHistory || []).length > 0 ? (institutionalData?.weekHistory || []).slice(0, 7).map((d: any, i: number) => {
                            const max = Math.max(...(institutionalData?.weekHistory || [{fii:100,dii:100}]).map((x: any) => Math.abs(x.fii + x.dii)));
                            const h = max > 0 ? ((d.fii + d.dii) / max) * 100 : 0;
                            const color = (d.fii + d.dii) >= 0 ? 'bg-emerald-500' : 'bg-rose-500';
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center">
                                <div className={`w-full ${color} rounded-t`} style={{ height: `${Math.abs(h)}%`, minHeight: h !== 0 ? '4px' : 0 }} />
                                <span className="text-[8px] text-zinc-600 mt-1">{d.day}</span>
                              </div>
                            );
                          }) : (
                            <div className="text-zinc-600 text-xs w-full text-center py-6">No weekly data</div>
                          )}
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-600 mt-2">
                          <span>7 days ago</span>
                          <span>Today</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BarChart3 size={12} className="text-amber-500" /> Sector Flow
                        </span>
                        <div className="space-y-1.5 max-h-24 overflow-auto">
                          {sectors.slice(0, 8).map((s: any, i: number) => (
                            <div key={s.name + i} className="flex justify-between items-center text-xs p-2 bg-zinc-950 rounded">
                              <span className="text-zinc-400">{s.name}</span>
                              <Mono className={s.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{s.percentChange > 0 ? '+' : ''}{s.percentChange?.toFixed(1)}%</Mono>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Newspaper size={12} className="text-amber-500" /> Market Buzz
                        </span>
                      <div className="grid grid-cols-3 gap-2">
                        {newsData.slice(0, 6).map((n: any, i: number) => (
                          <a key={i} href={n.link || '#'} target="_blank" rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-zinc-950 hover:bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer">
                            <div className="text-[9px] text-amber-500 uppercase font-bold mb-1">{n.source}</div>
                            <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{n.title}</p>
                            <span className="text-[8px] text-zinc-600 mt-1.5 block">{n.timestamp ? new Date(n.timestamp).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : 'Now'}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Gauge size={12} className="text-amber-500" /> Order Flow Delta
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-emerald-950/30 rounded border border-emerald-500/30">
                            <div className="text-[9px] text-zinc-500 uppercase">Agg Buy</div>
                            <Mono className="text-lg text-emerald-400">{orderFlow.buyDelta}%</Mono>
                          </div>
                          <div className="text-center p-2 bg-rose-950/30 rounded border border-rose-500/30">
                            <div className="text-[9px] text-zinc-500 uppercase">Agg Sell</div>
                            <Mono className="text-lg text-rose-400">{orderFlow.sellDelta}%</Mono>
                          </div>
                          <div className="text-center p-2 bg-zinc-950 rounded">
                            <div className="text-[9px] text-zinc-500 uppercase">Delta</div>
                            <Mono className={`text-lg ${orderFlow.buyDelta > orderFlow.sellDelta ? 'text-emerald-400' : 'text-rose-400'}`}>{orderFlow.buyDelta - orderFlow.sellDelta}</Mono>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Gauge size={12} className="text-amber-500" /> Vol Skew (VST)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-zinc-950 rounded">
                            <div className="text-[9px] text-zinc-500 uppercase">Call IV</div>
                            <Mono className="text-lg text-white">{orderFlow.callIV}</Mono>
                          </div>
                          <div className="text-center p-2 bg-zinc-950 rounded">
                            <div className="text-[9px] text-zinc-500 uppercase">Put IV</div>
                            <Mono className={`text-lg ${orderFlow.putIV > orderFlow.callIV ? 'text-rose-400' : 'text-white'}`}>{orderFlow.putIV}</Mono>
                          </div>
                        </div>
                        <div className="text-[9px] text-amber-500 mt-2">Put IV &gt; Call = Hidden distribution</div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Gauge size={12} className="text-amber-500" /> Cross-Asset Correlation
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="flex justify-between p-2 bg-zinc-950 rounded">
                          <span className="text-zinc-500">IT↔Nasdaq</span>
                          <Mono className={correlations.itNasdaq > 0.5 ? 'text-emerald-400' : correlations.itNasdaq < -0.3 ? 'text-rose-400' : 'text-white'}>{correlations.itNasdaq.toFixed(2)}</Mono>
                        </div>
                        <div className="flex justify-between p-2 bg-zinc-950 rounded">
                          <span className="text-zinc-500">IT↔USD</span>
                          <Mono className={correlations.itUsd < -0.3 ? 'text-rose-400' : 'text-white'}>{correlations.itUsd.toFixed(2)}</Mono>
                        </div>
                        <div className="flex justify-between p-2 bg-zinc-950 rounded">
                          <span className="text-zinc-500">Bank↔10Y</span>
                          <Mono className={correlations.bankYield > 0.3 ? 'text-emerald-400' : 'text-white'}>{correlations.bankYield.toFixed(2)}</Mono>
                        </div>
                        <div className="flex justify-between p-2 bg-zinc-950 rounded">
                          <span className="text-zinc-500">VIX↔Nifty</span>
                          <Mono className={correlations.vixNifty < -0.5 ? 'text-emerald-400' : 'text-white'}>{correlations.vixNifty.toFixed(2)}</Mono>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {overlay.getProps('expanded')?.section === 'Top Movers' && (
                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 gap-6">
                      {[{ label: 'Top Gainers', data: gainers, color: 'emerald' }, { label: 'Top Losers', data: losers, color: 'rose' }].map(group => (
                        <div key={group.label}>
                          <h3 className={`text-sm font-black uppercase tracking-widest mb-4 text-${group.color}-400`}>{group.label}</h3>
                          <div className="space-y-2">
                            {(group.data.length > 0 ? group.data : []).map((item: any, i: number) => (
                              <div key={item.symbol + i} onClick={() => { openStockDetail({ symbol: item.symbol, name: item.symbol, ltp: item.ltp, change: 0, percentChange: item.percentChange, volume: item.volume, timestamp: Date.now() }); overlay.pop(); }}
                                className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-amber-500/30 cursor-pointer transition-all">
                                <div>
                                  <span className="font-black text-white">{item.symbol}</span>
                                  <div className="text-xs text-zinc-500 mt-0.5">Vol: {(item.volume / 1000000).toFixed(1)}M</div>
                                </div>
                                <Mono className={`text-lg font-bold text-${group.color}-400`}>{item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(2)}%</Mono>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

{overlay.getProps('expanded')?.section === 'Breadth Gauge' && (
                   <div className="max-w-3xl mx-auto flex flex-col gap-6 mt-8">
                     {/* ── Core Counts ── */}
                     <div className="flex justify-between items-center">
                       <div className="text-center">
                         <div className="text-5xl font-black text-emerald-400 tabular-nums">{(breadth?.advances || totalAdvances).toLocaleString()}</div>
                         <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-2">Advances</div>
                       </div>
                       <div className="text-center">
                         <div className="text-4xl font-black text-zinc-500 tabular-nums">{(breadth?.unchanged || 42).toLocaleString()}</div>
                         <div className="text-xs font-black text-zinc-600 uppercase tracking-widest mt-2">Unchanged</div>
                       </div>
                       <div className="text-center">
                         <div className="text-5xl font-black text-rose-400 tabular-nums">{(breadth?.declines || totalDeclines).toLocaleString()}</div>
                         <div className="text-xs font-black text-rose-500 uppercase tracking-widest mt-2">Declines</div>
                       </div>
                     </div>

                     {/* ── A/D Ratio & Breadth Momentum ── */}
                     <div className="grid grid-cols-3 gap-3">
                       <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl text-center">
                         <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">A/D Ratio</div>
                         <Mono className={`text-2xl font-black ${advancePercent > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {totalAdvances > 0 && totalDeclines > 0 ? (totalAdvances / totalDeclines).toFixed(2) : '--'}
                         </Mono>
                       </div>
                       <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl text-center">
                         <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Breadth Momentum</div>
                         <Mono className={`text-2xl font-black ${(totalAdvances - totalDeclines) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {(totalAdvances - totalDeclines) >= 0 ? '+' : ''}{(totalAdvances - totalDeclines).toLocaleString()}
                         </Mono>
                       </div>
                       <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl text-center">
                         <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Traded</div>
                         <Mono className="text-2xl font-black text-white">
                           {(totalAdvances + totalDeclines + (breadth?.unchanged || 0)).toLocaleString()}
                         </Mono>
                       </div>
                     </div>

                     {/* ── Breadth Bar ── */}
                     <div className="h-6 w-full bg-zinc-800 rounded-full overflow-hidden flex border border-white/5">
                       <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${advancePercent}%` }} />
                       <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${100 - advancePercent}%` }} />
                     </div>

                     {/* ── Verdict ── */}
                     <div className="text-center">
                       <span className={`text-4xl font-black italic ${advancePercent > 60 ? 'text-emerald-400' : advancePercent < 40 ? 'text-rose-400' : 'text-zinc-400'}`}>
                         {advancePercent > 60 ? 'Bullish Market' : advancePercent < 40 ? 'Bearish Market' : 'Neutral Market'}
                       </span>
                       <div className="text-sm text-zinc-500 mt-2">{advancePercent.toFixed(1)}% stocks advancing today</div>
                     </div>

                     {/* ── Sector Breadth Breakdown ── */}
                     {sectors && sectors.length > 0 && (
                       <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl">
                         <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <PieChart size={10} className="text-amber-500" /> Sector Breadth
                         </div>
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                           {sectors.map((sector) => (
                             <div key={sector.symbol} className="p-2 bg-zinc-950 rounded-lg border border-white/5">
                               <div className="text-[9px] font-black text-zinc-500 uppercase">{sector.name.replace('NIFTY ', '')}</div>
                               <div className={`text-sm font-bold mt-0.5 ${sector.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {sector.percentChange >= 0 ? '+' : ''}{sector.percentChange.toFixed(1)}%
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* ── Index Breadth ── */}
                     {indices && indices.length > 0 && (
                       <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl">
                         <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <TrendingUp size={10} className="text-amber-500" /> Index Breadth
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {indices.map((idx) => (
                             <div key={idx.symbol} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950 rounded border border-white/5">
                               <span className="text-[8px] font-black text-zinc-500">{idx.name}</span>
                               <span className={`text-[9px] font-bold ${idx.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {idx.percentChange >= 0 ? '+' : ''}{idx.percentChange.toFixed(2)}%
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                {overlay.getProps('expanded')?.section === 'Portfolio' && (
                  <div className="max-w-3xl mx-auto flex flex-col gap-6">
                    <div className="flex justify-between items-center p-6 bg-zinc-900/60 border border-white/10 rounded-2xl">
                      <div>
                        <div className="text-xs text-zinc-500 uppercase font-black tracking-widest mb-1">Available Capital</div>
                        <Mono className="text-3xl font-black text-emerald-400">₹{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Mono>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-500 uppercase font-black tracking-widest mb-1">Open Positions</div>
                        <div className="text-3xl font-black text-white">{positions.length}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {positions.length === 0 && <div className="text-center py-16 text-zinc-600">No open positions. Buy stocks via the Stock Detail panel.</div>}
                      {positions.map(p => {
                        const pnl = (p.currentPrice - p.avgPrice) * p.quantity;
                        const pnlPct = (pnl / (p.avgPrice * p.quantity)) * 100;
                        return (
                          <div key={p.symbol} onClick={() => { openStockDetail({ symbol: p.symbol, name: p.symbol, ltp: p.currentPrice, change: 0, percentChange: 0, timestamp: 0, volume: 0 }); overlay.pop(); }}
                            className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-amber-500/30 cursor-pointer transition-all">
                            <div>
                              <div className="text-lg font-black text-white">{p.symbol}</div>
                              <div className="text-sm text-zinc-500">{p.quantity} shares @ avg ₹{p.avgPrice.toFixed(2)}</div>
                              <div className="text-xs text-zinc-600 mt-1">Current: ₹{p.currentPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <Mono className={`text-2xl font-black ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}</Mono>
                              <div className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Dock Panels ── */}
      <DockPanel open={activeDock === "fo"} onClose={() => setActiveDock(null)} title="F&O Intelligence" icon={BarChart3}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-zinc-900/20 border border-white/5 rounded-xl p-3"><OptionsChain /></div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3"><SentimentGauge /></div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3"><OIWall /></div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="VIX" icon={Gauge} /><VIXCard />
          </div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="Order Flow" icon={Activity} /><FlowCard />
          </div>
        </div>
      </DockPanel>

      <DockPanel open={activeDock === "institutional"} onClose={() => setActiveDock(null)} title="Institutional Flows" icon={Building2}>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="FII / DII Activity" icon={Building2} /><InstitutionalCard />
          </div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="Sector Flows" icon={PieChart} /><SectorFlowsCard />
          </div>
          <div className="col-span-2 bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="FII/DII History" icon={LineChart} /><InstitutionalHistoryCard />
          </div>
        </div>
      </DockPanel>

      <DockPanel open={activeDock === "earnings"} onClose={() => setActiveDock(null)} title="Earnings & Corporate Actions" icon={Calendar}>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3"><EarningsContent /></div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3"><CorporateActionsContent /></div>
        </div>
      </DockPanel>

      <DockPanel open={activeDock === "macro"} onClose={() => setActiveDock(null)} title="Macro Economics" icon={Globe}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-zinc-900/20 border border-white/5 rounded-xl p-3"><EconomicCalendarContent /></div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="FX Rates" icon={Globe} /><FXRatesCard />
          </div>
          <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="RBI Rates" icon={Landmark} /><RBIRatesCard />
          </div>
          <div className="col-span-2 bg-zinc-900/20 border border-white/5 rounded-xl p-3">
            <WidgetHeader title="Macro Indicators" icon={BarChart3} /><MacroIndicatorsCard />
          </div>
        </div>
      </DockPanel>

      <MobileNav
        activeTab={"indices" as MobileTab}
        activeView={(activeDock || "overview") as MobileView}
        onTabChange={() => {}}
        onViewChange={(v) => setActiveDock(v === "overview" ? null : v as DesktopView)}
        onOpenCopilot={() => overlay.push('copilot')}
      />

      <AnimatePresence>
        {overlay.isOpen('detail') && selectedStock && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => overlay.pop()} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
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
                <button onClick={() => { overlay.pop(); setChartData([]); selectStock(null); }} className="p-2 hover:bg-white/5 rounded-full transition-all text-zinc-500 hover:text-white"><X size={28} /></button>
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
                    <p className="text-base text-zinc-300 leading-relaxed italic">
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

                 <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">
                   <WidgetHeader title="Execution Engine" icon={Target} />
                   <div className="flex flex-col gap-4 mt-2">
                     {/* Order Type Selection */}
                     <div>
                       <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Order Type</label>
                       <div className="grid grid-cols-4 gap-2">
                         {(["market", "limit", "stop-loss", "target"] as const).map(type => (
                           <button
                             key={type}
                             onClick={() => setOrderType(type)}
                             className={`p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                               orderType === type
                                 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                                 : 'bg-zinc-950/50 text-zinc-500 border border-white/5 hover:border-zinc-400'
                             }`}
                           >
                             {type === "stop-loss" ? "SL" : type === "target" ? "Target" : type.charAt(0).toUpperCase() + type.slice(1)}
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Lot Size Toggle */}
                     {isFOStock(selectedStock?.symbol || "") && (
                       <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-lg border border-white/5">
                         <div>
                           <span className="text-[10px] text-zinc-400 font-bold uppercase">Use Lot Size</span>
                           <span className="text-[9px] text-zinc-600 ml-2">(Lot: {getLotSize(selectedStock?.symbol || "")} shares)</span>
                         </div>
                         <button
                           onClick={() => setUseLots(!useLots)}
                           className={`w-12 h-6 rounded-full transition-all ${useLots ? 'bg-amber-500' : 'bg-zinc-700'}`}
                         >
                           <div className={`w-4 h-4 bg-white rounded-full transition-all ${useLots ? 'ml-7' : 'ml-1'} mt-1`} />
                         </button>
                       </div>
                     )}

                     {/* Quantity/Lots Input */}
                     <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">
                            {useLots ? 'Lots' : 'Quantity'}
                          </label>
                          <input
                            type="number"
                            value={tradeQty}
                            onChange={(e) => setTradeQty(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-white font-mono outline-none focus:border-amber-500 transition-all"
                          />
                          {useLots && (
                            <div className="text-[9px] text-zinc-600 mt-1">
                              = {(fromLots(parseInt(tradeQty) || 0, selectedStock?.symbol || "")).toLocaleString()} shares
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Total Margin</label>
                          <div className="w-full bg-zinc-950/50 border border-white/5 rounded-lg p-3 text-amber-500 font-mono flex items-center justify-between">
                            <span>₹</span>
                            <span>{((parseInt(tradeQty) || 0) * (useLots ? fromLots(parseInt(tradeQty) || 0, selectedStock?.symbol || "") : 1) * selectedStock.ltp).toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                          </div>
                        </div>
                     </div>

                     {/* Limit Price Input */}
                     {orderType === "limit" && (
                       <div>
                         <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Limit Price</label>
                         <input
                           type="number"
                           value={limitPrice}
                           onChange={(e) => setLimitPrice(e.target.value)}
                           placeholder={selectedStock.ltp.toFixed(2)}
                           className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-white font-mono outline-none focus:border-amber-500 transition-all"
                         />
                       </div>
                     )}

                     {/* Stop-Loss/Target Price Input */}
                     {(orderType === "stop-loss" || orderType === "target") && (
                       <div>
                         <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">
                           {orderType === "stop-loss" ? "Stop Price" : "Target Price"}
                         </label>
                         <input
                           type="number"
                           value={stopLossPrice}
                           onChange={(e) => setStopLossPrice(e.target.value)}
                           placeholder={selectedStock.ltp.toFixed(2)}
                           className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-white font-mono outline-none focus:border-amber-500 transition-all"
                         />
                       </div>
                     )}

                     {/* Buy/Sell Buttons */}
                     <div className="flex gap-4">
                       <button onClick={() => selectedStock && executeTrade('BUY', selectedStock)} className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 p-4 rounded-xl font-black uppercase tracking-widest transition-all">
                         {orderType === "market" ? "Buy Market" : orderType === "limit" ? "Buy Limit" : orderType === "stop-loss" ? "Buy SL" : "Buy Target"}
                       </button>
                       <button onClick={() => selectedStock && executeTrade('SELL', selectedStock)} className="flex-1 bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 p-4 rounded-xl font-black uppercase tracking-widest transition-all">
                         {orderType === "market" ? "Sell Market" : orderType === "limit" ? "Sell Limit" : orderType === "stop-loss" ? "Sell SL" : "Sell Target"}
                       </button>
                     </div>
                   </div>
                 </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overlay.isOpen('options') && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => overlay.pop()} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
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
                <button onClick={() => overlay.pop()} className="p-2 hover:bg-white/5 rounded-full transition-all">
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
              {/* OI Visualizer */}
              {optionsChain?.strikes && (
                <div className="border-t border-white/10 p-6 shrink-0 bg-zinc-950">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={12} className="text-amber-500" /> Open Interest Wall Map
                    <span className="ml-auto flex items-center gap-3 text-[8px] normal-case font-medium">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> CE Resistance</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> PE Support</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {optionsChain.strikes.slice(0, 12).map((s: any, i: number) => {
                      const maxOI = Math.max(...optionsChain.strikes.map((x: any) => Math.max(x.ce?.oi || 0, x.pe?.oi || 0)));
                      const ceWidth = maxOI > 0 ? ((s.ce?.oi || 0) / maxOI) * 100 : 0;
                      const peWidth = maxOI > 0 ? ((s.pe?.oi || 0) / maxOI) * 100 : 0;
                      const isATM = Math.abs(s.strike - optionsChain.spotPrice) < 25;
                      return (
                        <div key={s.strike + i} className="space-y-1">
                          <div className="flex justify-between text-[8px] text-zinc-500">
                            <span className={isATM ? 'text-amber-500 font-black' : ''}>{s.strike.toLocaleString()}{isATM ? ' ATM' : ''}</span>
                            <span>{((s.ce?.oi || 0)/100000).toFixed(1)}L / {((s.pe?.oi || 0)/100000).toFixed(1)}L</span>
                          </div>
                          <div className="flex h-2 gap-0.5 bg-zinc-900 rounded overflow-hidden">
                            <div className="bg-rose-500/80 rounded-l transition-all" style={{ width: `${ceWidth/2}%` }} />
                            <div className="bg-emerald-500/80 rounded-r ml-auto transition-all" style={{ width: `${peWidth/2}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overlay.isOpen('heatmap') && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => overlay.pop()} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" />
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
                  <button onClick={() => overlay.pop()} className="p-2 hover:bg-white/5 rounded-full transition-all">
                    <X size={24} className="text-zinc-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-hidden">
                {!heatmapData ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-16 h-16 border-2 border-amber-500/20 border-t-amber-500 rounded-full"
                        />
                        <div className="absolute inset-2 bg-zinc-900 rounded-full flex items-center justify-center">
                          <Layers size={20} className="text-amber-500" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-zinc-300 text-sm font-medium">Loading Market Heatmap</p>
                        <p className="text-zinc-600 text-xs mt-1">Fetching sector data...</p>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 bg-amber-500 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <StockHeatmap data={heatmapData} onStockClick={(sym: string) => {
                    overlay.pop();
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
        {overlay.isOpen('copilot') && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => overlay.pop()} className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
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

        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const tickerRef = React.useRef<((data: StockQuote) => void) | null>(null);

  return (
    <MarketProvider onTickerUpdate={(data) => tickerRef.current?.(data)}>
      <OverlayProvider>
        <GridProvider>
          <AppContent tickerRef={tickerRef} />
        </GridProvider>
      </OverlayProvider>
    </MarketProvider>
  );
}