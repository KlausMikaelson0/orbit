"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Hash, RadioTower, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatInput } from "@/src/components/chat/chat-input";
import { ChatMessages } from "@/src/components/chat/chat-messages";
import { LivekitChannelRoom } from "@/src/components/live/livekit-channel-room";
import { mockChannelSummary } from "@/src/lib/mock-ai-summary";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

export function OrbitChatWorkspace() {
  const {
    servers,
    profile,
    activeServerId,
    activeChannelId,
    channelsByServer,
    membershipsByServer,
    messageCache,
  } = useOrbitNavStore((state) => ({
    servers: state.servers,
    profile: state.profile,
    activeServerId: state.activeServerId,
    activeChannelId: state.activeChannelId,
    channelsByServer: state.channelsByServer,
    membershipsByServer: state.membershipsByServer,
    messageCache: state.messageCache,
  }));
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const activeChannels = activeServerId ? channelsByServer[activeServerId] ?? [] : [];
  const activeChannel =
    activeChannels.find((channel) => channel.id === activeChannelId) ?? null;
  const currentMember = activeServerId
    ? membershipsByServer[activeServerId] ?? null
    : null;
  const recentMessages = useMemo(
    () => (activeChannelId ? messageCache[activeChannelId] ?? [] : []),
    [activeChannelId, messageCache],
  );

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
  }, [activeChannelId]);

  async function summarizeChannel() {
    if (!activeChannelId) {
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    try {
      const text = await mockChannelSummary(recentMessages.slice(-50));
      setSummary(text);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unable to summarize.");
    } finally {
      setSummarizing(false);
    }
  }

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

      {activeChannel ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <BrainCircuit className="h-4 w-4 text-violet-300" />
            Orbit AI summarizer
          </div>
          <Button
            className="rounded-full"
            disabled={summarizing}
            onClick={() => void summarizeChannel()}
            size="sm"
            variant="secondary"
          >
            <Sparkles className="h-4 w-4" />
            {summarizing ? "Summarizing..." : "Summarize Channel"}
          </Button>
        </div>
      ) : null}

      {summary ? (
        <div className="mb-3 rounded-2xl border border-violet-400/35 bg-violet-500/10 p-3">
          <p className="mb-1 text-xs uppercase tracking-[0.14em] text-violet-200">AI Summary</p>
          <p className="text-sm leading-relaxed text-zinc-100">{summary}</p>
        </div>
      ) : null}
      {summaryError ? (
        <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {summaryError}
        </p>
      ) : null}

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
      ) : activeChannel.type === "AUDIO" || activeChannel.type === "VIDEO" ? (
        <div className="min-h-0 flex-1">
          <LivekitChannelRoom
            channelId={activeChannel.id}
            channelType={activeChannel.type}
            displayName={
              profile?.full_name ?? profile?.username ?? currentMember?.id ?? "Orbit User"
            }
            serverId={activeServer.id}
            userId={profile?.id ?? currentMember?.profile_id ?? "guest"}
          />
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
