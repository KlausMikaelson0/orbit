"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2, Paperclip, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isImageAttachment } from "@/lib/utils";

interface ChatInputProps {
  supabase: SupabaseClient;
  channelId: string;
  userId: string;
}

export function ChatInput({ supabase, channelId, userId }: ChatInputProps) {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!attachment || !isImageAttachment(attachment.name)) {
      return null;
    }

    return URL.createObjectURL(attachment);
  }, [attachment]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function uploadAttachment(file: File) {
    const extension = file.name.split(".").pop() ?? "file";
    const path = `${channelId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file, {
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSend() {
    const trimmed = content.trim();

    if (!trimmed && !attachment) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      let fileUrl: string | null = null;

      if (attachment) {
        fileUrl = await uploadAttachment(attachment);
      }

      const { error: insertError } = await supabase.from("messages").insert({
        channel_id: channelId,
        user_id: userId,
        content: trimmed.length ? trimmed : null,
        file_url: fileUrl,
      });

      if (insertError) {
        throw insertError;
      }

      setContent("");
      setAttachment(null);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    } catch (messageError) {
      setError(
        messageError instanceof Error
          ? messageError.message
          : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSend();
  }

  return (
    <div className="border-t border-[#202225] bg-[#313338] p-3">
      {attachment ? (
        <div className="mb-3 rounded-lg border border-[#4f545c] bg-[#2b2d31] p-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="truncate text-xs text-[#dbdee1]">{attachment.name}</p>
            <Button
              className="h-7 w-7"
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
              <span className="sr-only">Remove attachment</span>
            </Button>
          </div>
          {previewUrl ? (
            <Image
              alt="Attachment preview"
              className="max-h-44 rounded-md border border-[#4f545c]"
              height={320}
              src={previewUrl}
              unoptimized
              width={640}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          className="hidden"
          onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
          ref={attachmentInputRef}
          type="file"
        />
        <Button
          className="h-10 w-10 shrink-0"
          onClick={() => attachmentInputRef.current?.click()}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>
        <Textarea
          className="min-h-10 resize-none"
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message this channel..."
          rows={1}
          value={content}
        />
        <Button
          className="h-10 w-10 shrink-0"
          disabled={sending}
          onClick={() => void handleSend()}
          size="icon"
          type="button"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
