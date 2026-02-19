"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hash, Mic, Video } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDiscordStore } from "@/store/use-discord-store";
import type { Channel, ChannelType, Database } from "@/types";

interface ChannelsSidebarProps {
  supabase: SupabaseClient<Database>;
  mobile?: boolean;
  onChannelPicked?: () => void;
}

const typeOrder: ChannelType[] = ["TEXT", "AUDIO", "VIDEO"];

const typeLabel: Record<ChannelType, string> = {
  TEXT: "Text Channels",
  AUDIO: "Voice Channels",
  VIDEO: "Video Channels",
};

const typeIcon: Record<ChannelType, typeof Hash> = {
  TEXT: Hash,
  AUDIO: Mic,
  VIDEO: Video,
};

export function ChannelsSidebar({
  supabase,
  mobile = false,
  onChannelPicked,
}: ChannelsSidebarProps) {
  const {
    servers,
    activeServerId,
    activeChannelId,
    channels,
    setChannels,
    setActiveChannelId,
  } = useDiscordStore();
  const [loading, setLoading] = useState(false);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeServerId) ?? null,
    [activeServerId, servers],
  );

  const groupedChannels = useMemo(() => {
    const groups: Record<ChannelType, Channel[]> = {
      TEXT: [],
      AUDIO: [],
      VIDEO: [],
    };

    for (const channel of channels) {
      groups[channel.type].push(channel);
    }

    return groups;
  }, [channels]);

  const fetchChannels = useCallback(async () => {
    if (!activeServerId) {
      setChannels([]);
      setActiveChannelId(null);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", activeServerId)
      .order("created_at", { ascending: true });

    const channelRows = (data ?? []) as Channel[];
    setChannels(channelRows);

    if (!channelRows.length) {
      setActiveChannelId(null);
      setLoading(false);
      return;
    }

    if (!activeChannelId || !channelRows.some((channel) => channel.id === activeChannelId)) {
      const defaultTextChannel =
        channelRows.find((channel) => channel.type === "TEXT") ?? channelRows[0];
      setActiveChannelId(defaultTextChannel.id);
    }

    setLoading(false);
  }, [
    activeChannelId,
    activeServerId,
    setActiveChannelId,
    setChannels,
    supabase,
  ]);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (!activeServerId) {
      return;
    }

    const realtimeChannel = supabase
      .channel(`channels-${activeServerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `server_id=eq.${activeServerId}`,
        },
        () => void fetchChannels(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [activeServerId, fetchChannels, supabase]);

  return (
    <aside
      className={cn(
        "border-r border-[#202225] bg-[#2b2d31]",
        mobile ? "h-full w-full p-4" : "h-full w-[280px]",
      )}
    >
      {activeServer ? (
        <div className={cn("border-b border-[#202225] p-4", mobile && "rounded-md bg-[#313338]")}>
          <h2 className="truncate text-sm font-semibold text-[#f2f3f5]">
            {activeServer.name}
          </h2>
          <p className="mt-1 text-xs text-[#b5bac1]">
            Invite code: {activeServer.invite_code}
          </p>
        </div>
      ) : (
        <div className="p-4 text-sm text-[#80848e]">
          Select a server to see channels.
        </div>
      )}

      <ScrollArea className={cn(mobile ? "h-[calc(100%-4.5rem)]" : "h-[calc(100%-4.5rem)]")}>
        <div className="p-3">
          {typeOrder.map((type) => {
            const rows = groupedChannels[type];
            if (!rows.length && !loading) {
              return null;
            }

            return (
              <section className="mb-5" key={type}>
                <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
                  {typeLabel[type]}
                </h3>
                <div className="space-y-1">
                  {rows.map((channel) => {
                    const isActive = channel.id === activeChannelId;
                    const Icon = typeIcon[channel.type];

                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                          isActive
                            ? "bg-[#3f4248] text-[#f2f3f5]"
                            : "text-[#b5bac1] hover:bg-[#3f4248] hover:text-[#dbdee1]",
                        )}
                        key={channel.id}
                        onClick={() => {
                          setActiveChannelId(channel.id);
                          onChannelPicked?.();
                        }}
                        type="button"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{channel.name}</span>
                      </button>
                    );
                  })}
                  {loading ? (
                    <div className="h-8 animate-pulse rounded-md bg-[#3f4248]" />
                  ) : null}
                </div>
                <Separator className="mt-3" />
              </section>
            );
          })}
          {!loading && activeServer && channels.length === 0 ? (
            <p className="px-2 text-xs text-[#80848e]">
              No channels available in this server.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
