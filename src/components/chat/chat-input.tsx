"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConversationKey, isImageAttachment, isPdfAttachment } from "@/lib/utils";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitMember, OrbitMessageView, OrbitProfile } from "@/src/types/orbit";

interface ChatInputProps {
  mode: "channel" | "dm";
  conversationId: string | null;
  member: OrbitMember | null;
  profile: OrbitProfile | null;
}

export function ChatInput({
  mode,
  conversationId,
  member,
  profile,
}: ChatInputProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const upsertMessage = useOrbitNavStore((state) => state.upsertMessage);
  const replaceMessage = useOrbitNavStore((state) => state.replaceMessage);
  const removeMessage = useOrbitNavStore((state) => state.removeMessage);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationKey = getConversationKey(mode, conversationId);

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

    setSending(true);
    setError(null);
    setContent("");
    const currentAttachment = attachment;
    setAttachment(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticMessage: OrbitMessageView = {
      id: tempId,
      content: trimmed || null,
      file_url: currentAttachment
        ? attachmentPreview ?? `pending://${encodeURIComponent(currentAttachment.name)}`
        : null,
      member_id: mode === "channel" ? member?.id ?? null : null,
      channel_id: mode === "channel" ? conversationId : null,
      profile_id: mode === "dm" ? profile.id : null,
      thread_id: mode === "dm" ? conversationId : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      optimistic: true,
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
          content: trimmed || null,
          file_url: fileUrl,
          member_id: member?.id ?? null,
          channel_id: conversationId,
        })
        .select("*")
        .single();
      insertError = error?.message ?? null;
      insertedRow = (data as Record<string, unknown> | null) ?? null;
    } else {
      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          content: trimmed || null,
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
      created_at: String(insertedRow.created_at),
      updated_at: String(insertedRow.updated_at),
      optimistic: false,
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
            <img
              alt="Attachment preview"
              className="max-h-40 rounded-lg border border-white/10"
              src={attachmentPreview}
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
              ? "Transmit a message..."
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
    </form>
  );
}
