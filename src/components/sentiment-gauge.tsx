"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Gauge, TrendingUp, TrendingDown } from "lucide-react";
import type { SentimentData } from "@/types/market";

interface SentimentGaugeProps {
  compact?: boolean;
}

export function SentimentGauge({ compact = false }: SentimentGaugeProps) {
  const [data, setData] = React.useState<SentimentData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchSentiment = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sentiment");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      setData({
        score: 55,
        label: "Neutral",
        topTickers: [],
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 600000);
    return () => clearInterval(interval);
  }, [fetchSentiment]);

  const getScoreColor = (score: number): string => {
    if (score < 20) return "#ef4444";
    if (score < 40) return "#f97316";
    if (score < 60) return "#eab308";
    if (score < 80) return "#22c55e";
    return "#10b981";
  };

  const getLabelColor = (label: string): string => {
    if (label.includes("Fear")) return "text-negative";
    if (label.includes("Greed")) return "text-positive";
    return "text-muted-foreground";
  };

  const score = data?.score ?? 50;
  const label = data?.label ?? "Neutral";
  const color = getScoreColor(score);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Retail Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={`${score}, 100`}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold">
            {score}
          </span>
        </div>
        <div>
          <div className={`font-medium ${getLabelColor(label)}`}>{label}</div>
          <div className="text-xs text-muted-foreground">Retail Sentiment</div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Retail Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score}, 100`}
                className="transition-all duration-1000"
                style={{
                  filter: `drop-shadow(0 0 8px ${color}50)`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold">{score}</span>
              <span className={`text-xs ${getLabelColor(label)}`}>{label}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mb-4 px-2">
          <span className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-negative" />
            Fear
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-positive" />
            Greed
          </span>
        </div>

        {data?.topTickers && data.topTickers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Trending on Reddit
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.topTickers.slice(0, 5).map((ticker, i) => (
                <motion.div
                  key={ticker.symbol}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Badge
                    variant={(ticker.bullishRatio ?? 0.5) > 0.5 ? "success" : "destructive"}
                    className="text-xs"
                  >
                    {ticker.symbol}
                    <span className="ml-1 opacity-70">{ticker.mentions}</span>
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Based on r/IndianStreetBets sentiment analysis
        </p>
      </CardContent>
    </Card>
  );
}
