"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, Clock, ChevronRight, Radio } from "lucide-react";
import type { NewsItem } from "@/types/market";

interface NewsFeedProps {
  symbol?: string;
  limit?: number;
}

export function NewsFeed({ symbol, limit = 15 }: NewsFeedProps) {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLive, setIsLive] = React.useState(false);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchNews = React.useCallback(async () => {
    try {
      const url = symbol ? `/api/news?symbol=${symbol}` : "/api/news";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNews(Array.isArray(data) ? data.slice(0, limit) : []);
      setError(null);
    } catch (err) {
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [symbol, limit]);

  const startSSE = React.useCallback(() => {
    if (eventSourceRef.current) return;

    const evtSource = new EventSource("/api/stream");
    eventSourceRef.current = evtSource;

    evtSource.addEventListener("connected", () => {
      setIsLive(true);
    });

    evtSource.addEventListener("news", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data) && data.length > 0) {
          setNews(data.slice(0, limit));
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to parse news SSE:", err);
      }
    });

    evtSource.onerror = () => {
      setIsLive(false);
      evtSource.close();
      eventSourceRef.current = null;

      // Fall back to polling
      if (!pollIntervalRef.current) {
        fetchNews();
        pollIntervalRef.current = setInterval(fetchNews, 60000); // Poll every minute on fallback
      }
    };
  }, [fetchNews, limit]);

  React.useEffect(() => {
    fetchNews();
    startSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchNews, startSSE]);

  const timeAgo = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSourceColor = (source: string): string => {
    const colors: Record<string, string> = {
      Moneycontrol: "bg-blue-500/20 text-blue-500",
      "ET Markets": "bg-orange-500/20 text-orange-500",
      Pulse: "bg-green-500/20 text-green-500",
      "Business Standard": "bg-purple-500/20 text-purple-500",
      "Financial Express": "bg-yellow-500/20 text-yellow-500",
      Livemint: "bg-pink-500/20 text-pink-500",
    };
    return colors[source] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Market News
            {isLive && <Radio className="w-3 h-3 text-green-500 animate-pulse" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || news.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Market News
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error || "No news available"}</p>
          <Button variant="outline" size="sm" onClick={fetchNews} className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Market News
            {isLive && (
              <Badge className="text-xs bg-green-500/20 text-green-500 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2">
            View All <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {news.map((item, i) => (
              <motion.a
                key={item.id}
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Badge className={`text-xs ${getSourceColor(item.source)}`}>
                    {item.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.timestamp)}
                  </span>
                </div>
                <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {item.headline || item.title}
                </h4>
                {item.symbols && item.symbols.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.symbols.slice(0, 3).map((sym) => (
                      <Badge key={sym} variant="outline" className="text-[10px] py-0 px-1">
                        {sym}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Read more</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
