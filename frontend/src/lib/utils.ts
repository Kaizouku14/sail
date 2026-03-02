import type { TileStatus } from "@/types/game.types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusStyles: Record<TileStatus, string> = {
  CORRECT: "bg-chart-3 border-chart-3 text-neutral-100",
  PRESENT: "bg-chart-2 border-chart-2 text-neutral-100",
  ABSENT:
    "bg-secondary-background border-secondary-background text-neutral-100",
  ACTIVE: "bg-transparent border-foreground text-foreground",
  EMPTY: "bg-transparent border-border/40 text-transparent",
  PENDING:
    "bg-transparent border-foreground/50 text-foreground/70 animate-pulse",
};
