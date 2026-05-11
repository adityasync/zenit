"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ScrollSectionProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ScrollSection({ id, title, icon: Icon, defaultOpen = true, children }: ScrollSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={`section-${id}`} className="scroll-mt-16">
      <button
        onClick={() => setOpen(v => !v)}
        className="sticky top-0 z-30 w-full flex items-center justify-between px-4 py-3 bg-zinc-950/95 backdrop-blur-sm border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-amber-500" />}
          <span className="text-xs font-black uppercase tracking-widest text-zinc-300">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-zinc-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
