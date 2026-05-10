"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  TrendingUp,
  Search,
  Newspaper,
  Bot,
  BarChart3,
  Building2,
  Calendar,
  Globe,
  Layers,
  MoreHorizontal,
} from "lucide-react";

export type MobileTab = "indices" | "watchlist" | "scanner" | "news" | "copilot";
export type MobileView = "overview" | "fo" | "institutional" | "earnings" | "macro";

interface MobileNavProps {
  activeTab: MobileTab;
  activeView: MobileView;
  onTabChange: (tab: MobileTab) => void;
  onViewChange: (view: MobileView) => void;
  onOpenCopilot?: () => void;
}

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: "indices", label: "Market", icon: Activity },
  { id: "watchlist", label: "Watch", icon: TrendingUp },
  { id: "scanner", label: "Scan", icon: Search },
  { id: "news", label: "News", icon: Newspaper },
  { id: "copilot", label: "AI", icon: Bot },
];

const VIEW_TABS: { id: MobileView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "fo", label: "F&O", icon: BarChart3 },
  { id: "institutional", label: "Institutional", icon: Building2 },
  { id: "earnings", label: "Earnings", icon: Calendar },
  { id: "macro", label: "Macro", icon: Globe },
];

export function MobileNav({
  activeTab,
  activeView,
  onTabChange,
  onViewChange,
  onOpenCopilot,
}: MobileNavProps) {
  const [showViews, setShowViews] = React.useState(false);

  const handleTabClick = (tab: MobileTab) => {
    if (tab === "copilot" && onOpenCopilot) {
      onOpenCopilot();
    } else {
      // Switching to a main tab resets to overview
      onViewChange("overview");
      onTabChange(tab);
    }
  };

  const handleViewClick = (view: MobileView) => {
    onViewChange(view);
    setShowViews(false);
  };

  return (
    <>
      {/* View selector chips — shown when "More" is tapped */}
      {showViews && (
        <div className="md:hidden fixed bottom-16 inset-x-0 z-40 px-3 pb-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-zinc-900/95 backdrop-blur border border-white/10 rounded-xl p-2">
            {VIEW_TABS.map(view => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => handleViewClick(view.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors",
                    isActive
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  )}
                >
                  <Icon size={12} />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && activeView === "overview";

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-colors",
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
          <button
            onClick={() => setShowViews(v => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-lg transition-colors",
              activeView !== "overview"
                ? "text-amber-500"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Views</span>
          </button>
        </div>
      </nav>
    </>
  );
}
