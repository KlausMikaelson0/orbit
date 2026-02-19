"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Orbit } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime, getConversationKey, isImageAttachment, isPdfAttachment } from "@/lib/utils";
import {
  notifyOrbitMessage,
  playOrbitPingSound,
} from "@/src/lib/orbit-notifications";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMessage, OrbitMessageView } from "@/src/types/orbit";

interface ChatMessagesProps {
  mode: "channel" | "dm";
  conversationId: string | null;
}

export function ChatMessages({ mode, conversationId }: ChatMessagesProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { ownProfileId, messages, setMessages, removeMessage } =
    useOrbitNavStore((state) => {
      const conversationKey = getConversationKey(mode, conversationId);
      return {
        ownProfileId: state.profile?.id ?? null,
        messages: conversationKey ? state.messageCache[conversationKey] ?? [] : [],
        setMessages: state.setMessages,
        removeMessage: state.removeMessage,
      };
    });

  const conversationKey = getConversationKey(mode, conversationId);

  const hydrateChannelRows = useCallback((rows: unknown[]) => {
    return rows.map((row) => {
      const source = row as {
        id: string;
        content: string | null;
        file_url: string | null;
        member_id: string;
        channel_id: string;
        created_at: string;
        updated_at: string;
        member?: {
          id: string;
          role: "ADMIN" | "MODERATOR" | "GUEST";
          profile_id: string;
          server_id: string;
          created_at: string;
          updated_at: string;
          profile?: {
            id: string;
            username: string | null;
            tag: string | null;
            full_name: string | null;
            avatar_url: string | null;
            created_at: string;
            updated_at: string;
          } | null;
        } | null;
      };

      return {
        id: source.id,
        content: source.content,
        file_url: source.file_url,
        member_id: source.member_id,
        channel_id: source.channel_id,
        profile_id: source.member?.profile_id ?? null,
        thread_id: null,
        created_at: source.created_at,
        updated_at: source.updated_at,
        author: {
          member: source.member ?? null,
          profile: source.member?.profile ?? null,
        },
      } satisfies OrbitMessageView;
    });
  }, []);

  const hydrateDmRows = useCallback((rows: unknown[]) => {
    return rows.map((row) => {
      const source = row as {
        id: string;
        content: string | null;
        file_url: string | null;
        profile_id: string;
        thread_id: string;
        created_at: string;
        updated_at: string;
        profile?: {
          id: string;
          username: string | null;
          tag: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        } | null;
      };

      return {
        id: source.id,
        content: source.content,
        file_url: source.file_url,
        member_id: null,
        channel_id: null,
        profile_id: source.profile_id,
        thread_id: source.thread_id,
        created_at: source.created_at,
        updated_at: source.updated_at,
        author: {
          member: null,
          profile: source.profile ?? null,
        },
      } satisfies OrbitMessageView;
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !conversationKey) {
      return;
    }

    setLoading(true);

    if (mode === "channel") {
      const { data } = await supabase
        .from("messages")
        .select(
          "id, content, file_url, member_id, channel_id, created_at, updated_at, member:members(id, role, profile_id, server_id, created_at, updated_at, profile:profiles(id, username, tag, full_name, avatar_url, created_at, updated_at))",
        )
        .eq("channel_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300);

      setMessages(conversationKey, hydrateChannelRows(data ?? []));
    } else {
      const { data } = await supabase
        .from("dm_messages")
        .select(
          "id, content, file_url, profile_id, thread_id, created_at, updated_at, profile:profiles(id, username, tag, full_name, avatar_url, created_at, updated_at)",
        )
        .eq("thread_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(300);

      setMessages(conversationKey, hydrateDmRows(data ?? []));
    }

    setLoading(false);
  }, [
    conversationId,
    conversationKey,
    hydrateChannelRows,
    hydrateDmRows,
    mode,
    setMessages,
    supabase,
  ]);

  const notifyIfIncoming = useCallback(
    async (message: OrbitMessageView) => {
      if (!ownProfileId) {
        return;
      }

      if (mode === "dm") {
        return;
      }

      const authorId = message.profile_id ?? message.author.profile?.id ?? null;
      if (!authorId || authorId === ownProfileId) {
        return;
      }

      playOrbitPingSound();
      const title = "New channel message";
      const body = message.content ?? "Sent an attachment";
      if (document.hidden) {
        await notifyOrbitMessage(title, body);
      }
    },
    [mode, ownProfileId],
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    void fetchMessages();
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    if (!conversationId || !conversationKey) {
      return;
    }

    if (mode === "channel") {
      const realtimeChannel = supabase
        .channel(`orbit-messages-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${conversationId}`,
          },
          () => {
            void (async () => {
              await fetchMessages();
              const latest =
                useOrbitNavStore.getState().messageCache[conversationKey]?.slice(-1)[0] ?? null;
              if (latest) {
                await notifyIfIncoming(latest);
              }
            })();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${conversationId}`,
          },
          () => void fetchMessages(),
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "messages",
            filter: `channel_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.old as OrbitMessage;
            removeMessage(conversationKey, row.id);
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(realtimeChannel);
      };
    }

    const realtimeDm = supabase
      .channel(`orbit-dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${conversationId}`,
        },
        () => {
          void (async () => {
            await fetchMessages();
            const latest =
              useOrbitNavStore.getState().messageCache[conversationKey]?.slice(-1)[0] ?? null;
            if (latest) {
              await notifyIfIncoming(latest);
            }
          })();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${conversationId}`,
        },
        () => void fetchMessages(),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.old as OrbitMessage;
          removeMessage(conversationKey, row.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeDm);
    };
  }, [
    conversationId,
    conversationKey,
    fetchMessages,
    mode,
    notifyIfIncoming,
    removeMessage,
    setMessages,
    supabase,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
        <p className="text-sm text-zinc-400">Select a channel or DM to start messaging.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full rounded-2xl border border-white/10 bg-black/20">
      <div className="space-y-1 p-3">
        {messages.map((message) => {
          const displayName =
            message.author.profile?.full_name ??
            message.author.profile?.username ??
            "Unknown";

          return (
            <article
              className={`rounded-xl px-3 py-2 transition ${
                message.optimistic ? "bg-violet-500/10" : "hover:bg-white/[0.04]"
              }`}
              key={message.id}
            >
              <div className="mb-1 flex items-center gap-2">
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarImage
                    alt={displayName}
                    src={message.author.profile?.avatar_url ?? undefined}
                  />
                  <AvatarFallback className="rounded-lg bg-violet-500/25 text-[11px] text-violet-100">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium text-violet-100">{displayName}</p>
                <p className="text-[11px] text-zinc-500">{formatTime(message.created_at)}</p>
                {message.optimistic ? (
                  <span className="rounded-full border border-violet-300/35 px-2 py-0.5 text-[10px] text-violet-200">
                    Sending
                  </span>
                ) : null}
              </div>

              {message.content ? (
                <p className="text-sm leading-relaxed text-zinc-200">{message.content}</p>
              ) : null}
              {message.file_url ? <AttachmentPreview message={message} /> : null}
            </article>
          );
        })}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}

        {!loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-zinc-400">
            <Orbit className="h-6 w-6 text-violet-300" />
            <p className="text-sm">No messages yet. Say hello to your crew.</p>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

function AttachmentPreview({ message }: { message: OrbitMessageView }) {
  const fileUrl = message.file_url;
  const attachmentName = message.attachment?.name ?? "Attachment";
  const isPending = fileUrl?.startsWith("pending://") ?? false;
  const resolvedUrl = isPending ? null : fileUrl;
  const isImage =
    isImageAttachment(resolvedUrl) || message.attachment?.mimeType.startsWith("image/");
  const isPdf =
    isPdfAttachment(resolvedUrl) || message.attachment?.mimeType === "application/pdf";

  if (!fileUrl) {
    return null;
  }

  if (isPending) {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
        <FileText className="h-4 w-4 text-violet-300" />
        Uploading {attachmentName}
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={resolvedUrl ?? ""} rel="noreferrer" target="_blank">
        <img
          alt={attachmentName}
          className="mt-2 max-h-72 rounded-lg border border-white/10 object-cover"
          src={resolvedUrl ?? ""}
        />
      </a>
    );
  }

  if (isPdf) {
    return (
      <a
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-violet-200 hover:bg-white/[0.08]"
        href={resolvedUrl ?? ""}
        rel="noreferrer"
        target="_blank"
      >
        <FileText className="h-4 w-4" />
        Open PDF
      </a>
    );
  }

  return (
    <a
      className="mt-2 inline-flex text-xs text-violet-300 hover:text-violet-200"
      href={resolvedUrl ?? ""}
      rel="noreferrer"
      target="_blank"
    >
      Open attachment
    </a>
  );
}
