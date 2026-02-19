import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isImageAttachment(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
}

export function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
