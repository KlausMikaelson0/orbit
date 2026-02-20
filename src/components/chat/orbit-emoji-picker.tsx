"use client";

import { useMemo, useState } from "react";
import { Search, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ORBIT_EMOJI_GROUPS } from "@/src/lib/orbit-emoji";

interface OrbitEmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEmoji: (emoji: string) => void;
}

export function OrbitEmojiPicker({
  open,
  onOpenChange,
  onSelectEmoji,
}: OrbitEmojiPickerProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return ORBIT_EMOJI_GROUPS;
    }
    return ORBIT_EMOJI_GROUPS.map((group) => ({
      ...group,
      emojis: group.emojis.filter((emoji) => emoji.includes(trimmed)),
    })).filter((group) => group.emojis.length > 0);
  }, [query]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl border-white/10 bg-[#0a0b13] p-0 text-zinc-100">
        <DialogHeader className="border-b border-white/10 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smile className="h-4 w-4 text-violet-300" />
            Emoji Picker
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="h-10 rounded-xl border-white/10 bg-black/35 pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emojis..."
              value={query}
            />
          </div>
        </div>

        <ScrollArea className="h-[50vh] px-4 pb-4">
          <div className="space-y-4 pb-3">
            {groups.map((group) => (
              <section key={group.key}>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {group.emojis.map((emoji) => (
                    <button
                      className="h-10 rounded-lg border border-white/10 bg-white/[0.03] text-xl transition hover:border-violet-400/30 hover:bg-violet-500/10"
                      key={`${group.key}-${emoji}`}
                      onClick={() => {
                        onSelectEmoji(emoji);
                        onOpenChange(false);
                      }}
                      type="button"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-zinc-500">
              No emojis found.
            </div>
          ) : null}
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-3">
          <Button className="rounded-full" onClick={() => onOpenChange(false)} variant="ghost">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
