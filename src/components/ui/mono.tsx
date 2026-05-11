import React from 'react';

export const Mono = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-tighter ${className}`} style={{ fontVariantNumeric: 'tabular-nums' } as React.CSSProperties}>{children}</span>
);
