"use client";

import React from 'react';
import { Activity, TrendingUp, Search, Newspaper, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'indices', label: 'Market', icon: Activity },
  { id: 'watchlist', label: 'Watch', icon: TrendingUp },
  { id: 'scanner', label: 'Chart', icon: Search },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'copilot', label: 'AI', icon: Bot },
];

export function QuickJumpBar() {
  const [active, setActive] = React.useState('indices');

  const scrollTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="md:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-b border-white/5 px-2 py-1.5">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors",
                isActive
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              )}
            >
              <Icon size={12} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
