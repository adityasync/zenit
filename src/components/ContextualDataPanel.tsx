import React, { useEffect, useState } from 'react';
interface ContextualDataPanelProps {
  symbol: string;
  sector?: string;
  onClose?: () => void;
}

interface PeerStock {
  symbol: string;
  ltp: number;
  percentChange: number;
  sector?: string;
}

export default function ContextualDataPanel({ symbol, sector, onClose }: ContextualDataPanelProps) {
  const [peerStocks, setPeerStocks] = useState<PeerStock[]>([]);
  const [sectorPerformance, setSectorPerformance] = useState<{ name: string; change: number }[]>([]);
  const [relatedNews, setRelatedNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch related news
        const newsRes = await fetch(`/api/news?symbol=${symbol}`);
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setRelatedNews(newsData.slice(0, 5));
        }

        // Generate peer stocks (same sector)
        if (sector) {
          const peerSymbols = getPeersBySector(sector, symbol);
          const peers: PeerStock[] = [];
          
          for (const sym of peerSymbols.slice(0, 5)) {
            try {
              const res = await fetch(`/api/quote?symbol=${sym}`);
              if (res.ok) {
                const data = await res.json();
                peers.push({
                  symbol: sym,
                  ltp: data.ltp || 0,
                  percentChange: data.percentChange || 0,
                  sector,
                });
              }
            } catch {}
          }
          setPeerStocks(peers);
        }

        // Mock sector performance
        setSectorPerformance([
          { name: 'BFSI', change: 1.2 },
          { name: 'IT', change: -0.8 },
          { name: 'Auto', change: 2.1 },
          { name: 'Pharma', change: 0.5 },
          { name: 'Metal', change: -1.5 },
        ]);

      } catch (error) {
        console.error('Contextual data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchData();
  }, [symbol, sector]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-zinc-800/30 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Peer Comparison */}
      {peerStocks.length > 0 && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Peer Comparison
          </div>
          <div className="space-y-1">
            {peerStocks.map(peer => (
              <div key={peer.symbol} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded">
                <span className="text-xs font-bold text-white">{peer.symbol}</span>
                <div className="text-right">
                  <div className="text-xs text-zinc-300">{peer.ltp.toFixed(1)}</div>
                  <div className={`text-[10px] font-bold ${peer.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {peer.percentChange >= 0 ? '+' : ''}{peer.percentChange.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector Performance */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Sector Performance
        </div>
        <div className="space-y-1">
          {sectorPerformance.map(s => (
            <div key={s.name} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded">
              <span className="text-xs text-zinc-300">{s.name}</span>
              <span className={`text-xs font-bold ${s.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Related News */}
      {relatedNews.length > 0 && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 12h10" />
            </svg>
            Related News
          </div>
          <div className="space-y-2">
            {relatedNews.map((news: any, i: number) => (
              <a
                key={i}
                href={news.url || news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-zinc-950/50 rounded hover:bg-zinc-800/50 transition-colors"
              >
                <div className="text-[10px] text-zinc-400 line-clamp-2">{news.headline || news.title}</div>
                <div className="text-[8px] text-zinc-600 mt-1">{news.source} • {news.pubDate || ''}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getPeersBySector(sector: string, excludeSymbol: string): string[] {
  const sectorPeers: Record<string, string[]> = {
    'BFSI': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK'],
    'IT': ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM'],
    'Auto': ['MARUTI', 'TATAMOTORS', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT'],
    'Pharma': ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'BIOCON'],
    'Metal': ['TATASTEEL', 'JSWSTEEL', 'HINDALCO', 'COALINDIA', 'VEDL'],
    'FMCG': ['HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR'],
    'Energy': ['RELIANCE', 'ONGC', 'BPCL', 'HINDPETRO', 'IOC'],
    'Realty': ['DLF', 'GODREJPROP', 'OBEROIRLTY', 'BRIGADE', 'PRESTIGE'],
  };

  return (sectorPeers[sector] || []).filter(s => s !== excludeSymbol);
}
