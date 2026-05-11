import React, { useState, useEffect } from 'react';
import { formatNumber } from '@/lib/utils';

export const SectorFlowsCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/institutional').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  const flows = data?.sectorFlows || [];
  if (flows.length === 0) return <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">Loading...</div>;
  return (
    <div className="flex-1 overflow-y-auto space-y-1.5">
      {flows.map((f: any) => (
        <div key={f.sector} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded-lg border border-white/5">
          <div>
            <div className="text-[11px] font-bold text-white">{f.sector}</div>
            <div className="text-[9px] text-zinc-500">{f.name}</div>
          </div>
          <div className="text-right">
            <div className={`text-[11px] font-mono font-bold ${f.trend === 'inflow' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {f.trend === 'inflow' ? '+' : ''}{formatNumber(f.netFlow)} Cr
            </div>
            <div className={`text-[9px] ${f.percentChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {f.percentChange >= 0 ? '+' : ''}{f.percentChange}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
