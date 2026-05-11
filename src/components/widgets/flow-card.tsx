import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';
import { formatNumber } from '@/lib/utils';

export const FlowCard = () => {
  const [flow, setFlow] = useState<any>(null);
  useEffect(() => {
    fetch('/api/flow').then(r => r.json()).then(setFlow).catch(() => {});
  }, []);
  if (!flow || flow.error) return <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-600">Flow data unavailable</div>;
  return (
    <div className="flex-1 flex flex-col gap-3 justify-center p-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center"><div className="text-[9px] text-zinc-500">PCR</div><Mono className="text-lg font-black text-white">{flow.pcr}</Mono></div>
        <div className="text-center"><div className="text-[9px] text-zinc-500">Delta</div><Mono className={`text-lg font-black ${flow.delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{flow.delta}%</Mono></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center"><div className="text-[9px] text-zinc-500">Call OI</div><Mono className="text-xs text-white">{formatNumber(flow.callOI)}</Mono></div>
        <div className="text-center"><div className="text-[9px] text-zinc-500">Put OI</div><Mono className="text-xs text-white">{formatNumber(flow.putOI)}</Mono></div>
      </div>
      <div className="text-center"><div className="text-[9px] text-zinc-500">IV</div><Mono className="text-xs text-amber-500">{flow.impliedVol}%</Mono></div>
    </div>
  );
};
