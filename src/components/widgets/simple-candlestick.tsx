import React from 'react';
import { Activity } from 'lucide-react';

export const SimpleCandlestickChart = ({ height = 180, data = [] }: { height?: number; data?: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-zinc-950/40 rounded border border-white/5 relative overflow-hidden flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-2">
          <Activity className="w-5 h-5 text-zinc-700 animate-pulse" />
          <span className="text-[10px] text-zinc-600 font-mono">No historical data available</span>
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map(c => c.high));
  const min = Math.min(...data.map(c => c.low));
  const range = max - min;
  const getY = (v: number) => height - ((v - min) / (range || 1)) * height;
  const candleWidth = 100 / (data.length || 1);

  return (
    <div className="w-full bg-zinc-950/40 rounded-xl border border-white/5 relative overflow-hidden group" style={{ height }}>
      <svg width="100%" height={height} className="overflow-visible">
        {/* Horizontal Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = height * p;
          const price = max - (p * range);
          return (
            <g key={p}>
              <line x1="0" y1={y} x2="100%" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <text x="4" y={y - 4} className="text-[8px] fill-zinc-700 font-mono">{price.toLocaleString()}</text>
            </g>
          );
        })}

        {/* Candles */}
        {data.map((c, i) => {
          const isGreen = c.close >= c.open;
          const color = isGreen ? "#10b981" : "#ef4444";
          const bodyTop = getY(Math.max(c.open, c.close));
          const bodyBottom = getY(Math.min(c.open, c.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          const centerX = (i + 0.5) * candleWidth;
          const midX = `${centerX}%`;

          return (
            <g key={i}>
              <line
                x1={midX} y1={getY(c.high)}
                x2={midX} y2={getY(c.low)}
                stroke={color} strokeWidth="1" opacity="0.6"
              />
              <rect
                x={`${i * candleWidth + 0.1}%`}
                y={bodyTop}
                width={`${candleWidth - 0.2}%`}
                height={bodyHeight}
                fill={color}
                opacity={isGreen ? "0.3" : "0.5"}
                className="transition-all hover:opacity-100"
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute top-2 right-2 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">90D Historical Stream</div>
    </div>
  );
};
