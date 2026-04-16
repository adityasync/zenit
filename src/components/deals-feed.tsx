"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface Deal {
  symbol: string;
  name: string;
  client: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  value: number;
  date: string;
}

interface DealsFeedProps {
  type?: "block" | "bulk";
}

export function DealsFeed({ type = "block" }: DealsFeedProps) {
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDeals = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals?type=${type}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDeals(data.deals || []);
    } catch (err) {
      setError("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, [type]);

  React.useEffect(() => {
    fetchDeals();
    const interval = setInterval(fetchDeals, 60000);
    return () => clearInterval(interval);
  }, [fetchDeals]);

  const formatValue = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString()}`;
  };

  const formatQuantity = (qty: number): string => {
    if (qty >= 1000000) return `${(qty / 1000000).toFixed(2)}M`;
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}K`;
    return qty.toLocaleString();
  };

  if (loading && deals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {type === "block" ? "Block Deals" : "Bulk Deals"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {type === "block" ? "Block Deals" : "Bulk Deals"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDeals}
            disabled={loading}
            className="h-auto py-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && deals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDeals} className="mt-3">
              Retry
            </Button>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No {type} deals today</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {deals.map((deal, i) => (
                <motion.div
                  key={`${deal.symbol}-${deal.client}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        deal.type === "BUY" ? "bg-positive/20" : "bg-negative/20"
                      }`}
                    >
                      {deal.type === "BUY" ? (
                        <TrendingUp className="w-4 h-4 text-positive" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-negative" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{deal.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {deal.client} • {formatQuantity(deal.quantity)} shares
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">₹{deal.price.toLocaleString()}</div>
                    <Badge
                      variant={deal.type === "BUY" ? "success" : "destructive"}
                      className="text-xs"
                    >
                      {deal.type}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
