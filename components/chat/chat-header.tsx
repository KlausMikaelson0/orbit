"use client";

import { Hash, LogOut, Menu, Mic, Users, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/types";

interface ChatHeaderProps {
  serverName: string | null;
  channelName: string | null;
  channelType: ChannelType | null;
  memberCount: number;
  onOpenServers: () => void;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
  onSignOut: () => void;
}

const typeIcon: Record<ChannelType, typeof Hash> = {
  TEXT: Hash,
  AUDIO: Mic,
  VIDEO: Video,
};

export function ChatHeader({
  serverName,
  channelName,
  channelType,
  memberCount,
  onOpenServers,
  onOpenChannels,
  onOpenMembers,
  onSignOut,
}: ChatHeaderProps) {
  const Icon = channelType ? typeIcon[channelType] : Hash;

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#202225] bg-[#313338] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center gap-1 md:hidden">
          <Button
            className="h-8 w-8"
            onClick={onOpenServers}
            size="icon"
            variant="ghost"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open servers</span>
          </Button>
          <Button
            className="h-8 w-8"
            onClick={onOpenChannels}
            size="icon"
            variant="ghost"
          >
            <Hash className="h-4 w-4" />
            <span className="sr-only">Open channels</span>
          </Button>
        </div>

        <Icon className="h-5 w-5 text-[#b5bac1]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#f2f3f5]">
            {channelName ?? "Pick a channel"}
          </p>
          <p className="truncate text-xs text-[#80848e]">
            {serverName ?? "No active server"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          className={cn("h-8 w-8 xl:hidden")}
          onClick={onOpenMembers}
          size="icon"
          variant="ghost"
        >
          <Users className="h-4 w-4" />
          <span className="sr-only">Open members</span>
        </Button>
        <div className="hidden items-center gap-1 rounded-md border border-[#4f545c] px-2 py-1 text-xs text-[#b5bac1] sm:flex">
          <Users className="h-3.5 w-3.5" />
          {memberCount}
        </div>
        <Button
          className="h-8 w-8"
          onClick={onSignOut}
          size="icon"
          variant="ghost"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
