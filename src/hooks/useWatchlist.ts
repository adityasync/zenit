"use client";

import { useState, useCallback } from "react";
import type { WatchlistItem } from "@/types/market";

const WATCHLIST_KEY = "zenit:watchlist";
const MAX_WATCHLIST_ITEMS = 20;

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persistWatchlist = useCallback((items: WatchlistItem[]) => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to persist watchlist:", error);
    }
  }, []);

  const addToWatchlist = useCallback(
    (symbol: string, name: string) => {
      setWatchlist((prev) => {
        if (prev.some((item) => item.symbol === symbol)) {
          return prev;
        }
        if (prev.length >= MAX_WATCHLIST_ITEMS) {
          console.warn("Watchlist is full (max 20 items)");
          return prev;
        }
        const newList = [...prev, { symbol, name, addedAt: Date.now() }];
        persistWatchlist(newList);
        return newList;
      });
    },
    [persistWatchlist]
  );

  const removeFromWatchlist = useCallback(
    (symbol: string) => {
      setWatchlist((prev) => {
        const newList = prev.filter((item) => item.symbol !== symbol);
        persistWatchlist(newList);
        return newList;
      });
    },
    [persistWatchlist]
  );

  const isInWatchlist = useCallback(
    (symbol: string) => {
      return watchlist.some((item) => item.symbol === symbol);
    },
    [watchlist]
  );

  const reorderWatchlist = useCallback(
    (fromIndex: number, toIndex: number) => {
      setWatchlist((prev) => {
        const newList = [...prev];
        const [removed] = newList.splice(fromIndex, 1);
        newList.splice(toIndex, 0, removed);
        persistWatchlist(newList);
        return newList;
      });
    },
    [persistWatchlist]
  );

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    persistWatchlist([]);
  }, [persistWatchlist]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    reorderWatchlist,
    clearWatchlist,
    isFull: watchlist.length >= MAX_WATCHLIST_ITEMS,
  };
}
