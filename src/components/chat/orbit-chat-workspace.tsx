"use client";

import { Hash, RadioTower } from "lucide-react";

import { ChatInput } from "@/src/components/chat/chat-input";
import { ChatMessages } from "@/src/components/chat/chat-messages";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

export function OrbitChatWorkspace() {
  const {
    servers,
    profile,
    activeServerId,
    activeChannelId,
    channelsByServer,
    membershipsByServer,
  } = useOrbitNavStore((state) => ({
    servers: state.servers,
    profile: state.profile,
    activeServerId: state.activeServerId,
    activeChannelId: state.activeChannelId,
    channelsByServer: state.channelsByServer,
    membershipsByServer: state.membershipsByServer,
  }));

  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const activeChannels = activeServerId ? channelsByServer[activeServerId] ?? [] : [];
  const activeChannel =
    activeChannels.find((channel) => channel.id === activeChannelId) ?? null;
  const currentMember = activeServerId
    ? membershipsByServer[activeServerId] ?? null
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.16em] text-zinc-400">
            {activeServer?.name ?? "Unified Space"}
          </p>
          <p className="truncate text-sm font-semibold text-violet-100">
            {activeChannel ? `#${activeChannel.name}` : "No active channel"}
          </p>
        </div>
        <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] text-violet-200">
          {activeChannel?.type ?? "TEXT"}
        </div>
      </div>

      {!activeServer ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-zinc-400">
          <div className="text-center">
            <RadioTower className="mx-auto mb-2 h-6 w-6 text-violet-300" />
            <p className="text-sm">Create or join a server to begin.</p>
          </div>
        </div>
      ) : !activeChannel ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-zinc-400">
          <div className="text-center">
            <Hash className="mx-auto mb-2 h-6 w-6 text-violet-300" />
            <p className="text-sm">Create a channel in this server.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <ChatMessages channelId={activeChannel.id} />
          </div>
          <ChatInput
            channelId={activeChannel.id}
            member={currentMember}
            profile={profile}
          />
        </>
      )}
    </div>
  );
}
