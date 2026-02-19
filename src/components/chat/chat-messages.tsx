"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Orbit } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type {
  OrbitMember,
  OrbitMessage,
  OrbitMessageView,
  OrbitProfile,
} from "@/src/types/orbit";

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

  const hydrateMessages = useCallback(
    async (rows: OrbitMessage[]) => {
      if (!rows.length) {
        return [] as OrbitMessageView[];
      }

      const memberIds = Array.from(new Set(rows.map((row) => row.member_id)));
      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .in("id", memberIds);
      const members = (memberData ?? []) as OrbitMember[];
      const membersById = new Map(members.map((member) => [member.id, member]));

      const profileIds = Array.from(
        new Set(members.map((member) => member.profile_id)),
      );
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", profileIds);
      const profiles = (profileData ?? []) as OrbitProfile[];
      const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

      return rows.map((row) => {
        const member = membersById.get(row.member_id) ?? null;
        const profile = member ? profilesById.get(member.profile_id) ?? null : null;
        return {
          ...row,
          author: {
            member,
            profile,
          },
        };
      });
    },
    [supabase],
  );

  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(300);

    const hydrated = await hydrateMessages((data ?? []) as OrbitMessage[]);
    setMessages(channelId, hydrated);
    setLoading(false);
  }, [channelId, hydrateMessages, setMessages, supabase]);

  const hydrateSingleMessage = useCallback(
    async (row: OrbitMessage) => {
      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .eq("id", row.member_id)
        .maybeSingle();
      const member = (memberData ?? null) as OrbitMember | null;

      let profile: OrbitProfile | null = null;
      if (member) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", member.profile_id)
          .maybeSingle();
        profile = (profileData ?? null) as OrbitProfile | null;
      }

      return {
        ...row,
        author: {
          member,
          profile,
        },
      } satisfies OrbitMessageView;
    },
    [supabase],
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
              {message.file_url ? (
                <a
                  className="mt-2 inline-flex text-xs text-violet-300 hover:text-violet-200"
                  href={message.file_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open attachment
                </a>
              ) : null}
            </article>
          );
        })}

        {loading ? (
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
