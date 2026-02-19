"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Compass,
  FileText,
  Hash,
  Mic,
  Plus,
  Radio,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/src/hooks/use-media-query";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { ChannelKind } from "@/src/types/orbit";

const kindIcon: Record<ChannelKind, typeof Hash> = {
  CHAT: Hash,
  VOICE: Mic,
  DOCS: FileText,
};

export function DynamicNavigation() {
  const isSmallScreen = useMediaQuery("(max-width: 1279px)");
  const {
    spaces,
    collapsed,
    activeSpaceId,
    activeChannelId,
    toggleCollapsed,
    setActiveSpace,
    setActiveChannel,
  } = useOrbitNavStore();

  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? spaces[0],
    [activeSpaceId, spaces],
  );

  const shouldCollapse = isSmallScreen ? false : collapsed;

  return (
    <motion.aside
      animate={{ width: shouldCollapse ? 92 : 300 }}
      className="glass-panel h-full rounded-[2rem] border border-white/10 bg-black/35 p-3"
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          className="h-9 w-9 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
          size="icon"
          variant="ghost"
        >
          <Compass className="h-4 w-4" />
          <span className="sr-only">Discover</span>
        </Button>
        {!isSmallScreen ? (
          <Button
            className="h-9 w-9 rounded-full"
            onClick={toggleCollapsed}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft
              className={`h-4 w-4 transition ${shouldCollapse ? "rotate-180" : ""}`}
            />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        ) : null}
      </div>

      <ScrollArea className="h-[calc(100%-3.5rem)]">
        <div className="space-y-4">
          <section>
            {!shouldCollapse ? (
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                  Unified Spaces
                </p>
                <Button className="h-7 w-7 rounded-full" size="icon" variant="ghost">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="sr-only">Create space</span>
                </Button>
              </div>
            ) : null}
            <div className="space-y-1.5">
              {spaces.map((space) => {
                const isActive = space.id === activeSpaceId;
                return (
                  <button
                    className={`group flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition ${
                      isActive
                        ? "border-violet-300/50 bg-violet-500/15 text-white"
                        : "border-transparent bg-white/[0.03] text-zinc-300 hover:border-white/10 hover:bg-white/[0.06]"
                    }`}
                    key={space.id}
                    onClick={() => setActiveSpace(space.id)}
                    type="button"
                  >
                    <span
                      className={`h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br ${space.accent}`}
                    />
                    {!shouldCollapse ? (
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{space.name}</span>
                        <span className="block truncate text-[11px] text-zinc-400">
                          {space.tagline}
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {!shouldCollapse && activeSpace ? (
            <section className="pt-2">
              <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                Orbit Channels
              </p>
              <div className="space-y-1">
                {activeSpace.channels.map((channel) => {
                  const Icon = kindIcon[channel.kind];
                  const isActive = channel.id === activeChannelId;

                  return (
                    <button
                      className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-violet-500/20 text-violet-100"
                          : "text-zinc-300 hover:bg-white/[0.06]"
                      }`}
                      key={channel.id}
                      onClick={() => setActiveChannel(channel.id)}
                      type="button"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{channel.name}</span>
                      </span>
                      {channel.unreadCount ? (
                        <span className="rounded-full bg-violet-500/25 px-2 py-0.5 text-[11px] text-violet-200">
                          {channel.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {shouldCollapse ? (
            <div className="pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-center text-[10px] text-zinc-400">
                <Radio className="mx-auto mb-1 h-4 w-4 text-violet-300" />
                Orbit
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </motion.aside>
  );
}
