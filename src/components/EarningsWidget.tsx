"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface EarningsEvent {
  symbol: string;
  company: string;
  resultDate: string;
  quarter: string;
  isConfirmed: boolean;
  daysUntil: number;
  estimates?: { revenue?: number; profit?: number; eps?: number };
}

/** Inline version — embeddable in bento grids. */
export function EarningsContent({ compact = false }: { compact?: boolean }) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/earnings?days=${days}`)
      .then(res => res.json())
      .then(data => {
        if (data.calendar) setEarnings(data.calendar);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  return (
    <div className="flex flex-col h-full">
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Earnings Calendar</span>
          </div>
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className="bg-zinc-950 text-[10px] text-zinc-400 border border-white/10 rounded px-1.5 py-0.5"
          >
            <option value={30}>30d</option>
            <option value={60}>60d</option>
            <option value={90}>90d</option>
          </select>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="text-center py-6 text-xs text-zinc-600">Loading...</div>
        ) : earnings.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">No upcoming earnings</div>
        ) : (
          earnings.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-950/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-2">
                <Building2 size={12} className="text-zinc-600" />
                <div>
                  <div className="text-[11px] font-bold text-white">{e.symbol}</div>
                  <div className="text-[9px] text-zinc-500">{e.company}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-zinc-300 font-mono">{e.resultDate}</div>
                <div className={`text-[9px] font-bold ${e.daysUntil > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {e.daysUntil > 0 ? `${e.daysUntil}d` : 'Today'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Modal version — full-screen overlay. */
export default function EarningsWidget({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-amber-500" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Earnings Calendar</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
            <X size={14} className="text-zinc-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 60px)" }}>
          <EarningsContent compact />
        </div>
      </div>
    </motion.div>
  );
}
