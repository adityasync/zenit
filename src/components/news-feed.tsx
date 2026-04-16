"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, Clock, ChevronRight } from "lucide-react";
import type { NewsItem } from "@/types/market";

interface NewsFeedProps {
  symbol?: string;
  limit?: number;
}

export function NewsFeed({ symbol, limit = 15 }: NewsFeedProps) {
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchNews = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = symbol ? `/api/news?symbol=${symbol}` : "/api/news";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNews(Array.isArray(data) ? data.slice(0, limit) : []);
    } catch (err) {
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [symbol, limit]);

  React.useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, [fetchNews]);

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
      "Economic Times": "bg-orange-500/20 text-orange-500",
      NDTV: "bg-red-500/20 text-red-500",
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
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                  {item.headline}
                </h4>
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
