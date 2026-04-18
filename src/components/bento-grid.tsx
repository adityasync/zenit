"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/sparkline";
import { useSSE } from "@/hooks/useSSE";
import { formatNumber, formatPercentage, formatVolume, getChangeColor } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import type { IndexData, MarketBreadth, GainerLoser, SectorData } from "@/types/market";

export function BentoGrid() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [gainers, setGainers] = useState<GainerLoser[]>([]);
  const [losers, setLosers] = useState<GainerLoser[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);

  const handleIndexUpdate = useCallback((newIndices: IndexData[]) => {
    setIndices((prev) => {
      const indexMap = new Map(prev.map((i) => [i.symbol, i]));
      for (const idx of newIndices) {
        indexMap.set(idx.symbol, idx);
      }
      return Array.from(indexMap.values());
    });
  }, []);

  const handleBreadthUpdate = useCallback((data: MarketBreadth) => {
    setBreadth(data);
  }, []);

  const handleGainersUpdate = useCallback((data: GainerLoser[]) => {
    setGainers(data);
  }, []);

  const handleLosersUpdate = useCallback((data: GainerLoser[]) => {
    setLosers(data);
  }, []);

  const handleSectorsUpdate = useCallback((data: SectorData[]) => {
    setSectors(data);
  }, []);

  const { isConnected } = useSSE({
    onIndexUpdate: handleIndexUpdate,
    onBreadthUpdate: handleBreadthUpdate,
    onGainersUpdate: handleGainersUpdate,
    onLosersUpdate: handleLosersUpdate,
    onSectorsUpdate: handleSectorsUpdate,
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 lg:col-span-8">
        <IndicesRow indices={indices} />
      </div>

      <div className="col-span-12 lg:col-span-4">
        <MarketBreadthCard breadth={breadth} />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <GainersCard gainers={gainers} />
      </div>

      <div className="col-span-12 lg:col-span-6">
        <LosersCard losers={losers} />
      </div>

      <div className="col-span-12">
        <SectorHeatmap sectors={sectors} />
      </div>
    </div>
  );
}

function IndicesRow({ indices }: { indices: IndexData[] }) {
  const indexOrder = ["NIFTY 50", "NIFTY BANK", "SENSEX", "NIFTY IT", "NIFTY AUTO", "NIFTY PHARMA"];

  const displayIndices = indexOrder.map((name) => ({
    name,
    data: indices.find((i) => i.name === name || i.symbol?.includes(name.replace(" ", ""))),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Market Indices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayIndices.map(({ name, data }) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-1">{name}</div>
              <div className={`font-mono text-lg ${getChangeColor(data?.percentChange || 0)}`}>
                {data ? formatNumber(data.value) : "--"}
              </div>
              <div className={`font-mono text-xs ${getChangeColor(data?.percentChange || 0)}`}>
                {data ? formatPercentage(data.percentChange) : "--"}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketBreadthCard({ breadth }: { breadth: MarketBreadth | null }) {
  const total = breadth ? breadth.advances + breadth.declines + breadth.unchanged : 0;
  const advancePct = total > 0 ? (breadth!.advances / total) * 100 : 0;
  const declinePct = total > 0 ? (breadth!.declines / total) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Market Breadth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-4 rounded-full overflow-hidden bg-muted flex">
          <div
            className="bg-positive transition-all duration-500"
            style={{ width: `${advancePct}%` }}
          />
          <div
            className="bg-negative transition-all duration-500"
            style={{ width: `${declinePct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <div className="text-positive font-mono text-lg flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {breadth?.advances.toLocaleString() || "--"}
            </div>
            <div className="text-xs text-muted-foreground">Advances</div>
          </div>
          <div>
            <div className="text-muted-foreground font-mono text-lg">
              {breadth?.unchanged.toLocaleString() || "--"}
            </div>
            <div className="text-xs text-muted-foreground">Unchanged</div>
          </div>
          <div>
            <div className="text-negative font-mono text-lg flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4" />
              {breadth?.declines.toLocaleString() || "--"}
            </div>
            <div className="text-xs text-muted-foreground">Declines</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GainersCard({ gainers }: { gainers: GainerLoser[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-positive" />
          Top Gainers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {gainers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No gainer data available</p>
            </div>
          ) : (
            gainers.slice(0, 5).map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {formatVolume(stock.volume)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    ₹{formatNumber(stock.ltp)}
                  </div>
                  <div className="font-mono text-xs text-positive">
                    +{(stock.percentChange ?? 0).toFixed(2)}%
                  </div>
                </div>
                <div className="w-20">
                  <Sparkline
                    data={[]}
                    color="#22c55e"
                    width={80}
                    height={24}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LosersCard({ losers }: { losers: GainerLoser[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-negative" />
          Top Losers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {losers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No loser data available</p>
            </div>
          ) : (
            losers.slice(0, 5).map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      Vol: {formatVolume(stock.volume)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">
                    ₹{formatNumber(stock.ltp)}
                  </div>
                  <div className="font-mono text-xs text-negative">
                    {(stock.percentChange ?? 0).toFixed(2)}%
                  </div>
                </div>
                <div className="w-20">
                  <Sparkline
                    data={[]}
                    color="#ef4444"
                    width={80}
                    height={24}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectorHeatmap({ sectors }: { sectors: SectorData[] }) {
  const getSectorDisplayName = (sector: SectorData) => {
    if (sector.name.startsWith("NIFTY ")) {
      return sector.name.replace("NIFTY ", "");
    }
    return sector.symbol || sector.name;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Sector Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sectors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No sector data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {sectors.map((sector, i) => {
              const pct = sector.percentChange;
              const intensity = Math.min(Math.abs(pct) / 2, 1);
              const baseColor = pct >= 0 ? [22, 197, 94] : [239, 68, 68];
              const bgColor = `rgba(${baseColor.join(",")}, ${0.1 + intensity * 0.3})`;
              const borderColor = `rgba(${baseColor.join(",")}, ${0.3 + intensity * 0.5})`;

              return (
                <motion.div
                  key={sector.symbol || sector.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-lg border cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  }}
                >
                  <div className="text-xs font-medium text-center mb-1">
                    {getSectorDisplayName(sector)}
                  </div>
                  <div
                    className={`font-mono text-sm text-center ${pct >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
