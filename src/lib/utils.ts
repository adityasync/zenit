import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null, decimals: number = 2): string {
  if (num == null || isNaN(num)) return "0";
  return num.toFixed(decimals);
}

export function formatPercentage(num: number): string {
  const sign = num >= 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function formatVolume(num: number): string {
  if (num >= 1_00_00_000) {
    return `${(num / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (num >= 1_00_000) {
    return `${(num / 1_00_000).toFixed(2)} L`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)} K`;
  }
  return num.toString();
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcDay = now.getUTCDay();
  
  let istHours = utcHours + 5;
  let istMinutes = utcMinutes + 30;
  if (istMinutes >= 60) {
    istHours += 1;
    istMinutes -= 60;
  }
  if (istHours >= 24) {
    istHours -= 24;
  }
  
  const day = istHours < 5 ? (utcDay + 6) % 7 : utcDay;
  
  if (day === 0 || day === 6) return false;
  
  const totalMinutes = istHours * 60 + istMinutes;
  const marketStart = 9 * 60 + 15;
  const marketEnd = 15 * 60 + 30;
  
  return totalMinutes >= marketStart && totalMinutes <= marketEnd;
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-neutral";
}
