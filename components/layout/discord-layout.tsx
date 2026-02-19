"use client";

import { useEffect } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ChatPanel } from "@/components/chat/chat-panel";
import { ChannelsSidebar } from "@/components/layout/channels-sidebar";
import { MembersSidebar } from "@/components/layout/members-sidebar";
import { ServerSidebar } from "@/components/layout/server-sidebar";
import { ServerSetupModal } from "@/components/modals/server-setup-modal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDiscordStore } from "@/store/use-discord-store";
import type { Database, ProfileStatus } from "@/types";

interface DiscordLayoutProps {
  supabase: SupabaseClient<Database>;
  user: User;
}

export function DiscordLayout({ supabase, user }: DiscordLayoutProps) {
  const { mobilePanels, setMobilePanelOpen } = useDiscordStore();

  useEffect(() => {
    const displayName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : user.email?.split("@")[0] ?? null;
    const avatarUrl =
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;
    const status: ProfileStatus = "ONLINE";

    void supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      avatar_url: avatarUrl,
      status,
    });
  }, [supabase, user]);

  return (
    <main className="h-screen bg-[#313338] text-[#f2f3f5]">
      <div className="hidden h-full md:grid md:grid-cols-[72px_280px_minmax(0,1fr)] xl:grid-cols-[72px_280px_minmax(0,1fr)_240px]">
        <ServerSidebar supabase={supabase} userId={user.id} />
        <ChannelsSidebar supabase={supabase} />
        <ChatPanel
          onOpenChannels={() => setMobilePanelOpen("channels", true)}
          onOpenMembers={() => setMobilePanelOpen("members", true)}
          onOpenServers={() => setMobilePanelOpen("servers", true)}
          supabase={supabase}
          user={user}
        />
        <div className="hidden xl:block">
          <MembersSidebar supabase={supabase} />
        </div>
      </div>

      <div className="flex h-full flex-col md:hidden">
        <ChatPanel
          onOpenChannels={() => setMobilePanelOpen("channels", true)}
          onOpenMembers={() => setMobilePanelOpen("members", true)}
          onOpenServers={() => setMobilePanelOpen("servers", true)}
          supabase={supabase}
          user={user}
        />
      </div>

      <Dialog
        onOpenChange={(open) => setMobilePanelOpen("servers", open)}
        open={mobilePanels.servers}
      >
        <DialogContent className="h-[85vh] max-w-[95vw] p-0 md:hidden">
          <ServerSidebar
            mobile
            onServerPicked={() => setMobilePanelOpen("servers", false)}
            supabase={supabase}
            userId={user.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => setMobilePanelOpen("channels", open)}
        open={mobilePanels.channels}
      >
        <DialogContent className="h-[85vh] max-w-[95vw] p-0 md:hidden">
          <ChannelsSidebar
            mobile
            onChannelPicked={() => setMobilePanelOpen("channels", false)}
            supabase={supabase}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => setMobilePanelOpen("members", open)}
        open={mobilePanels.members}
      >
        <DialogContent className="h-[85vh] max-w-[95vw] p-0 xl:hidden">
          <MembersSidebar mobile supabase={supabase} />
        </DialogContent>
      </Dialog>

      <ServerSetupModal supabase={supabase} user={user} />
    </main>
  );
}
