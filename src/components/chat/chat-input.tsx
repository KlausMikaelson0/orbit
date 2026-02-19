"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FileText, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConversationKey, isImageAttachment, isPdfAttachment } from "@/lib/utils";
import {
  buildOrbitPollMarkdown,
  parseOrbitSlashCommand,
  requestOrbitSummary,
  scoreOrbitToxicity,
} from "@/src/lib/orbit-bot";
import { moderateOrbitImageFilename } from "@/src/lib/orbit-image-moderation";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMember, OrbitMessageView, OrbitProfile } from "@/src/types/orbit";

interface ChatInputProps {
  mode: "channel" | "dm";
  conversationId: string | null;
  member: OrbitMember | null;
  profile: OrbitProfile | null;
  threadParentId?: string | null;
}

export function ChatInput({
  mode,
  conversationId,
  member,
  profile,
  threadParentId = null,
}: ChatInputProps) {
  const RATE_WINDOW_MS = 10_000;
  const RATE_LIMIT_COUNT = 8;
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const conversationKey = getConversationKey(mode, conversationId);
  const cachedMessages = useOrbitNavStore((state) =>
    conversationKey ? state.messageCache[conversationKey] ?? [] : [],
  );
  const upsertMessage = useOrbitNavStore((state) => state.upsertMessage);
  const replaceMessage = useOrbitNavStore((state) => state.replaceMessage);
  const removeMessage = useOrbitNavStore((state) => state.removeMessage);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const sendTimestampsRef = useRef<number[]>([]);

  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return;
    }

    if (!isImageAttachment(attachment.name)) {
      setAttachmentPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(attachment);
    setAttachmentPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [attachment]);

  async function uploadAttachment(file: File) {
    if (!conversationId || !profile) {
      throw new Error("Missing conversation context.");
    }

    if (file.type.startsWith("image/")) {
      const moderation = moderateOrbitImageFilename(file.name);
      if (!moderation.safe) {
        throw new Error(moderation.reason ?? "Image blocked by moderation.");
      }
    }

    const extension = file.name.split(".").pop() ?? "file";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const cleanBaseName = baseName.replace(/[^\w.-]/g, "_").slice(0, 40);
    const path = `${mode}/${conversationId}/${profile.id}/${Date.now()}-${cleanBaseName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, {
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
    return data.publicUrl;
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversationId || !profile || !conversationKey) {
      return;
    }

    if (mode === "channel" && !member) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed && !attachment) {
      return;
    }

    const now = Date.now();
    sendTimestampsRef.current = sendTimestampsRef.current.filter(
      (timestamp) => now - timestamp < RATE_WINDOW_MS,
    );
    if (sendTimestampsRef.current.length >= RATE_LIMIT_COUNT) {
      setError("Rate limit reached. Please slow down for a few seconds.");
      return;
    }
    sendTimestampsRef.current.push(now);

    setSending(true);
    setError(null);
    setNotice(null);

    let contentToSend = trimmed;
    const command = parseOrbitSlashCommand(trimmed);
    if (command) {
      if (mode !== "channel") {
        setError("Slash commands are available only in server channels.");
        setSending(false);
        return;
      }

      if (command.kind === "summarize") {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error: summaryFetchError } = await supabase
          .from("messages")
          .select(
            "id, content, file_url, member_id, channel_id, thread_parent_id, created_at, updated_at, member:members(id, role, profile_id, server_id, created_at, updated_at, profile:profiles(id, username, tag, full_name, avatar_url, created_at, updated_at))",
          )
          .eq("channel_id", conversationId)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(700);

        if (summaryFetchError) {
          setError(summaryFetchError.message);
          setSending(false);
          return;
        }

        const rows = (data ?? []) as unknown as Array<{
          id: string;
          content: string | null;
          file_url: string | null;
          member_id: string;
          channel_id: string;
          thread_parent_id: string | null;
          created_at: string;
          updated_at: string;
          member?: {
            profile_id: string;
            profile?: OrbitProfile | OrbitProfile[] | null;
          } | null;
        }>;

        const normalized = rows.map((row) => ({
          id: row.id,
          content: row.content,
          file_url: row.file_url,
          member_id: row.member_id,
          channel_id: row.channel_id,
          profile_id: row.member?.profile_id ?? null,
          thread_id: null,
          thread_parent_id: row.thread_parent_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          author: {
            member: null,
            profile: Array.isArray(row.member?.profile)
              ? row.member?.profile[0] ?? null
              : row.member?.profile ?? null,
          },
        })) satisfies OrbitMessageView[];

        const summaryInput = normalized.length
          ? normalized
          : cachedMessages.filter(
              (message) =>
                message.created_at >= since && !message.thread_parent_id,
            );
        const summary = await requestOrbitSummary(summaryInput);
        contentToSend = `🤖 **Orbit-Bot /summarize (24h)**\n\n${summary}`;
      } else if (command.kind === "poll") {
        contentToSend = buildOrbitPollMarkdown(command.question, command.options);
      } else if (command.kind === "clear") {
        const { data: latestRows, error: latestError } = await supabase
          .from("messages")
          .select("id")
          .eq("channel_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(command.count);

        if (latestError) {
          setError(latestError.message);
          setSending(false);
          return;
        }

        const ids = (latestRows ?? []).map((row) => row.id);
        if (!ids.length) {
          setNotice("Orbit-Bot: no messages to clear.");
          setContent("");
          setAttachment(null);
          setSending(false);
          return;
        }

        const { error: clearError } = await supabase
          .from("messages")
          .delete()
          .in("id", ids);

        if (clearError) {
          setError(clearError.message);
          setSending(false);
          return;
        }

        setNotice(`Orbit-Bot cleared ${ids.length} messages.`);
        setContent("");
        setAttachment(null);
        if (attachmentInputRef.current) {
          attachmentInputRef.current.value = "";
        }
        setSending(false);
        return;
      } else if (command.kind === "unknown") {
        setError(`Unknown command: /${command.name}`);
        setSending(false);
        return;
      }
    }

    setContent("");
    const currentAttachment = attachment;
    setAttachment(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: OrbitMessageView = {
      id: tempId,
      content: contentToSend || null,
      file_url: currentAttachment
        ? attachmentPreview ?? `pending://${encodeURIComponent(currentAttachment.name)}`
        : null,
      member_id: mode === "channel" ? member?.id ?? null : null,
      channel_id: mode === "channel" ? conversationId : null,
      profile_id: mode === "dm" ? profile.id : null,
      thread_id: mode === "dm" ? conversationId : null,
      thread_parent_id: mode === "channel" ? threadParentId : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      optimistic: true,
      moderation: contentToSend
        ? (() => {
            const signal = scoreOrbitToxicity(contentToSend);
            return signal.flagged
              ? { score: signal.score, reason: signal.reason }
              : null;
          })()
        : null,
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.type || "application/octet-stream",
          }
        : null,
      author: {
        member: mode === "channel" ? member : null,
        profile,
      },
    };
    upsertMessage(conversationKey, optimisticMessage);

    let fileUrl: string | null = null;
    try {
      if (currentAttachment) {
        fileUrl = await uploadAttachment(currentAttachment);
      }
    } catch (uploadError) {
      removeMessage(conversationKey, tempId);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Attachment upload failed.",
      );
      setSending(false);
      return;
    }

    let insertError: string | null = null;
    let insertedRow: Record<string, unknown> | null = null;

    if (mode === "channel") {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          content: contentToSend || null,
          file_url: fileUrl,
          member_id: member?.id ?? null,
          channel_id: conversationId,
          thread_parent_id: threadParentId,
        })
        .select("*")
        .single();
      insertError = error?.message ?? null;
      insertedRow = (data as Record<string, unknown> | null) ?? null;
    } else {
      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          content: contentToSend || null,
          file_url: fileUrl,
          profile_id: profile.id,
          thread_id: conversationId,
        })
        .select("*")
        .single();
      insertError = error?.message ?? null;
      insertedRow = (data as Record<string, unknown> | null) ?? null;
    }

    if (insertError || !insertedRow) {
      removeMessage(conversationKey, tempId);
      setError(insertError ?? "Unable to send message.");
      setSending(false);
      return;
    }

    const committedMessage: OrbitMessageView = {
      id: String(insertedRow.id),
      content: (insertedRow.content as string | null) ?? null,
      file_url: (insertedRow.file_url as string | null) ?? null,
      member_id:
        mode === "channel" ? ((insertedRow.member_id as string | null) ?? null) : null,
      channel_id:
        mode === "channel" ? ((insertedRow.channel_id as string | null) ?? null) : null,
      profile_id:
        mode === "dm" ? ((insertedRow.profile_id as string | null) ?? profile.id) : null,
      thread_id:
        mode === "dm" ? ((insertedRow.thread_id as string | null) ?? conversationId) : null,
      thread_parent_id:
        mode === "channel"
          ? ((insertedRow.thread_parent_id as string | null) ?? threadParentId)
          : null,
      created_at: String(insertedRow.created_at),
      updated_at: String(insertedRow.updated_at),
      optimistic: false,
      moderation: contentToSend
        ? (() => {
            const signal = scoreOrbitToxicity(contentToSend);
            return signal.flagged
              ? { score: signal.score, reason: signal.reason }
              : null;
          })()
        : null,
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.type || "application/octet-stream",
          }
        : null,
      author: {
        member: mode === "channel" ? member : null,
        profile,
      },
    };

    replaceMessage(conversationKey, tempId, committedMessage);

    if (mode === "channel" && committedMessage.moderation?.score && profile) {
      void supabase.from("message_flags").upsert(
        {
          message_id: committedMessage.id,
          flagged_by: profile.id,
          model: "orbit-sentiment-v1",
          score: committedMessage.moderation.score,
          reason: committedMessage.moderation.reason,
        },
        { onConflict: "message_id,flagged_by,model" },
      );
    }

    setSending(false);
  }

  const isDisabled =
    !conversationId || !profile || (mode === "channel" && !member) || sending;

  return (
    <form className="mt-3" onSubmit={submitMessage}>
      {attachment ? (
        <div className="mb-2 rounded-xl border border-white/10 bg-black/30 p-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="truncate text-xs text-zinc-200">{attachment.name}</p>
            <Button
              className="h-7 w-7 rounded-lg"
              disabled={sending}
              onClick={() => {
                setAttachment(null);
                if (attachmentInputRef.current) {
                  attachmentInputRef.current.value = "";
                }
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {attachmentPreview ? (
            <Image
              alt="Attachment preview"
              className="max-h-40 w-auto rounded-lg border border-white/10"
              height={360}
              src={attachmentPreview}
              unoptimized
              width={640}
            />
          ) : isPdfAttachment(attachment.name) ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-sm text-zinc-300">
              <FileText className="h-4 w-4 text-violet-300" />
              PDF attachment ready
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf"
          className="hidden"
          onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
          ref={attachmentInputRef}
          type="file"
        />
        <Button
          className="h-11 w-11 rounded-xl"
          disabled={isDisabled}
          onClick={() => attachmentInputRef.current?.click()}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Input
          className="h-11 rounded-xl border-white/15 bg-black/35"
          disabled={isDisabled}
          onChange={(event) => setContent(event.target.value)}
          placeholder={
            conversationId
              ? threadParentId
                ? "Reply to thread..."
                : "Transmit a message..."
              : "Select a channel or DM to begin"
          }
          value={content}
        />

        <Button
          className="h-11 w-11 rounded-xl"
          disabled={isDisabled || (!content.trim() && !attachment)}
          size="icon"
          type="submit"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      {notice ? <p className="mt-2 text-xs text-emerald-300">{notice}</p> : null}
      {mode === "channel" && !threadParentId ? (
        <p className="mt-1 text-[11px] text-zinc-500">
          Orbit-Bot commands: /summarize · /clear 20 · /poll Question | Option A | Option B
        </p>
      ) : null}
    </form>
  );
}
