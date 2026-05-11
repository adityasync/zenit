"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

type OverlayType = 'detail' | 'options' | 'heatmap' | 'copilot' | 'expanded';

interface OverlayEntry {
  id: string;
  type: OverlayType;
  props: Record<string, any>;
}

interface OverlayContextType {
  overlays: OverlayEntry[];
  push: (type: OverlayType, props?: Record<string, any>) => void;
  pop: () => void;
  closeAll: () => void;
  isOpen: (type: OverlayType) => boolean;
  getProps: (type: OverlayType) => Record<string, any> | undefined;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider');
  return ctx;
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlays, setOverlays] = useState<OverlayEntry[]>([]);

  const push = useCallback((type: OverlayType, props: Record<string, any> = {}) => {
    setOverlays(prev => {
      // Don't duplicate the same type
      if (prev.some(o => o.type === type)) return prev;
      return [...prev, { id: `${type}_${Date.now()}`, type, props }];
    });
  }, []);

  const pop = useCallback(() => {
    setOverlays(prev => prev.slice(0, -1));
  }, []);

  const closeAll = useCallback(() => {
    setOverlays([]);
  }, []);

  const isOpen = useCallback((type: OverlayType) => {
    return overlays.some(o => o.type === type);
  }, [overlays]);

  const getProps = useCallback((type: OverlayType) => {
    return overlays.find(o => o.type === type)?.props;
  }, [overlays]);

  return (
    <OverlayContext.Provider value={{ overlays, push, pop, closeAll, isOpen, getProps }}>
      {children}
    </OverlayContext.Provider>
  );
}
