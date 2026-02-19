"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, BrainCircuit, Hash, RadioTower, Sparkles, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { ServerAnalyticsDashboard } from "@/src/components/analytics/server-analytics-dashboard";
import { ChatInput } from "@/src/components/chat/chat-input";
import { ChatMessages } from "@/src/components/chat/chat-messages";
import { ChannelTasksPanel } from "@/src/components/chat/channel-tasks-panel";
import { useOrbitSocialContext } from "@/src/context/orbit-social-context";
import { requestOrbitSummary } from "@/src/lib/orbit-bot";
import { DmHomeView } from "@/src/components/social/dm-home-view";
import { FriendsView } from "@/src/components/social/friends-view";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMessageView } from "@/src/types/orbit";

const LivekitChannelRoom = dynamic(
  () =>
    import("@/src/components/live/livekit-channel-room").then(
      (mod) => mod.LivekitChannelRoom,
    ),
  { ssr: false },
);

const EMPTY_MESSAGES: OrbitMessageView[] = [];

export function OrbitChatWorkspace() {
  const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    openOrCreateDmWithProfile,
  } = useOrbitSocialContext();
  const {
    activeView,
    servers,
    profile,
    activeServerId,
    activeChannelId,
    activeDmThreadId,
    channelsByServer,
    dmConversations,
    membershipsByServer,
    privacyMode,
    setActiveFriends,
  } = useOrbitNavStore(
    useShallow((state) => ({
      activeView: state.activeView,
      servers: state.servers,
      profile: state.profile,
      activeServerId: state.activeServerId,
      activeChannelId: state.activeChannelId,
      activeDmThreadId: state.activeDmThreadId,
      channelsByServer: state.channelsByServer,
      dmConversations: state.dmConversations,
      membershipsByServer: state.membershipsByServer,
      privacyMode: state.privacyMode,
      setActiveFriends: state.setActiveFriends,
    })),
  );
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [channelSurface, setChannelSurface] = useState<"CHAT" | "TASKS">("CHAT");
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const activeServer = servers.find((server) => server.id === activeServerId) ?? null;
  const activeChannels = activeServerId ? channelsByServer[activeServerId] ?? [] : [];
  const activeChannel =
    activeChannels.find((channel) => channel.id === activeChannelId) ?? null;
  const currentMember = activeServerId
    ? membershipsByServer[activeServerId] ?? null
    : null;
  const canViewAnalytics = Boolean(
    activeServer &&
      profile &&
      activeServer.owner_id === profile.id,
  );
  const activeDmConversation = dmConversations.find(
    (conversation) => conversation.thread.id === activeDmThreadId,
  );
  const isTextServerChannel =
    activeView === "SERVER" && activeChannel?.type === "TEXT";
  const activeConversationKey = useMemo(
    () => {
      if (activeView === "DM_THREAD" && activeDmThreadId) {
        return `dm:${activeDmThreadId}`;
      }
      if (activeView === "SERVER" && activeChannelId) {
        return `channel:${activeChannelId}`;
      }
      return null;
    },
    [activeChannelId, activeDmThreadId, activeView],
  );
  const recentMessages = useOrbitNavStore((state) =>
    activeConversationKey
      ? state.messageCache[activeConversationKey] ?? EMPTY_MESSAGES
      : EMPTY_MESSAGES,
  );
  const threadRootMessage = useMemo(
    () => recentMessages.find((message) => message.id === threadRootId) ?? null,
    [recentMessages, threadRootId],
  );

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
    setThreadRootId(null);
    setChannelSurface("CHAT");
    setShowAnalytics(false);
  }, [activeChannelId, activeDmThreadId]);

  async function summarizeChannel() {
    if (!recentMessages.length) {
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const text = await requestOrbitSummary(
        recentMessages
          .filter(
            (message) =>
              message.created_at >= since && !message.thread_parent_id,
          )
          .slice(-250),
      );
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
            {activeView === "DM_THREAD"
              ? "Direct Message"
              : activeView === "DM_HOME"
                ? "Home"
                : activeView === "FRIENDS"
                  ? "Friends"
                  : activeServer?.name ?? "Unified Space"}
          </p>
          <p className="truncate text-sm font-semibold text-violet-100">
            {activeView === "DM_THREAD"
              ? activeDmConversation?.otherProfile.full_name ??
                activeDmConversation?.otherProfile.username ??
                "Conversation"
              : activeView === "DM_HOME"
                ? "Direct Messages"
                : activeView === "FRIENDS"
                  ? "Relationship Hub"
                  : activeChannel
                    ? `#${activeChannel.name}`
                    : "No active channel"}
          </p>
        </div>
        <div className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] text-violet-200">
          {activeView === "SERVER"
            ? activeChannel?.type ?? "TEXT"
            : activeView === "DM_THREAD"
              ? "DM"
              : "SOCIAL"}
        </div>
      </div>

      {activeView === "SERVER" || activeView === "DM_THREAD" ? (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <BrainCircuit className="h-4 w-4 text-violet-300" />
              Orbit AI summarizer
            </div>
            {isTextServerChannel ? (
              <div className="ml-2 flex items-center gap-1">
                <Button
                  className="rounded-full"
                  onClick={() => setChannelSurface("CHAT")}
                  size="sm"
                  type="button"
                  variant={channelSurface === "CHAT" ? "default" : "secondary"}
                >
                  Chat
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => setChannelSurface("TASKS")}
                  size="sm"
                  type="button"
                  variant={channelSurface === "TASKS" ? "default" : "secondary"}
                >
                  Tasks
                </Button>
              </div>
            ) : null}
            {canViewAnalytics ? (
              <Button
                className="rounded-full"
                onClick={() => setShowAnalytics((value) => !value)}
                size="sm"
                type="button"
                variant={showAnalytics ? "default" : "secondary"}
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            ) : null}
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
      {showAnalytics ? (
        <ServerAnalyticsDashboard
          enabled={canViewAnalytics}
          serverId={activeServer?.id ?? null}
        />
      ) : null}

      {activeView === "FRIENDS" ? (
        <FriendsView
          acceptFriendRequest={acceptFriendRequest}
          declineFriendRequest={declineFriendRequest}
          openOrCreateDmWithProfile={openOrCreateDmWithProfile}
          sendFriendRequest={sendFriendRequest}
        />
      ) : activeView === "DM_HOME" ? (
        <DmHomeView onOpenFriends={setActiveFriends} />
      ) : activeView === "DM_THREAD" ? (
        <>
          <div className={`min-h-0 flex-1 ${privacyMode ? "privacy-shield" : ""}`}>
            <div className="privacy-content h-full">
              <ChatMessages
                conversationId={activeDmConversation?.thread.id ?? null}
                mode="dm"
              />
            </div>
          </div>
          <ChatInput
            conversationId={activeDmConversation?.thread.id ?? null}
            member={null}
            mode="dm"
            profile={profile}
          />
        </>
      ) : !activeServer ? (
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
        channelSurface === "TASKS" && isTextServerChannel ? (
          <ChannelTasksPanel
            channelId={activeChannel.id}
            profileId={profile?.id ?? null}
          />
        ) : (
          <>
            <div className={`min-h-0 flex-1 ${privacyMode ? "privacy-shield" : ""}`}>
              <div className="privacy-content h-full">
                <ChatMessages
                  conversationId={activeChannel.id}
                  mode="channel"
                  onOpenThread={(message) => setThreadRootId(message.id)}
                />
              </div>
            </div>
            <ChatInput
              conversationId={activeChannel.id}
              member={currentMember}
              mode="channel"
              profile={profile}
            />

            {threadRootId && threadRootMessage ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Threaded replies
                    </p>
                    <p className="truncate text-sm text-zinc-200">
                      {threadRootMessage.content ?? "Attachment thread"}
                    </p>
                  </div>
                  <Button
                    className="rounded-full"
                    onClick={() => setThreadRootId(null)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="h-64">
                  <ChatMessages
                    conversationId={activeChannel.id}
                    mode="channel"
                    threadParentId={threadRootId}
                    useCacheOnly
                  />
                </div>
                <ChatInput
                  conversationId={activeChannel.id}
                  member={currentMember}
                  mode="channel"
                  profile={profile}
                  threadParentId={threadRootId}
                />
              </div>
            ) : null}
          </>
        )
      )}
    </div>
  );
}
