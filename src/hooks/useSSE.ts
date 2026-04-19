"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { IndexData, StockQuote, MarketBreadth, SentimentData, GainerLoser, SectorData } from "@/types/market";

interface UseSSEOptions {
  onIndexUpdate?: (indices: IndexData[]) => void;
  onBreadthUpdate?: (breadth: MarketBreadth) => void;
  onTickerUpdate?: (ticker: StockQuote) => void;
  onSentimentUpdate?: (sentiment: SentimentData) => void;
  onGainersUpdate?: (gainers: GainerLoser[]) => void;
  onLosersUpdate?: (losers: GainerLoser[]) => void;
  onSectorsUpdate?: (sectors: SectorData[]) => void;
  onScreenerUpdate?: (signals: any[]) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseDelay = 1500;
  const isUnmountedRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  // Client-side polling fallback when SSE is disconnected
  const startFallbackPolling = useCallback(() => {
    stopFallbackPolling();
    
    const poll = async () => {
      try {
        const res = await fetch('/api/stream-poll', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.indices) optionsRef.current.onIndexUpdate?.(data.indices);
        if (data.breadth) optionsRef.current.onBreadthUpdate?.(data.breadth);
        if (data.sectors) optionsRef.current.onSectorsUpdate?.(data.sectors);
        if (data.gainers) optionsRef.current.onGainersUpdate?.(data.gainers);
        if (data.losers) optionsRef.current.onLosersUpdate?.(data.losers);
        if (data.screener) optionsRef.current.onScreenerUpdate?.(data.screener);
        if (data.tickers) {
          for (const tick of data.tickers) {
            optionsRef.current.onTickerUpdate?.(tick);
          }
        }
        setLastUpdate(Date.now());
      } catch {
        // silent fallback failure
      }
    };

    poll(); // immediate first poll
    fallbackIntervalRef.current = setInterval(poll, 8000);
  }, [stopFallbackPolling]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isUnmountedRef.current) return;
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    setIsConnecting(true);
    stopFallbackPolling();

    const eventSource = new EventSource("/api/stream");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      if (isUnmountedRef.current) {
        eventSource.close();
        return;
      }
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;
      stopFallbackPolling();
      optionsRef.current.onConnect?.();
    });

    eventSource.addEventListener("indices", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onIndexUpdate?.(data);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error("Failed to parse indices:", error);
      }
    });

    eventSource.addEventListener("breadth", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onBreadthUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse breadth:", error);
      }
    });

    eventSource.addEventListener("tick", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onTickerUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse ticker:", error);
      }
    });

    eventSource.addEventListener("gainers", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onGainersUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse gainers:", error);
      }
    });

    eventSource.addEventListener("losers", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onLosersUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse losers:", error);
      }
    });

    eventSource.addEventListener("sectors", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onSectorsUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse sectors:", error);
      }
    });

    eventSource.addEventListener("screener", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onScreenerUpdate?.(data);
      } catch (error) {
        console.error("Failed to parse screener:", error);
      }
    });

    eventSource.onerror = () => {
      if (isUnmountedRef.current) return;
      
      setIsConnected(false);
      setIsConnecting(false);
      optionsRef.current.onDisconnect?.();

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = baseDelay * Math.pow(2, reconnectAttempts.current);
        reconnectAttempts.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connect();
          }
        }, delay);
      } else {
        // All SSE reconnects exhausted — fall back to HTTP polling
        startFallbackPolling();
      }
    };
  }, [stopFallbackPolling, startFallbackPolling]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopFallbackPolling();
    setIsConnected(false);
    setIsConnecting(false);
  }, [stopFallbackPolling]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    connect();
  }, [connect, disconnect]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    lastUpdate,
    reconnect,
    disconnect,
  };
}
