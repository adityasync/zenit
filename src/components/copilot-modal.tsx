"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/sparkline";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage, getChangeColor } from "@/lib/utils";
import {
  Send,
  Bot,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Newspaper,
} from "lucide-react";

interface CopilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol?: string;
  price?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  deliveryPercent?: number;
  sector?: string;
}

const SUGGESTED_QUERIES = [
  "Why is {symbol} up today?",
  "What's driving the selling?",
  "Is this a delivery breakout?",
  "What does the volume suggest?",
  "Should I be worried about the drop?",
];

export function CopilotModal({
  open,
  onOpenChange,
  symbol = "NIFTY",
  price,
  change,
  percentChange,
  volume,
  deliveryPercent,
  sector,
}: CopilotModalProps) {
  const [query, setQuery] = React.useState("");
  const [response, setResponse] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setResponse(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response]);

  const handleSubmit = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: finalQuery,
          context: {
            symbol,
            price,
            change,
            percentChange,
            volume,
            deliveryPercent,
            sector,
          },
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      setResponse(data.response);
      setQuery("");
    } catch (err) {
      setError("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">ZENIT Copilot</h2>
              <p className="text-xs text-muted-foreground">
                AI-powered market analysis
              </p>
            </div>
          </div>

          {symbol && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <div className="text-xs text-muted-foreground">Symbol</div>
                <div className="font-semibold">{symbol}</div>
              </div>
              {price !== undefined && (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground">Price</div>
                    <div className="font-mono font-semibold">
                      ₹{formatNumber(price)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Change</div>
                    <div className={`font-mono font-semibold ${getChangeColor(change || 0)}`}>
                      {formatPercentage(percentChange || 0)}
                    </div>
                  </div>
                </>
              )}
              {deliveryPercent !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">Delivery %</div>
                  <div className="font-mono font-semibold">
                    {deliveryPercent.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-80 overflow-y-auto p-4 space-y-4">
          {!response && !isLoading && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask me anything about the market:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(q.replace("{symbol}", symbol))}
                    className="text-xs"
                  >
                    {q.replace("{symbol}", symbol)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing market data...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-muted/50 border"
            >
              <div className="flex items-start gap-3">
                <Bot className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {response}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the market..."
              className="flex-1 px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={isLoading || !query.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            AI responses are based on available data and should not be considered financial advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
