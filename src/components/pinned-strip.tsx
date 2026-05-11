"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X } from 'lucide-react';
import { useGrid } from '@/contexts/GridContext';
import { VIXCard } from '@/components/widgets/vix-card';
import { FlowCard } from '@/components/widgets/flow-card';

const PINNED_COMPONENTS: Record<string, React.ComponentType> = {
  'vix': VIXCard,
  'flow': FlowCard,
};

export function PinnedStrip() {
  const { pinnedWidgets, unpinWidget } = useGrid();

  if (pinnedWidgets.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <Pin size={10} className="text-amber-500" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Pinned</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        <AnimatePresence>
          {pinnedWidgets.map(id => {
            const Component = PINNED_COMPONENTS[id];
            if (!Component) return null;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="shrink-0 w-56 bg-zinc-900/50 rounded-lg border border-white/5 p-3 relative group"
              >
                <button
                  onClick={() => unpinWidget(id)}
                  className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
                <Component />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
