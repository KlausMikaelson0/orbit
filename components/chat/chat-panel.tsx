"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { MessageSquare, Server, Sparkles } from "lucide-react";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageItem } from "@/components/chat/message-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDiscordStore } from "@/store/use-discord-store";
import type { Message, MessageWithAuthor } from "@/types";

interface ChatPanelProps {
  supabase: SupabaseClient;
  user: User;
  onOpenServers: () => void;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
}

export function ChatPanel({
  supabase,
  user,
  onOpenServers,
  onOpenChannels,
  onOpenMembers,
}: ChatPanelProps) {
  const {
    servers,
    channels,
    members,
    activeServerId,
    activeChannelId,
    setServers,
    setChannels,
    setMembers,
    setActiveServerId,
    setActiveChannelId,
  } = useDiscordStore();

  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeServerId) ?? null,
    [activeServerId, servers],
  );
  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [activeChannelId, channels],
  );

  const profileByUserId = useMemo(
    () =>
      new Map(
        members
          .filter((member) => member.profile)
          .map((member) => [member.user_id, member.profile]),
      ),
    [members],
  );

  const hydrateMessage = useCallback(
    (message: Message): MessageWithAuthor => ({
      ...message,
      author: profileByUserId.get(message.user_id) ?? null,
    }),
    [profileByUserId],
  );

  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", activeChannelId)
      .order("created_at", { ascending: true })
      .limit(200);

    const messageRows = (data ?? []) as Message[];
    setMessages(messageRows.map(hydrateMessage));
    setLoadingMessages(false);
  }, [activeChannelId, hydrateMessage, supabase]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!activeChannelId) {
      return;
    }

    const realtimeChannel = supabase
      .channel(`messages-${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const inserted = hydrateMessage(payload.new as Message);
          setMessages((current) =>
            [...current.filter((message) => message.id !== inserted.id), inserted].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const updated = hydrateMessage(payload.new as Message);
          setMessages((current) =>
            current.map((message) => (message.id === updated.id ? updated : message)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMessages((current) =>
            current.filter((message) => message.id !== deleted.id),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [activeChannelId, hydrateMessage, supabase]);

  useEffect(() => {
    setMessages((current) =>
      current.map((message) => ({
        ...message,
        author: profileByUserId.get(message.user_id) ?? message.author,
      })),
    );
  }, [profileByUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMessages([]);
    setServers([]);
    setChannels([]);
    setMembers([]);
    setActiveServerId(null);
    setActiveChannelId(null);
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-[#313338]">
      <ChatHeader
        channelName={activeChannel?.name ?? null}
        channelType={activeChannel?.type ?? null}
        memberCount={members.length}
        onOpenChannels={onOpenChannels}
        onOpenMembers={onOpenMembers}
        onOpenServers={onOpenServers}
        onSignOut={() => void handleSignOut()}
        serverName={activeServer?.name ?? null}
      />

      {!activeServer ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-dashed border-[#4f545c] bg-[#2b2d31] p-6 text-center">
            <Server className="mx-auto mb-3 h-8 w-8 text-indigo-300" />
            <h2 className="text-lg font-semibold text-[#f2f3f5]">
              Pick or create a server
            </h2>
            <p className="mt-2 text-sm text-[#b5bac1]">
              Use the servers sidebar to start a workspace and invite collaborators.
            </p>
          </div>
        </div>
      ) : null}

      {activeServer && !activeChannel ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-dashed border-[#4f545c] bg-[#2b2d31] p-6 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-indigo-300" />
            <h2 className="text-lg font-semibold text-[#f2f3f5]">
              Choose a channel
            </h2>
            <p className="mt-2 text-sm text-[#b5bac1]">
              Text, audio, and video channels are available for each server.
            </p>
          </div>
        </div>
      ) : null}

      {activeServer && activeChannel ? (
        <>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2 sm:p-3">
              {messages.map((message) => (
                <MessageItem
                  isOwnMessage={message.user_id === user.id}
                  key={message.id}
                  message={message}
                />
              ))}
              {loadingMessages ? (
                <div className="space-y-2 px-3 py-2">
                  <div className="h-10 animate-pulse rounded-md bg-[#2b2d31]" />
                  <div className="h-10 animate-pulse rounded-md bg-[#2b2d31]" />
                </div>
              ) : null}
              {!loadingMessages && messages.length === 0 ? (
                <div
                  className={cn(
                    "mx-2 rounded-lg border border-dashed border-[#4f545c] bg-[#2b2d31] px-4 py-8 text-center",
                  )}
                >
                  <MessageSquare className="mx-auto mb-2 h-7 w-7 text-indigo-300" />
                  <p className="font-medium text-[#f2f3f5]">
                    Start the conversation
                  </p>
                  <p className="mt-1 text-sm text-[#b5bac1]">
                    Messages appear instantly through Supabase Realtime.
                  </p>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <ChatInput channelId={activeChannel.id} supabase={supabase} userId={user.id} />
        </>
      ) : null}
    </section>
  );
}
