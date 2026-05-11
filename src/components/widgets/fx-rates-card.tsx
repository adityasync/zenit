import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';

export const FXRatesCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/macro?type=fx').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  const fx = data?.fx || {};
  const pairs = [
    { key: 'usdInr', label: 'USD/INR', flag: '🇺🇸' },
    { key: 'eurInr', label: 'EUR/INR', flag: '🇪🇺' },
    { key: 'gbpInr', label: 'GBP/INR', flag: '🇬🇧' },
    { key: 'jpyInr', label: 'JPY/INR', flag: '🇯🇵' },
  ];
  return (
    <div className="flex-1 flex flex-col gap-2 justify-center">
      {pairs.map(p => (
        <div key={p.key} className="flex items-center justify-between p-2 bg-zinc-950/50 rounded-lg border border-white/5">
          <span className="text-[10px] text-zinc-400">{p.flag} {p.label}</span>
          <Mono className="text-xs font-bold text-white">{fx[p.key] ? fx[p.key].toFixed(2) : '—'}</Mono>
        </div>
      ))}
      <div className="text-[8px] text-zinc-600 text-center mt-1">Source: {fx.source || 'N/A'}</div>
    </div>
  );
};
