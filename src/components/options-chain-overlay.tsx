"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, getChangeColor } from "@/lib/utils";
import type { OptionsChain } from "@/types/market";

interface OptionsChainOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol?: string;
}

const EXPIRY_OPTIONS = ["Weekly (Apr 18)", "Next Weekly (Apr 25)", "Monthly (Apr 30)"];

const generateMockChain = (atmStrike: number): OptionsChain[] => {
  const strikes = [];
  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + i * 50;
    const distanceFromATM = Math.abs(i);
    const baseOI = 50000 + (10 - distanceFromATM) * 10000;

    strikes.push({
      strike,
      ce: {
        oi: baseOI + Math.random() * 20000,
        oiChange: (Math.random() - 0.3) * 5000,
        ltp: i < 0 ? Math.abs(i) * 5 + Math.random() * 2 : Math.max(0.5, 50 - distanceFromATM * 8 + Math.random() * 5),
        iv: 15 + distanceFromATM * 2 + Math.random() * 5,
        volume: Math.floor(Math.random() * 50000),
      },
      pe: {
        oi: baseOI + Math.random() * 20000,
        oiChange: (Math.random() - 0.4) * 5000,
        ltp: i > 0 ? Math.abs(i) * 5 + Math.random() * 2 : Math.max(0.5, 50 - distanceFromATM * 8 + Math.random() * 5),
        iv: 15 + distanceFromATM * 2 + Math.random() * 5,
        volume: Math.floor(Math.random() * 50000),
      },
    });
  }
  return strikes.sort((a, b) => a.strike - b.strike);
};

export function OptionsChainOverlay({
  open,
  onOpenChange,
  symbol = "NIFTY",
}: OptionsChainOverlayProps) {
  const [expiry, setExpiry] = React.useState(EXPIRY_OPTIONS[0]);
  const [chain, setChain] = React.useState<OptionsChain[]>([]);
  const [loading, setLoading] = React.useState(false);

  const atmStrike = symbol === "NIFTY" ? 22800 : symbol === "BANKNIFTY" ? 48500 : 22800;
  const pcr = React.useMemo(() => {
    if (chain.length === 0) return 0;
    const totalCE = chain.reduce((sum, s) => sum + s.ce.oi, 0);
    const totalPE = chain.reduce((sum, s) => sum + s.pe.oi, 0);
    return totalPE / totalCE;
  }, [chain]);

  const maxPain = React.useMemo(() => {
    if (chain.length === 0) return atmStrike;
    return chain[Math.floor(chain.length / 2)].strike;
  }, [chain, atmStrike]);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setTimeout(() => {
        setChain(generateMockChain(atmStrike));
        setLoading(false);
      }, 500);
    }
  }, [open, expiry, atmStrike]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, onOpenChange]);

  const getOIChangeColor = (change: number): string => {
    if (change > 0) return "text-positive";
    if (change < 0) return "text-negative";
    return "text-muted-foreground";
  };

  const isATM = (strike: number): boolean => {
    return strike === atmStrike;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-0 md:top-4 md:left-4 md:right-4 md:bottom-4 bg-background border rounded-t-2xl md:rounded-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Options Chain — {symbol}
                  </h2>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="outline" className="text-xs">
                      PCR: {pcr.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Max Pain: {maxPain.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-background text-sm"
                >
                  {EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading options chain...</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr className="text-muted-foreground">
                      <th className="p-3 text-left font-medium">OI</th>
                      <th className="p-3 text-left font-medium">OI Chg</th>
                      <th className="p-3 text-right font-medium">CE LTP</th>
                      <th className={`p-3 text-center font-bold ${getChangeColor(0)}`}>
                        {atmStrike.toLocaleString()}
                        {isATM(atmStrike) && (
                          <span className="ml-2 text-xs bg-primary/20 px-1 rounded">
                            ATM
                          </span>
                        )}
                      </th>
                      <th className="p-3 text-left font-medium">PE LTP</th>
                      <th className="p-3 text-left font-medium">OI Chg</th>
                      <th className="p-3 text-left font-medium">OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.map((row) => (
                      <tr
                        key={row.strike}
                        className={`border-b hover:bg-muted/30 ${
                          isATM(row.strike) ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-3 font-mono text-xs">
                          {(row.ce.oi / 1000).toFixed(1)}K
                        </td>
                        <td className={`p-3 font-mono text-xs ${getOIChangeColor(row.ce.oiChange)}`}>
                          {row.ce.oiChange > 0 ? "+" : ""}
                          {(row.ce.oiChange / 1000).toFixed(1)}K
                        </td>
                        <td className="p-3 font-mono text-right font-medium">
                          ₹{row.ce.ltp.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-mono font-bold ${getChangeColor(0)}`}>
                            {row.strike.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-medium">
                          ₹{row.pe.ltp.toFixed(2)}
                        </td>
                        <td className={`p-3 font-mono text-xs ${getOIChangeColor(row.pe.oiChange)}`}>
                          {row.pe.oiChange > 0 ? "+" : ""}
                          {(row.pe.oiChange / 1000).toFixed(1)}K
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {(row.pe.oi / 1000).toFixed(1)}K
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t bg-muted/30 shrink-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {chain.length > 0 && (
                    <>
                      Total CE OI:{" "}
                      {(chain.reduce((sum, s) => sum + s.ce.oi, 0) / 1000000).toFixed(2)}M
                    </>
                  )}
                </span>
                <span>Click on a strike to view details</span>
                <span>
                  {chain.length > 0 && (
                    <>
                      Total PE OI:{" "}
                      {(chain.reduce((sum, s) => sum + s.pe.oi, 0) / 1000000).toFixed(2)}M
                    </>
                  )}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
