"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Activity, BarChart3, Newspaper, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercentage, formatVolume, getChangeColor } from "@/lib/utils";
import type { StockQuote, NewsItem } from "@/types/market";

interface StockDetailPanelProps {
  symbol?: string;
  ticker?: StockQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCopilot?: (symbol: string, ticker?: StockQuote) => void;
}

const MOCK_FUNDAMENTALS = {
  pe: 24.5,
  pb: 3.2,
  roce: 18.5,
  de: 0.45,
  promoter: 49.2,
  eps: 125.5,
};

const MOCK_DELIVERY_TREND = [45, 52, 48, 55, 61, 58, 65, 70, 62, 68];

export function StockDetailPanel({
  symbol,
  ticker,
  open,
  onOpenChange,
  onOpenCopilot,
}: StockDetailPanelProps) {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = React.useState(false);

  React.useEffect(() => {
    if (open && symbol) {
      fetchNews(symbol);
    }
  }, [open, symbol]);

  const fetchNews = async (sym: string) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/news?symbol=${sym}`);
      if (res.ok) {
        const data = await res.json();
        setNews(Array.isArray(data) ? data.slice(0, 10) : []);
      }
    } catch {
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const timeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const maxDelivery = Math.max(...MOCK_DELIVERY_TREND);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[40%] bg-background border-l z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{symbol}</h2>
                {ticker && (
                  <div className={`font-mono text-sm ${getChangeColor(ticker.change)}`}>
                    {ticker.change >= 0 ? "+" : ""}
                    {formatNumber(ticker.change)} ({formatPercentage(ticker.percentChange)})
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {symbol && onOpenCopilot && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenCopilot(symbol, ticker || undefined)}
                  >
                    Ask AI
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {ticker && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-mono text-4xl font-bold">
                          ₹{formatNumber(ticker.ltp)}
                        </div>
                        <div className={`text-lg font-mono ${getChangeColor(ticker.change)}`}>
                          {ticker.change >= 0 ? "+" : ""}
                          {formatNumber(ticker.change)}
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 text-2xl ${getChangeColor(ticker.change)}`}>
                        {ticker.change >= 0 ? (
                          <TrendingUp className="w-6 h-6" />
                        ) : (
                          <TrendingDown className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Open</div>
                        <div className="font-mono">₹{formatNumber(ticker.open)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">High</div>
                        <div className="font-mono text-positive">₹{formatNumber(ticker.high)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Low</div>
                        <div className="font-mono text-negative">₹{formatNumber(ticker.low)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Volume</div>
                        <div className="font-mono">{formatVolume(ticker.volume)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Fundamentals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">PE Ratio</div>
                      <div className="font-mono font-semibold">{MOCK_FUNDAMENTALS.pe}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">P/B</div>
                      <div className="font-mono font-semibold">{MOCK_FUNDAMENTALS.pb}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">ROCE</div>
                      <div className="font-mono font-semibold">{MOCK_FUNDAMENTALS.roce}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">D/E</div>
                      <div className="font-mono font-semibold">{MOCK_FUNDAMENTALS.de}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Promoter %</div>
                      <div className="font-mono font-semibold">{MOCK_FUNDAMENTALS.promoter}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">EPS</div>
                      <div className="font-mono font-semibold">₹{MOCK_FUNDAMENTALS.eps}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Delivery % (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-20">
                    {MOCK_DELIVERY_TREND.map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t"
                        style={{ height: `${(value / maxDelivery) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>30d ago</span>
                    <span>Today</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    Related News
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingNews ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : news.length > 0 ? (
                    <div className="space-y-3">
                      {news.map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {item.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(item.timestamp)}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium line-clamp-2">
                            {item.headline}
                          </h4>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No news available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
