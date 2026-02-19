"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

interface DmHomeViewProps {
  onOpenFriends: () => void;
}

export function DmHomeView({ onOpenFriends }: DmHomeViewProps) {
  const { dmConversations, onlineProfileIds, setActiveDmThread } = useOrbitNavStore(
    (state) => ({
      dmConversations: state.dmConversations,
      onlineProfileIds: state.onlineProfileIds,
      setActiveDmThread: state.setActiveDmThread,
    }),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Home</p>
        <h2 className="text-lg font-semibold text-violet-100">Direct Messages</h2>
      </div>

      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <Button className="rounded-full" onClick={onOpenFriends} variant="secondary">
          Friends
        </Button>
      </div>

      <div className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="space-y-2">
          {dmConversations.map((conversation) => {
            const profile = conversation.otherProfile;
            const displayName = profile.full_name ?? profile.username ?? "Orbit User";
            const online = onlineProfileIds.includes(profile.id);
            return (
              <button
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                key={conversation.thread.id}
                onClick={() => setActiveDmThread(conversation.thread.id)}
                type="button"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{displayName}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {conversation.lastMessage?.content ?? "No messages yet"}
                  </p>
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      online ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                </div>
              </button>
            );
          })}

          {!dmConversations.length ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-zinc-400">
              <MessageCircle className="mx-auto mb-2 h-5 w-5 text-violet-300" />
              <p className="text-sm">No conversations yet. Add friends to start DMs.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
