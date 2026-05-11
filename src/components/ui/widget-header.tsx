import React from 'react';
import { Maximize2, Pin } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGrid } from '@/contexts/GridContext';

interface WidgetHeaderProps {
  title: string;
  icon?: LucideIcon;
  extra?: React.ReactNode;
  onExpand?: () => void;
  widgetId?: string;
  pinnable?: boolean;
}

export function WidgetHeader({ title, icon: Icon, extra, onExpand, widgetId, pinnable }: WidgetHeaderProps) {
  const { pinnedWidgets, pinWidget, unpinWidget } = useGrid();
  const isPinned = widgetId ? pinnedWidgets.includes(widgetId) : false;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={12} className="text-zinc-500" />}
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {pinnable && widgetId && (
          <button
            onClick={() => isPinned ? unpinWidget(widgetId) : pinWidget(widgetId)}
            className={`text-zinc-700 hover:text-amber-500 transition-colors p-0.5 rounded hover:bg-white/5 ${isPinned ? 'text-amber-500' : ''}`}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={10} />
          </button>
        )}
        {onExpand && (
          <button onClick={onExpand} className="text-zinc-700 hover:text-amber-500 transition-colors p-0.5 rounded hover:bg-white/5" title="Expand">
            <Maximize2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
