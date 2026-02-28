import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const colorMap: Record<string, string> = {
  CORRECT: "bg-chart-3",
  PRESENT: "bg-chart-2",
  ABSENT: "bg-secondary-background",
};
