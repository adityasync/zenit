"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface OIWallProps {
  symbol?: "NIFTY" | "BANKNIFTY";
}

interface OIData {
  strikes: number[];
  ceOI: number[];
  peOI: number[];
  atmStrike: number;
}

export function OIWall({ symbol = "NIFTY" }: OIWallProps) {
  const [data, setData] = React.useState<OIData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/options?symbol=${symbol}`);
        if (res.ok) {
          const json = await res.json();

          const strikes = json.chain?.map((c: { strike: number }) => c.strike) || [];
          const ceOI = json.chain?.map((c: { ce: { openInterest: number } | null }) => c.ce?.openInterest || 0) || [];
          const peOI = json.chain?.map((c: { pe: { openInterest: number } | null }) => c.pe?.openInterest || 0) || [];

          setData({
            strikes,
            ceOI,
            peOI,
            atmStrike: json.atmStrike || 0,
          });
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">OI Walls — {symbol}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.strikes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">OI Walls — {symbol}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">No OI data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxOI = Math.max(...data.ceOI, ...data.peOI);
  const maxCE = Math.max(...data.ceOI);
  const maxPE = Math.max(...data.peOI);
  const showStrikes = data.strikes.length <= 30;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">OI Walls — {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-positive/50" />
            <span>CE OI (Max: {(maxCE / 1000).toFixed(0)}K)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-negative/50" />
            <span>PE OI (Max: {(maxPE / 1000).toFixed(0)}K)</span>
          </div>
        </div>

        <div ref={containerRef} className="relative h-48">
          <div className="absolute inset-0 flex">
            <div className="flex-1 flex flex-col justify-end pr-2">
              <div className="space-y-1">
                {data.ceOI.map((oi, i) => {
                  const height = maxOI > 0 ? (oi / maxOI) * 100 : 0;
                  const strike = data.strikes[i];
                  const isATM = strike === data.atmStrike;

                  return (
                    <div
                      key={`ce-${i}`}
                      className="relative"
                      style={{ height: "6px" }}
                    >
                      <div
                        className={`absolute right-0 top-0 bottom-0 bg-positive/70 transition-all duration-300 ${
                          isATM ? "bg-positive" : ""
                        }`}
                        style={{ width: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center gap-1">
              {showStrikes && data.strikes.map((strike, i) => (
                <div
                  key={`label-${i}`}
                  className={`text-[8px] font-mono ${strike === data.atmStrike ? "text-primary font-bold" : "text-muted-foreground"}`}
                >
                  {strike.toLocaleString()}
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-end pl-2">
              <div className="space-y-1">
                {data.peOI.map((oi, i) => {
                  const height = maxOI > 0 ? (oi / maxOI) * 100 : 0;
                  const strike = data.strikes[i];
                  const isATM = strike === data.atmStrike;

                  return (
                    <div
                      key={`pe-${i}`}
                      className="relative"
                      style={{ height: "6px" }}
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 bg-negative/70 transition-all duration-300 ${
                          isATM ? "bg-negative" : ""
                        }`}
                        style={{ width: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 border-l border-dashed border-primary/50 h-full pointer-events-none" />
        </div>

        <div className="mt-4 pt-4 border-t flex justify-center">
          <div className="text-xs text-muted-foreground">
            ATM: <span className="font-mono font-medium">{data.atmStrike.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
