import React, { useState, useEffect } from 'react';

export const InstitutionalHistoryCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/institutional?history=30&sectors=false').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  const history = data?.history || [];
  if (history.length === 0) return <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">No historical data yet</div>;
  const maxAbs = Math.max(...history.map((d: any) => Math.max(Math.abs(d.fiiNet || 0), Math.abs(d.diiNet || 0))), 1);
  return (
    <div className="flex-1 flex items-end gap-0.5 overflow-x-auto no-scrollbar pb-6 pt-2">
      {history.map((d: any, i: number) => (
        <div key={i} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1">
          <div className="flex gap-px items-end h-20">
            <div className="w-1.5 bg-emerald-500/60 rounded-t" style={{ height: `${Math.abs(d.fiiNet || 0) / maxAbs * 100}%`, minHeight: 2 }} />
            <div className="w-1.5 bg-blue-500/60 rounded-t" style={{ height: `${Math.abs(d.diiNet || 0) / maxAbs * 100}%`, minHeight: 2 }} />
          </div>
          <span className="text-[7px] text-zinc-600 rotate-45 origin-left">{d.date?.slice(5)}</span>
        </div>
      ))}
      <div className="absolute bottom-0 right-0 flex gap-2 text-[8px]">
        <span className="text-emerald-500">FII</span>
        <span className="text-blue-500">DII</span>
      </div>
    </div>
  );
};
