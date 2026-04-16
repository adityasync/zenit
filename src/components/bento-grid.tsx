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

const SECTOR_COLORS: Record<string, string> = {
  BFSI: "#3b82f6",
  IT: "#8b5cf6",
  AUTO: "#f59e0b",
  PHARMA: "#10b981",
  METAL: "#6366f1",
  FMCG: "#ec4899",
  ENERGY: "#f97316",
  REALTY: "#14b8a6",
  MEDIA: "#a855f7",
};

const INITIAL_INDICES: IndexData[] = [
  { symbol: "NIFTY50", name: "NIFTY 50", value: 22850, change: 45, percentChange: 0.2, timestamp: Date.now() },
  { symbol: "NIFTYBANK", name: "NIFTY BANK", value: 48500, change: -120, percentChange: -0.25, timestamp: Date.now() },
  { symbol: "SENSEX", name: "SENSEX", value: 75500, change: 150, percentChange: 0.2, timestamp: Date.now() },
  { symbol: "NIFTYIT", name: "NIFTY IT", value: 41500, change: -85, percentChange: -0.2, timestamp: Date.now() },
  { symbol: "NIFTYAUTO", name: "NIFTY AUTO", value: 24500, change: 65, percentChange: 0.27, timestamp: Date.now() },
  { symbol: "NIFTYPHARMA", name: "NIFTY PHARMA", value: 18200, change: -30, percentChange: -0.16, timestamp: Date.now() },
];

const INITIAL_GAINERS: GainerLoser[] = [
  { symbol: "RELIANCE", ltp: 2950, percentChange: 3.5, volume: 15000000, volumeRatio: 2.1, sector: "Energy" },
  { symbol: "TCS", ltp: 3850, percentChange: 2.8, volume: 8000000, volumeRatio: 1.8, sector: "IT" },
  { symbol: "INFY", ltp: 1520, percentChange: 2.3, volume: 12000000, volumeRatio: 2.5, sector: "IT" },
  { symbol: "HDFCBANK", ltp: 1680, percentChange: 1.9, volume: 9500000, volumeRatio: 1.6, sector: "Banking" },
  { symbol: "LT", ltp: 3450, percentChange: 1.5, volume: 6000000, volumeRatio: 1.4, sector: "Infrastructure" },
];

const INITIAL_LOSERS: GainerLoser[] = [
  { symbol: "TATASTEEL", ltp: 145, percentChange: -2.5, volume: 18000000, volumeRatio: 2.2, sector: "Steel" },
  { symbol: "JSWSTEEL", ltp: 890, percentChange: -1.8, volume: 12000000, volumeRatio: 1.9, sector: "Steel" },
  { symbol: "HINDALCO", ltp: 580, percentChange: -1.5, volume: 9000000, volumeRatio: 1.5, sector: "Metal" },
  { symbol: "ADANIPORTS", ltp: 1250, percentChange: -1.2, volume: 7000000, volumeRatio: 1.3, sector: "Infrastructure" },
  { symbol: "SBILIFE", ltp: 1450, percentChange: -0.9, volume: 4000000, volumeRatio: 1.2, sector: "Insurance" },
];

const INITIAL_BREADTH: MarketBreadth = {
  advances: 1520,
  declines: 780,
  unchanged: 45,
  timestamp: Date.now(),
};

export function BentoGrid() {
  const [indices, setIndices] = useState<IndexData[]>(INITIAL_INDICES);
  const [breadth, setBreadth] = useState<MarketBreadth | null>(INITIAL_BREADTH);
  const [gainers, setGainers] = useState<GainerLoser[]>(INITIAL_GAINERS);
  const [losers, setLosers] = useState<GainerLoser[]>(INITIAL_LOSERS);
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
  const advancePct = breadth ? (breadth.advances / total) * 100 : 33;
  const declinePct = breadth ? (breadth.declines / total) * 100 : 33;

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
              <p className="text-sm">Loading gainers...</p>
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
                    data={generateMockSparkline(stock.percentChange ?? 0)}
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
              <p className="text-sm">Loading losers...</p>
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
                    data={generateMockSparkline(stock.percentChange ?? 0)}
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
  const defaultSectors: SectorData[] = [
    { name: "NIFTY BFSI", symbol: "BFSI", value: 45000, percentChange: 0.8 },
    { name: "NIFTY IT", symbol: "IT", value: 38000, percentChange: -0.3 },
    { name: "NIFTY AUTO", symbol: "AUTO", value: 24000, percentChange: 1.2 },
    { name: "NIFTY PHARMA", symbol: "PHARMA", value: 18000, percentChange: -0.5 },
    { name: "NIFTY METAL", symbol: "METAL", value: 8500, percentChange: 2.1 },
    { name: "NIFTY FMCG", symbol: "FMCG", value: 52000, percentChange: 0.2 },
    { name: "NIFTY ENERGY", symbol: "ENERGY", value: 28000, percentChange: -0.8 },
    { name: "NIFTY REALTY", symbol: "REALTY", value: 750, percentChange: 1.5 },
  ];

  const displaySectors = sectors.length > 0 ? sectors : defaultSectors;

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
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {displaySectors.map((sector, i) => {
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
      </CardContent>
    </Card>
  );
}

function generateMockSparkline(trend: number): number[] {
  const points = 15;
  const data: number[] = [];
  let value = 100;

  for (let i = 0; i < points; i++) {
    const volatility = 2;
    const trendBias = trend > 0 ? 0.3 : trend < 0 ? -0.3 : 0;
    value += (Math.random() - 0.5 + trendBias) * volatility;
    data.push(Math.max(0, value));
  }

  return data;
}
