import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';

export const VIXCard = () => {
  const [vix, setVix] = useState<any>(null);
  useEffect(() => {
    fetch('/api/vix').then(r => r.json()).then(setVix).catch(() => {});
  }, []);
  if (!vix || vix.error) return <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">VIX data unavailable</div>;
  return (
    <div className="flex-1 flex flex-col justify-center items-center gap-2">
      <Mono className="text-3xl font-black text-amber-500">{vix.vix}</Mono>
      <span className={`text-xs font-bold ${parseFloat(vix.change) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {parseFloat(vix.change) >= 0 ? '+' : ''}{vix.change} ({vix.percentChange}%)
      </span>
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${vix.regime === 'HIGH' ? 'bg-rose-500/20 text-rose-500' : vix.regime === 'LOW' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-500/20 text-zinc-400'}`}>
        {vix.regime}
      </span>
      <div className="text-[9px] text-zinc-600 mt-1">Implied Move: {vix.impliedMove}%</div>
    </div>
  );
};
