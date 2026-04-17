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
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const baseDelay = 2000;
  const isUnmountedRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isUnmountedRef.current) return;
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    setIsConnecting(true);

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
      optionsRef.current.onConnect?.();
    });

    eventSource.addEventListener("indices", (event) => {
      if (isUnmountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onIndexUpdate?.(data);
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
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

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
    reconnect,
    disconnect,
  };
}
