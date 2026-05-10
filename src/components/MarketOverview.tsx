import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Users, Activity } from 'lucide-react';
import type { IndexData, MarketBreadth } from '@/types/market';

interface MarketOverviewProps {
  indices: IndexData[];
  breadth: MarketBreadth | null;
  institutionalData: any;
  onRefresh?: () => void;
}

function MarketOverview({ indices, breadth, institutionalData, onRefresh }: MarketOverviewProps) {
  const nifty = indices.find(i => i.symbol === 'NIFTY 50');
  const bankNifty = indices.find(i => i.symbol === 'BANKNIFTY');

  const advancePercent = breadth
    ? (breadth.advances / (breadth.advances + breadth.declines + breadth.unchanged)) * 100
    : 0;

  const fiiNet = institutionalData?.fii?.net || 0;
  const diiNet = institutionalData?.dii?.net || 0;

  // Generate AI summary
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    if (!nifty) return;

    let summaryText = '';

    // Market direction
    if (nifty.percentChange > 0.5) summaryText += 'Market strong. ';
    else if (nifty.percentChange > 0) summaryText += 'Market positive. ';
    else if (nifty.percentChange > -0.5) summaryText += 'Market flat. ';
    else summaryText += 'Market under pressure. ';

    // FII/DII
    if (fiiNet > 500) summaryText += 'Heavy FII buying. ';
    else if (fiiNet > 0) summaryText += 'FII net buyers. ';
    else if (fiiNet < -500) summaryText += 'Heavy FII selling. ';
    else if (fiiNet < 0) summaryText += 'FII net sellers. ';

    if (diiNet > 0) summaryText += 'DII providing support. ';
    else summaryText += 'DII also selling. ';

    // Breadth
    if (advancePercent > 60) summaryText += 'Broad-based buying.';
    else if (advancePercent < 40) summaryText += 'Broad-based selling.';
    else summaryText += 'Mixed breadth.';

    setSummary(summaryText);
  }, [nifty, fiiNet, diiNet, advancePercent]);

  if (!nifty) return null;

  return (
    <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Market Overview</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="text-zinc-600 hover:text-amber-500 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
            </svg>
          </button>
        )}
      </div>

      {/* NIFTY Level */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{nifty.value.toLocaleString()}</span>
          <span className={`text-sm font-bold ${nifty.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {nifty.percentChange >= 0 ? '+' : ''}{nifty.percentChange.toFixed(2)}%
          </span>
        </div>
        {bankNifty && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-zinc-500">BANKNIFTY</span>
            <span className={`text-[10px] font-bold ${bankNifty.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {bankNifty.value.toLocaleString()} ({bankNifty.percentChange >= 0 ? '+' : ''}{bankNifty.percentChange.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* FII/DII Summary */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase mb-1">FII Net</div>
          <div className={`text-sm font-bold ${fiiNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fiiNet >= 0 ? '+' : ''}₹{(fiiNet / 100).toFixed(1)}Cr
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase mb-1">DII Net</div>
          <div className={`text-sm font-bold ${diiNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {diiNet >= 0 ? '+' : ''}₹{(diiNet / 100).toFixed(1)}Cr
          </div>
        </div>
      </div>

      {/* Breadth */}
      {breadth && (
        <div className="mb-3">
          <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
            <span>Advances: {breadth.advances}</span>
            <span>Declines: {breadth.declines}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${advancePercent}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${100 - advancePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
          <div className="text-[9px] text-amber-500 uppercase mb-1">AI Summary</div>
          <p className="text-[10px] text-zinc-400 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}


 


 export default MarketOverview;
