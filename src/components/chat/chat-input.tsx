"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isImageAttachment, isPdfAttachment } from "@/lib/utils";
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
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!channelId || !member) {
      throw new Error("Missing channel or membership context.");
    }

    const extension = file.name.split(".").pop() ?? "file";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const cleanBaseName = baseName.replace(/[^\w.-]/g, "_").slice(0, 40);
    const path = `${channelId}/${member.profile_id}/${Date.now()}-${cleanBaseName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-attachments")
      .upload(path, file, {
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("message-attachments")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelId || !member) {
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
        ? attachmentPreview ??
          `pending://${encodeURIComponent(currentAttachment.name)}`
        : null,
      member_id: member.id,
      channel_id: channelId,
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
        member,
        profile,
      },
    };

    upsertMessage(channelId, optimisticMessage);

    let fileUrl: string | null = null;
    try {
      if (currentAttachment) {
        fileUrl = await uploadAttachment(currentAttachment);
      }
    } catch (uploadError) {
      removeMessage(channelId, tempId);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Attachment upload failed.",
      );
      setSending(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({
        content: trimmed || null,
        file_url: fileUrl,
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
      attachment: currentAttachment
        ? {
            name: currentAttachment.name,
            mimeType: currentAttachment.type || "application/octet-stream",
          }
        : null,
    };

    replaceMessage(channelId, tempId, committedMessage);
    setSending(false);
  }

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
          disabled={!channelId || !member || sending}
          onClick={() => attachmentInputRef.current?.click()}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

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
          disabled={
            !channelId || !member || (!content.trim() && !attachment) || sending
          }
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
