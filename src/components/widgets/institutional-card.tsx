import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';
import { formatNumber } from '@/lib/utils';

export const InstitutionalCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/institutional?sectors=false').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  if (!data) return <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">Loading...</div>;
  const fii = data.fii || {};
  const dii = data.dii || {};
  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-950/50 rounded-lg p-3 border border-white/5">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">FII Net</div>
          <Mono className={`text-xl font-black ${(fii.net || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {(fii.net || 0) >= 0 ? '+' : ''}{formatNumber(fii.net || 0)} Cr
          </Mono>
          <div className="flex justify-between mt-2 text-[9px]">
            <span className="text-emerald-500">Buy: {formatNumber(fii.buyValue || 0)}</span>
            <span className="text-rose-500">Sell: {formatNumber(fii.sellValue || 0)}</span>
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-3 border border-white/5">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">DII Net</div>
          <Mono className={`text-xl font-black ${(dii.net || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {(dii.net || 0) >= 0 ? '+' : ''}{formatNumber(dii.net || 0)} Cr
          </Mono>
          <div className="flex justify-between mt-2 text-[9px]">
            <span className="text-emerald-500">Buy: {formatNumber(dii.buyValue || 0)}</span>
            <span className="text-rose-500">Sell: {formatNumber(dii.sellValue || 0)}</span>
          </div>
        </div>
      </div>
      <div className="text-[8px] text-zinc-600 text-center">{data.date} · {data.status === 'live' ? 'Live' : data.status}</div>
    </div>
  );
};
