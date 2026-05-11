import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';

export const RBIRatesCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/macro').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  const rbi = data?.macro?.rbiRates || {};
  const rates = [
    { label: 'Repo', value: rbi.repo },
    { label: 'Reverse Repo', value: rbi.reverseRepo },
    { label: 'CRR', value: rbi.crr },
    { label: 'SLR', value: rbi.slr },
    { label: 'MSF', value: rbi.msf },
    { label: 'Bank Rate', value: rbi.bankRate },
  ];
  return (
    <div className="flex-1 flex flex-col gap-1.5 justify-center">
      {rates.map(r => (
        <div key={r.label} className="flex items-center justify-between px-2 py-1.5 bg-zinc-950/50 rounded border border-white/5">
          <span className="text-[9px] text-zinc-500">{r.label}</span>
          <Mono className="text-[11px] font-bold text-white">{r.value ? `${r.value}%` : '—'}</Mono>
        </div>
      ))}
      {rbi.lastPolicyDate && <div className="text-[8px] text-zinc-600 text-center mt-1">Last: {rbi.lastPolicyDate}</div>}
    </div>
  );
};
