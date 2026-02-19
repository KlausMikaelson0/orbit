"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMember, OrbitMessageView, OrbitProfile } from "@/src/types/orbit";

interface ChatInputProps {
  channelId: string | null;
  member: OrbitMember | null;
  profile: OrbitProfile | null;
}

export function ChatInput({ channelId, member, profile }: ChatInputProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const upsertMessage = useOrbitNavStore((state) => state.upsertMessage);
  const replaceMessage = useOrbitNavStore((state) => state.replaceMessage);
  const removeMessage = useOrbitNavStore((state) => state.removeMessage);

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelId || !member) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setSending(true);
    setError(null);
    setContent("");

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: OrbitMessageView = {
      id: tempId,
      content: trimmed,
      file_url: null,
      member_id: member.id,
      channel_id: channelId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      optimistic: true,
      author: {
        member,
        profile,
      },
    };

    upsertMessage(channelId, optimisticMessage);

    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({
        content: trimmed,
        file_url: null,
        member_id: member.id,
        channel_id: channelId,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      removeMessage(channelId, tempId);
      setError(insertError?.message ?? "Unable to send message.");
      setSending(false);
      return;
    }

    const committedMessage: OrbitMessageView = {
      ...data,
      optimistic: false,
      author: {
        member,
        profile,
      },
    };

    replaceMessage(channelId, tempId, committedMessage);
    setSending(false);
  }

  return (
    <form className="mt-3 flex items-center gap-2" onSubmit={submitMessage}>
      <Input
        className="h-11 rounded-xl border-white/15 bg-black/35"
        disabled={!channelId || !member || sending}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          channelId
            ? "Transmit a message to this channel..."
            : "Select a channel to begin"
        }
        value={content}
      />
      <Button
        className="h-11 w-11 rounded-xl"
        disabled={!channelId || !member || !content.trim() || sending}
        size="icon"
        type="submit"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
      </Button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </form>
  );
}
