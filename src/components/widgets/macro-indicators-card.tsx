import React, { useState, useEffect } from 'react';
import { Mono } from '@/components/ui/mono';

export const MacroIndicatorsCard = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/macro').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  const macro = data?.macro || {};
  const indicators = [
    { label: 'GDP Growth', value: macro.gdp?.growth, year: macro.gdp?.year, unit: '%' },
    { label: 'GDP Value', value: macro.gdpValue?.valueTrillion, year: macro.gdpValue?.year, unit: 'T USD' },
    { label: 'CPI Inflation', value: macro.cpi?.inflation, year: macro.cpi?.year, unit: '%' },
    { label: 'IIP Growth', value: macro.iip?.growth, year: macro.iip?.year, unit: '%' },
  ];
  return (
    <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
      {indicators.map(ind => (
        <div key={ind.label} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-950/50 rounded-lg border border-white/5 p-2 min-w-0">
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider truncate">{ind.label}</span>
          <Mono className="text-sm font-black text-white">
            {ind.value !== null && ind.value !== undefined ? `${ind.value}${ind.unit}` : '—'}
          </Mono>
          {ind.year && <span className="text-[7px] text-zinc-600">{ind.year}</span>}
        </div>
      ))}
    </div>
  );
};
