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

  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

export function isPdfAttachment(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return /\.pdf(\?.*)?$/i.test(url);
}

export function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function buildLivekitRoomName(serverId: string, channelId: string) {
  return `orbit-server-${serverId}-channel-${channelId}`;
}
