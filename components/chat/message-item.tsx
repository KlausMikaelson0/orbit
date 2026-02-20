"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime, isImageAttachment } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MessageWithAuthor } from "@/types";

interface MessageItemProps {
  message: MessageWithAuthor;
  isOwnMessage: boolean;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const authorName =
    message.author?.display_name ?? message.author?.email ?? "Unknown User";

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-lg px-3 py-2 transition hover:bg-[#2b2d31]/60",
        isOwnMessage && "bg-[#313338]/50",
      )}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage alt={authorName} src={message.author?.avatar_url ?? undefined} />
        <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#f2f3f5]">{authorName}</p>
          <time className="text-xs text-[#80848e]">{formatTime(message.created_at)}</time>
        </div>

        {message.content ? (
          <div className="space-y-2 text-sm leading-relaxed text-[#dbdee1] [&_a]:text-indigo-300 [&_code]:rounded [&_code]:bg-[#1e1f22] [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-[#1e1f22] [&_pre]:p-2 [&_ul]:list-inside [&_ul]:list-disc">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : null}

        {message.file_url ? (
          <div className="mt-2">
            {isImageAttachment(message.file_url) ? (
              <a
                href={message.file_url}
                rel="noreferrer"
                target="_blank"
                title="Open image in new tab"
              >
                <Image
                  alt="Message attachment"
                  className="max-h-72 w-auto rounded-md border border-[#4f545c] object-cover"
                  height={720}
                  src={message.file_url}
                  unoptimized
                  width={960}
                />
              </a>
            ) : (
              <a
                className="inline-flex rounded-md border border-[#4f545c] bg-[#1e1f22] px-3 py-1 text-xs text-indigo-300 hover:text-indigo-200"
                href={message.file_url}
                rel="noreferrer"
                target="_blank"
              >
                Open attachment
              </a>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
