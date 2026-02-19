"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Orbit } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime, isImageAttachment, isPdfAttachment } from "@/lib/utils";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMessage, OrbitMessageView } from "@/src/types/orbit";

interface ChatMessagesProps {
  channelId: string | null;
}

export function ChatMessages({ channelId }: ChatMessagesProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messages = useOrbitNavStore(
    (state) => (channelId ? state.messageCache[channelId] ?? [] : []),
  );
  const setMessages = useOrbitNavStore((state) => state.setMessages);
  const upsertMessage = useOrbitNavStore((state) => state.upsertMessage);
  const removeMessage = useOrbitNavStore((state) => state.removeMessage);

  const hydrateRows = useCallback((rows: unknown[]) => {
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
        created_at: source.created_at,
        updated_at: source.updated_at,
        author: {
          member: source.member ?? null,
          profile: source.member?.profile ?? null,
        },
      } satisfies OrbitMessageView;
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select(
        "id, content, file_url, member_id, channel_id, created_at, updated_at, member:members(id, role, profile_id, server_id, created_at, updated_at, profile:profiles(id, username, full_name, avatar_url, created_at, updated_at))",
      )
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(300);

    setMessages(channelId, hydrateRows(data ?? []));
    setLoading(false);
  }, [channelId, hydrateRows, setMessages, supabase]);

  const hydrateSingleMessage = useCallback(
    async (row: OrbitMessage) => {
      const { data } = await supabase
        .from("messages")
        .select(
          "id, content, file_url, member_id, channel_id, created_at, updated_at, member:members(id, role, profile_id, server_id, created_at, updated_at, profile:profiles(id, username, full_name, avatar_url, created_at, updated_at))",
        )
        .eq("id", row.id)
        .maybeSingle();

      if (!data) {
        return {
          ...row,
          author: {
            member: null,
            profile: null,
          },
        } satisfies OrbitMessageView;
      }

      return hydrateRows([data])[0];
    },
    [hydrateRows, supabase],
  );

  useEffect(() => {
    if (!channelId) {
      return;
    }

    void fetchMessages();
  }, [channelId, fetchMessages]);

  useEffect(() => {
    if (!channelId) {
      return;
    }

    const realtimeChannel = supabase
      .channel(`orbit-messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          void (async () => {
            const hydrated = await hydrateSingleMessage(payload.new as OrbitMessage);
            upsertMessage(channelId, hydrated);
          })();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          void (async () => {
            const hydrated = await hydrateSingleMessage(payload.new as OrbitMessage);
            upsertMessage(channelId, hydrated);
          })();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          removeMessage(channelId, (payload.old as OrbitMessage).id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [channelId, hydrateSingleMessage, removeMessage, supabase, upsertMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  if (!channelId) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
        <p className="text-sm text-zinc-400">Select a channel to start messaging.</p>
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
