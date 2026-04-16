"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Search, Plus, TrendingUp, Clock, HelpCircle } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POPULAR_SYMBOLS = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "INFY", name: "Infosys Limited" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "ITC", name: "ITC Limited" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<typeof POPULAR_SYMBOLS>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { addToWatchlist, isInWatchlist } = useWatchlist();

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  React.useEffect(() => {
    if (query.length > 0) {
      const filtered = POPULAR_SYMBOLS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleAddSymbol = (symbol: string, name: string) => {
    addToWatchlist(symbol, name);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-xl">
        <div className="flex items-center border-b px-4">
          <Search className="w-4 h-4 text-muted-foreground mr-3" />
          <Input
            ref={inputRef}
            placeholder="Search symbols or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 text-base"
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase">
                Search Results
              </div>
              {results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleAddSymbol(stock.symbol, stock.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  disabled={isInWatchlist(stock.symbol)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{stock.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {stock.name}
                      </div>
                    </div>
                  </div>
                  {isInWatchlist(stock.symbol) ? (
                    <Badge variant="secondary" className="text-xs">
                      In Watchlist
                    </Badge>
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          ) : query.length === 0 ? (
            <div className="space-y-4">
              <div>
                <div className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase">
                  Popular Symbols
                </div>
                <div className="space-y-1">
                  {POPULAR_SYMBOLS.slice(0, 6).map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => handleAddSymbol(stock.symbol, stock.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                      disabled={isInWatchlist(stock.symbol)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm">{stock.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {stock.name}
                          </div>
                        </div>
                      </div>
                      {isInWatchlist(stock.symbol) ? (
                        <Badge variant="secondary" className="text-xs">
                          In Watchlist
                        </Badge>
                      ) : (
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="px-3 py-2 text-xs text-muted-foreground font-medium uppercase">
                  Quick Actions
                </div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Get AI explanation</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Coming soon
                    </Badge>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">View market history</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Coming soon
                    </Badge>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by symbol or company name</p>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">↵</kbd> Select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Esc</kbd> Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
