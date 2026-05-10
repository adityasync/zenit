"use client";

import { useState, useEffect } from "react";
import { X, CalendarDays, BarChart3, Globe, Landmark, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface CalendarEvent {
  date: string;
  time?: string;
  event: string;
  category: "rbi" | "earnings" | "ipo" | "macro" | "market";
  impact: "high" | "medium" | "low";
  description?: string;
  symbol?: string;
}

const categoryIcons: Record<string, any> = {
  rbi: Landmark,
  earnings: BarChart3,
  ipo: TrendingUp,
  macro: Globe,
  market: CalendarDays,
};

const impactColors: Record<string, string> = {
  high: "border-l-rose-500",
  medium: "border-l-amber-500",
  low: "border-l-zinc-600",
};

/** Inline version — embeddable in bento grids. */
export function EconomicCalendarContent({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<"all" | "rbi" | "earnings" | "ipo" | "macro" | "market">("all");

  useEffect(() => {
    fetch(`/api/economic-calendar?days=60`)
      .then(res => res.json())
      .then(data => {
        if (data.events) setEvents(data.events);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = category === "all" ? events : events.filter(e => e.category === category);

  return (
    <div className="flex flex-col h-full">
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={12} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Economic Calendar</span>
          </div>
          <div className="flex gap-1">
            {["all", "rbi", "earnings", "ipo", "macro", "market"].map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat as any)}
                className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold transition-colors ${
                  category === cat ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading ? (
          <div className="text-center py-6 text-xs text-zinc-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">No upcoming events</div>
        ) : (
          filtered.map((e, i) => {
            const Icon = categoryIcons[e.category] || CalendarDays;
            return (
              <div key={i} className={`flex items-start gap-2 p-2.5 bg-zinc-950/50 rounded-lg border-l-2 ${impactColors[e.impact]}`}>
                <Icon size={12} className="text-zinc-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white truncate">{e.event}</span>
                    <span className="text-[9px] font-mono text-zinc-500 shrink-0">{e.date}</span>
                  </div>
                  {e.description && (
                    <div className="text-[9px] text-zinc-600 mt-0.5">{e.description}</div>
                  )}
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
export default function EconomicCalendarWidget({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-500" />
            <span className="text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Economic Calendar</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded ml-2">
            <X size={14} className="text-zinc-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(80vh - 60px)" }}>
          <EconomicCalendarContent compact />
        </div>
      </div>
    </motion.div>
  );
}
