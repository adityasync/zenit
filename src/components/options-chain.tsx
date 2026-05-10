"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
} from "lucide-react";
import { formatNumber, formatPercentage, getChangeColor } from "@/lib/utils";

interface OptionsData {
  symbol: string;
  underlyingValue: number;
  expiryDates: string[];
  currentExpiry: string;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  maxPainOI: number;
  totalPEOI: number;
  totalCEOI: number;
  chain: Array<{
    strike: number;
    isATM: boolean;
    ce: {
      strikePrice: number;
      openInterest: number;
      changeinOpenInterest: number;
      totalTradedVolume: number;
      impliedVolatility: number;
      lastPrice: number;
      change: number;
      pChange: number;
      bidprice: number;
      askPrice: number;
    } | null;
    pe: {
      strikePrice: number;
      openInterest: number;
      changeinOpenInterest: number;
      totalTradedVolume: number;
      impliedVolatility: number;
      lastPrice: number;
      change: number;
      pChange: number;
      bidprice: number;
      askPrice: number;
    } | null;
  }>;
  timestamp: number;
}

interface OptionsChainProps {
  symbol?: "NIFTY" | "BANKNIFTY";
}

export function OptionsChain({ symbol = "NIFTY" }: OptionsChainProps) {
  const [data, setData] = React.useState<OptionsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedExpiry, setSelectedExpiry] = React.useState<string>("");
  const [showExpirys, setShowExpirys] = React.useState(false);

  const fetchOptions = React.useCallback(async (expiry?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/options?symbol=${symbol}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      if (json.expiryDates?.length > 0 && !selectedExpiry) {
        setSelectedExpiry(json.currentExpiry);
      }
    } catch (err) {
      setError("Failed to load options data");
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedExpiry]);

  React.useEffect(() => {
    fetchOptions();
    const interval = setInterval(() => fetchOptions(selectedExpiry), 30000);
    return () => clearInterval(interval);
  }, [fetchOptions, selectedExpiry]);

  const getPCRColor = (pcr: number): string => {
    if (pcr > 1.2) return "text-positive";
    if (pcr < 0.8) return "text-negative";
    return "text-muted-foreground";
  };

  const getOIChangeColor = (change: number): string => {
    if (change > 0) return "text-positive";
    if (change < 0) return "text-negative";
    return "text-muted-foreground";
  };

  const formatOI = (oi: number): string => {
    if (oi >= 1000000) return `${(oi / 1000000).toFixed(2)}M`;
    if (oi >= 1000) return `${(oi / 1000).toFixed(1)}K`;
    return oi.toString();
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Options Chain — {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Options Chain — {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchOptions()} className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Options Chain — {symbol}
          </CardTitle>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpirys(!showExpirys)}
                className="gap-2"
              >
                {data.currentExpiry}
                <ChevronDown className="w-4 h-4" />
              </Button>
              {showExpirys && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-card border rounded-lg shadow-lg py-1 min-w-32">
                  {data.expiryDates.map((exp) => (
                    <button
                      key={exp}
                      onClick={() => {
                        setSelectedExpiry(exp);
                        setShowExpirys(false);
                        fetchOptions(exp);
                      }}
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted"
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Spot: </span>
                <span className="font-mono font-medium">
                  {formatNumber(data.underlyingValue)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ATM: </span>
                <span className="font-mono font-medium">
                  {data.atmStrike.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">PCR: </span>
                <span className={`font-mono font-medium ${getPCRColor(Number(data.pcr))}`}>
                  {Number(data.pcr).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Pain: </span>
                <span className="font-mono font-medium">
                  {data.maxPain.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="py-2 px-2 text-left font-medium">CE OI</th>
                <th className="py-2 px-2 text-left font-medium">CE Chg</th>
                <th className="py-2 px-2 text-center font-medium">CE LTP</th>
                <th className="py-2 px-4 text-center font-medium bg-muted/50">Strike</th>
                <th className="py-2 px-2 text-center font-medium">PE LTP</th>
                <th className="py-2 px-2 text-left font-medium">PE Chg</th>
                <th className="py-2 px-2 text-left font-medium">PE OI</th>
              </tr>
            </thead>
            <tbody>
              {data.chain.map((row, i) => (
                <motion.tr
                  key={row.strike}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.005, 0.3) }}
                  className={`
                    border-b border-border/50 hover:bg-muted/30 transition-colors
                    ${row.isATM ? "bg-primary/5 font-medium" : ""}
                  `}
                >
                  <td className="py-1.5 px-2 font-mono">
                    {row.ce ? formatOI(row.ce.openInterest) : "-"}
                  </td>
                  <td className={`py-1.5 px-2 font-mono ${row.ce ? getOIChangeColor(row.ce.changeinOpenInterest) : ""}`}>
                    {row.ce ? (
                      <span className="flex items-center gap-1">
                        {row.ce.changeinOpenInterest > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : row.ce.changeinOpenInterest < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {row.ce.changeinOpenInterest > 0 ? "+" : ""}
                        {formatOI(row.ce.changeinOpenInterest)}
                      </span>
                    ) : "-"}
                  </td>
                  <td className={`py-1.5 px-2 font-mono text-center ${row.ce ? getChangeColor(row.ce.change) : ""}`}>
                    {row.ce?.lastPrice?.toFixed(2) || "-"}
                  </td>

                  <td className={`py-1.5 px-4 text-center bg-muted/30 font-mono ${row.isATM ? "bg-primary/10 font-bold" : ""}`}>
                    {row.strike.toLocaleString()}
                  </td>

                  <td className={`py-1.5 px-2 font-mono text-center ${row.pe ? getChangeColor(row.pe.change) : ""}`}>
                    {row.pe?.lastPrice?.toFixed(2) || "-"}
                  </td>
                  <td className={`py-1.5 px-2 font-mono ${row.pe ? getOIChangeColor(row.pe.changeinOpenInterest) : ""}`}>
                    {row.pe ? (
                      <span className="flex items-center gap-1">
                        {row.pe.changeinOpenInterest > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : row.pe.changeinOpenInterest < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {row.pe.changeinOpenInterest > 0 ? "+" : ""}
                        {formatOI(row.pe.changeinOpenInterest)}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="py-1.5 px-2 font-mono">
                    {row.pe ? formatOI(row.pe.openInterest) : "-"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t text-xs">
          <div className="flex gap-4">
            <span className="text-muted-foreground">
              Total CE OI: <span className="font-mono text-positive">{formatOI(data.totalCEOI)}</span>
            </span>
            <span className="text-muted-foreground">
              Total PE OI: <span className="font-mono text-negative">{formatOI(data.totalPEOI)}</span>
            </span>
          </div>
          <div className="text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
