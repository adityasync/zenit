"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GridContextType {
  pinnedWidgets: string[];
  selectedStockSymbol: string | null;
  pinWidget: (id: string) => void;
  unpinWidget: (id: string) => void;
  selectStock: (symbol: string | null) => void;
}

const GridContext = createContext<GridContextType | null>(null);

export function useGrid() {
  const ctx = useContext(GridContext);
  if (!ctx) throw new Error('useGrid must be used within GridProvider');
  return ctx;
}

export function GridProvider({ children }: { children: React.ReactNode }) {
  const [pinnedWidgets, setPinnedWidgets] = useState<string[]>([]);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  const pinWidget = useCallback((id: string) => {
    setPinnedWidgets(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const unpinWidget = useCallback((id: string) => {
    setPinnedWidgets(prev => prev.filter(w => w !== id));
  }, []);

  const selectStock = useCallback((symbol: string | null) => {
    setSelectedStockSymbol(symbol);
  }, []);

  return (
    <GridContext.Provider value={{ pinnedWidgets, selectedStockSymbol, pinWidget, unpinWidget, selectStock }}>
      {children}
    </GridContext.Provider>
  );
}
