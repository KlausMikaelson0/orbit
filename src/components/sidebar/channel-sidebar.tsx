"use client";

import { FileText, Hash, Mic, Plus, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useModal } from "@/src/hooks/use-modal";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { ChannelType } from "@/src/types/orbit";

const channelTypeIcon: Record<ChannelType, typeof Hash> = {
  TEXT: Hash,
  AUDIO: Mic,
  VIDEO: Video,
};

function channelTypeLabel(type: ChannelType) {
  if (type === "TEXT") return "Text";
  if (type === "AUDIO") return "Audio";
  return "Video";
}

export function ChannelSidebar() {
  const { onOpen } = useModal();
  const { servers, channelsByServer, activeServerId, activeChannelId, setActiveChannel } =
    useOrbitNavStore((state) => ({
      servers: state.servers,
      channelsByServer: state.channelsByServer,
      activeServerId: state.activeServerId,
      activeChannelId: state.activeChannelId,
      setActiveChannel: state.setActiveChannel,
    }));

  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const channels = activeServerId ? channelsByServer[activeServerId] ?? [] : [];

  return (
    <aside className="glass-panel h-full w-[300px] rounded-[1.75rem] border border-white/10 p-3">
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <p className="truncate text-sm font-semibold text-violet-100">
          {activeServer?.name ?? "Select a server"}
        </p>
        <p className="mt-1 truncate text-xs text-zinc-400">
          {activeServer ? `Invite: ${activeServer.invite_code}` : "Join or create a server"}
        </p>
      </div>

      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Channels</p>
        <Button
          className="h-7 w-7 rounded-full"
          disabled={!activeServerId}
          onClick={() => onOpen("createChannel", { serverId: activeServerId ?? undefined })}
          size="icon"
          variant="ghost"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="sr-only">Create channel</span>
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-7.5rem)]">
        <div className="space-y-1">
          {channels.map((channel) => {
            const Icon = channelTypeIcon[channel.type];
            const active = channel.id === activeChannelId;

            return (
              <button
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm transition ${
                  active
                    ? "bg-violet-500/20 text-violet-100"
                    : "text-zinc-300 hover:bg-white/[0.07]"
                }`}
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {channelTypeLabel(channel.type)}
                </span>
              </button>
            );
          })}

          {!activeServer ? (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-zinc-500">
              Pick a server to load its channels.
            </div>
          ) : null}

          {activeServer && channels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-zinc-500">
              No channels yet. Create one to start messaging.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
          <FileText className="h-3.5 w-3.5 text-violet-300" />
          AI-ready note
        </div>
        <p className="text-xs leading-relaxed text-zinc-300">
          Channel metadata is structured for future summaries and agent workflows.
        </p>
      </div>
    </aside>
  );
}
