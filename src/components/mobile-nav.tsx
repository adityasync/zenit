"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  TrendingUp,
  Search,
  Newspaper,
  Bot,
} from "lucide-react";

export type MobileTab = "indices" | "watchlist" | "scanner" | "news" | "copilot";

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenCopilot?: () => void;
  onOpenCommand?: () => void;
  onOpenOptions?: () => void;
}

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: "indices", label: "Indices", icon: Activity },
  { id: "watchlist", label: "Watchlist", icon: TrendingUp },
  { id: "scanner", label: "Scanner", icon: Search },
  { id: "news", label: "News", icon: Newspaper },
  { id: "copilot", label: "AI", icon: Bot },
];

export function MobileNav({
  activeTab,
  onTabChange,
  onOpenCopilot,
  onOpenOptions,
}: MobileNavProps) {
  const handleTabClick = (tab: MobileTab) => {
    if (tab === "copilot" && onOpenCopilot) {
      onOpenCopilot();
    } else {
      onTabChange(tab);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileTabContent({
  activeTab,
  children,
}: {
  activeTab: MobileTab;
  children: Record<MobileTab, React.ReactNode>;
}) {
  return (
    <div className="md:hidden">
      {children[activeTab]}
    </div>
  );
}
