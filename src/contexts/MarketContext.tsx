"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import type { IndexData, StockQuote, MarketBreadth, SentimentData, GainerLoser, SectorData } from '@/types/market';

interface MarketContextType {
  indices: IndexData[];
  breadth: MarketBreadth | null;
  gainers: GainerLoser[];
  losers: GainerLoser[];
  sectors: SectorData[];
  sentiment: SentimentData | null;
  setSentiment: React.Dispatch<React.SetStateAction<SentimentData | null>>;
  screenerSignals: any[];
  isConnected: boolean;
  isConnecting: boolean;
  lastUpdate: number;
  reconnect: () => void;
  loading: boolean;
}

const MarketContext = createContext<MarketContextType | null>(null);

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}

interface MarketProviderProps {
  children: React.ReactNode;
  onTickerUpdate?: (data: StockQuote) => void;
}

export function MarketProvider({ children, onTickerUpdate }: MarketProviderProps) {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [screenerSignals, setScreenerSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { isConnected, isConnecting, lastUpdate, reconnect } = useSSE({
    onIndexUpdate: useCallback((data: IndexData[]) => {
      setIndices(data);
      setLoading(false);
    }, []),
    onBreadthUpdate: useCallback((data: MarketBreadth) => {
      setBreadth(data);
    }, []),
    onTickerUpdate: useCallback((data: StockQuote) => {
      onTickerUpdate?.(data);
    }, [onTickerUpdate]),
    onGainersUpdate: useCallback((data: GainerLoser[]) => {
      setGainers(data);
    }, []),
    onLosersUpdate: useCallback((data: GainerLoser[]) => {
      setLosers(data);
    }, []),
    onSectorsUpdate: useCallback((data: SectorData[]) => {
      setSectors(data);
    }, []),
    onScreenerUpdate: useCallback((data: any[]) => {
      setScreenerSignals(data);
    }, []),
  });

  return (
    <MarketContext.Provider value={{
      indices, breadth, gainers, losers, sectors, sentiment, setSentiment, screenerSignals,
      isConnected, isConnecting, lastUpdate, reconnect, loading,
    }}>
      {children}
    </MarketContext.Provider>
  );
}
