"use client";

import { useState, useEffect } from "react";
import { X, Gift, Split, TrendingDown, Landmark } from "lucide-react";
import { motion } from "framer-motion";

interface CorporateAction {
  symbol: string;
  company: string;
  actionType: "dividend" | "split" | "bonus" | "rights" | "buyback";
  exDate: string;
  recordDate?: string;
  purpose: string;
  details: string;
}

const actionIcons: Record<string, any> = {
  dividend: Gift,
  split: Split,
  bonus: Gift,
  rights: TrendingDown,
  buyback: Landmark,
};

const actionColors: Record<string, string> = {
  dividend: "text-emerald-500",
  split: "text-blue-500",
  bonus: "text-purple-500",
  rights: "text-orange-500",
  buyback: "text-rose-500",
};

/** Inline version — embeddable in bento grids. */
export function CorporateActionsContent({ compact = false }: { compact?: boolean }) {
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "dividend" | "split" | "bonus">("all");

  useEffect(() => {
    fetch(`/api/corporate-actions?days=90`)
      .then(res => res.json())
      .then(data => {
        if (data.actions) setActions(data.actions);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? actions : actions.filter(a => a.actionType === filter);

  return (
    <div className="flex flex-col h-full">
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gift size={12} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Corporate Actions</span>
          </div>
          <div className="flex gap-1">
            {["all", "dividend", "split", "bonus"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold transition-colors ${
                  filter === f ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="text-center py-6 text-xs text-zinc-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">No corporate actions</div>
        ) : (
          filtered.map((a, i) => {
            const Icon = actionIcons[a.actionType] || Gift;
            const colorClass = actionColors[a.actionType] || "text-zinc-400";
            return (
              <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-950/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <Icon size={12} className={colorClass} />
                  <div>
                    <div className="text-[11px] font-bold text-white">{a.symbol}</div>
                    <div className="text-[9px] text-zinc-500">{a.actionType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-300 font-mono">{a.exDate}</div>
                  <div className="text-[9px] text-zinc-600 truncate max-w-[160px]">{a.purpose}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Modal version — full-screen overlay. */
export default function CorporateActionsWidget({ onClose }: { onClose: () => void }) {
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
            <Gift size={16} className="text-amber-500" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Corporate Actions</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
            <X size={14} className="text-zinc-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 60px)" }}>
          <CorporateActionsContent compact />
        </div>
      </div>
    </motion.div>
  );
}
