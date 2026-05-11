"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Layers } from 'lucide-react';

function getColor(pct: number): string {
  if (pct >= 3) return '#166534';
  if (pct >= 2) return '#15803d';
  if (pct >= 1) return '#16a34a';
  if (pct >= 0.25) return '#22c55e';
  if (pct >= -0.25) return '#52525b';
  if (pct >= -1) return '#f87171';
  if (pct >= -2) return '#ef4444';
  if (pct >= -3) return '#dc2626';
  return '#991b1b';
}

interface Tile { x: number; y: number; w: number; h: number; s: string; p: number; pr: number; }

interface Item { s: string; v: number; p: number; pr: number; }

function treemap(items: Item[], x: number, y: number, w: number, h: number): Tile[] {
  let cx = x, cy = y, cw = w, ch = h;
  const out: Tile[] = [];
  
  const sorted = [...items].sort((a, b) => b.v - a.v).filter(i => i.v > 0);
  let remainingValue = sorted.reduce((sum, item) => sum + item.v, 0);
  
  let i = 0;
  while (i < sorted.length) {
    if (cw <= 0 || ch <= 0 || remainingValue <= 0) break;
    
    const vertical = cw > ch; 
    const side = vertical ? ch : cw; 
    
    let rowVal = 0;
    let rowItems: Item[] = [];
    let bestRatio = Infinity;
    
    for (let j = i; j < sorted.length; j++) {
      const item = sorted[j];
      const nextRowVal = rowVal + item.v;
      
      const rowFraction = nextRowVal / remainingValue;
      const rowWidthOrHeight = rowFraction * (vertical ? cw : ch);
      
      if (rowWidthOrHeight <= 0) {
        rowItems.push(item);
        rowVal = nextRowVal;
        continue;
      }
      
      let maxRatio = 0;
      for (let k = i; k <= j; k++) {
         const itemFraction = sorted[k].v / nextRowVal;
         const rectLength = itemFraction * side;
         if (rectLength > 0 && rowWidthOrHeight > 0) {
           const ratio = Math.max(rectLength / rowWidthOrHeight, rowWidthOrHeight / rectLength);
           maxRatio = Math.max(maxRatio, ratio);
         }
      }
      
      if (maxRatio > bestRatio && rowItems.length > 0) {
        break;
      }
      
      rowItems.push(item);
      rowVal = nextRowVal;
      bestRatio = maxRatio;
    }
    
    const rowFraction = rowVal / remainingValue;
    const thickness = rowFraction * (vertical ? cw : ch);
    
    let offset = 0;
    for (const item of rowItems) {
      const itemFraction = item.v / rowVal;
      const length = itemFraction * side;
      // Add a 1px gap internally by returning width/height minus 1 if possible
      const gw = vertical ? thickness : length;
      const gh = vertical ? length : thickness;
      
      if (vertical) {
        out.push({ x: cx, y: cy + offset, w: Math.max(0, gw - 1), h: Math.max(0, gh - 1), s: item.s, p: item.p, pr: item.pr });
      } else {
        out.push({ x: cx + offset, y: cy, w: Math.max(0, gw - 1), h: Math.max(0, gh - 1), s: item.s, p: item.p, pr: item.pr });
      }
      offset += length;
    }
    
    if (vertical) {
      cx += thickness;
      cw -= thickness;
    } else {
      cy += thickness;
      ch -= thickness;
    }
    
    remainingValue -= rowVal;
    i += rowItems.length;
  }
  
  return out;
}

interface Props { data: any; onStockClick?: (s: string) => void; }

