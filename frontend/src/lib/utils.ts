import type { TileStatus } from "@/types/tile-status";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const mapBg: Record<TileStatus, string> = {
  CORRECT: "bg-chart-3",
  PRESENT: "bg-chart-2",
  ABSENT: "bg-secondary-background",
};
