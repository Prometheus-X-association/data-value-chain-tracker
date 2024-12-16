import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | bigint): string {
  const secondsNum = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  const days = Math.floor(secondsNum / 86400);
  return days === 1 ? '1 day' : `${days} days`;
}