export default function StockHeatmap({ data, onStockClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [d, setD] = useState({ w: 800, h: 600 });
  const [t, setT] = useState<Tile[]>([]);
  const [h, setH] = useState<Tile | null>(null);

  useEffect(() => {
    const u = () => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setD({ w: r.width, h: r.height }); } };
    u(); window.addEventListener('resize', u); return () => window.removeEventListener('resize', u);
  }, []);

  useEffect(() => {
    if (data && d.w > 0 && d.h > 0) {
      let s: Item[] = [];
      
      if (data.view === "sectors" && data.groups) {
        // Aggregate stocks into sector blocks — weight by traded value
        Object.entries(data.groups).forEach(([sectorName, stocks]: [string, any]) => {
          if (!stocks.length) return;
          const totalVal = stocks.reduce((sum: number, x: any) => {
            const tv = x.volume > 0 ? x.last_price * x.volume : (x.last_price || 1) * 1e6;
            return sum + Math.max(1, tv);
          }, 0);
          const avgPct = stocks.reduce((sum: number, x: any) => sum + (x.percent_change || 0), 0) / stocks.length;
          s.push({ s: sectorName, v: Math.sqrt(totalVal), p: 0, pr: avgPct });
        });
      } else if (data.stocks) {
        // Map individual company stocks — weight by traded value (price * volume) for realistic sizing;
        // when volume is unavailable, use price as a rough proxy so tiles aren't all identical.
        s = data.stocks.map((x: any) => {
          const tradedValue = x.volume > 0 ? x.last_price * x.volume : (x.last_price || 1) * 1e6;
          return { s: x.symbol, v: Math.sqrt(Math.max(1, tradedValue)), p: x.last_price || 0, pr: x.percent_change || 0 };
        });
      }
      
      if (s.length > 0) {
        setT(treemap(s, 6, 26, d.w - 12, d.h - 52));
      }
    }
  }, [data, d]);

  if (!data?.stocks?.length) return <div className="w-full h-full flex items-center justify-center text-zinc-500"><div className="text-center"><Layers size={48} className="mx-auto mb-2 opacity-50" /><p>Loading...</p></div></div>;

  return (
    <div ref={ref} className="relative w-full h-full bg-zinc-950 rounded-lg overflow-hidden">
      <div className="absolute top-2 left-3 text-[10px] text-zinc-500 font-medium z-10">{data.stocks.length} stocks</div>
      <svg width={d.w} height={d.h} className="overflow-visible">
        {t.map((tile, i) => {
          const show = tile.w > 45 && tile.h > 30;
          const mini = tile.w > 20 && tile.h > 15;
          return (
            <g key={tile.s + i} onClick={() => onStockClick?.(tile.s)} onMouseEnter={() => setH(tile)} onMouseLeave={() => setH(null)} style={{ cursor: 'pointer' }}>
              <rect x={tile.x} y={tile.y} width={tile.w} height={tile.h} fill={getColor(tile.pr)} rx={2} stroke="#09090b" strokeWidth="2" />
              {show && <><text x={tile.x + tile.w / 2} y={tile.y + tile.h / 2 - 2} textAnchor="middle" fill="white" fontSize={Math.min(10, tile.w / 4)} fontWeight="bold">{tile.s}</text><text x={tile.x + tile.w / 2} y={tile.y + tile.h / 2 + 8} textAnchor="middle" fill="white" fontSize={Math.min(8, tile.w / 5)} fontWeight="bold">{tile.pr > 0 ? '+' : ''}{tile.pr.toFixed(1)}%</text></>}
              {mini && !show && <text x={tile.x + tile.w / 2} y={tile.y + tile.h / 2 + 3} textAnchor="middle" fill="white" fontSize={7} fontWeight="bold">{tile.s.slice(0, 4)}</text>}
            </g>
          );
        })}
        {h && <g><rect x={Math.max(5, h.x + h.w / 2 - 65)} y={Math.max(5, h.y - 35)} width={130} height={32} fill="#09090b" stroke="#52525b" rx={4} /><text x={h.x + h.w / 2} y={h.y - 22} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{h.s}</text><text x={h.x + h.w / 2} y={h.y - 8} textAnchor="middle" fill={h.pr >= 0 ? '#4ade80' : '#f87171'} fontSize={10} fontWeight="bold">{h.pr > 0 ? '+' : ''}{h.pr.toFixed(2)}% @ ₹{h.p.toFixed(0)}</text></g>}
      </svg>
      <div className="absolute bottom-2 left-3 flex items-center gap-2 text-[8px]">
        {[['#166534','+3%'],['#16a34a','+1%'],['#52525b','0%'],['#f87171','-1%'],['#dc2626','-3%']].map((x,i) => <div key={i} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:x[0]}} /><span className="text-zinc-500">{x[1]}</span></div>)}
      </div>
    </div>
  );
}