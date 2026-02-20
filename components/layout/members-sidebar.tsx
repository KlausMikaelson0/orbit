"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CircleDot, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDiscordStore } from "@/store/use-discord-store";
import type { Member, MemberRole, MemberWithProfile, Profile } from "@/types";

interface MembersSidebarProps {
  supabase: SupabaseClient;
  mobile?: boolean;
}

const roleVariant: Record<MemberRole, "admin" | "moderator" | "guest"> = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  GUEST: "guest",
};

export function MembersSidebar({ supabase, mobile = false }: MembersSidebarProps) {
  const { activeServerId, members, setMembers } = useDiscordStore();
  const [loading, setLoading] = useState(false);

  const groupedMembers = useMemo(() => {
    const groups: Record<MemberRole, MemberWithProfile[]> = {
      ADMIN: [],
      MODERATOR: [],
      GUEST: [],
    };

    for (const member of members) {
      groups[member.role].push(member);
    }

    return groups;
  }, [members]);

  const fetchMembers = useCallback(async () => {
    if (!activeServerId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("server_id", activeServerId)
      .order("created_at", { ascending: true });

    const memberRows = (memberData ?? []) as Member[];
    const profileIds = Array.from(new Set(memberRows.map((member) => member.user_id)));
    let profiles: Profile[] = [];

    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", profileIds);

      profiles = (profileData ?? []) as Profile[];
    }

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const rows: MemberWithProfile[] = memberRows.map((member) => ({
      ...member,
      profile: profileById.get(member.user_id) ?? null,
    }));

    setMembers(rows);
    setLoading(false);
  }, [activeServerId, setMembers, supabase]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (!activeServerId) {
      return;
    }

    const realtimeChannel = supabase
      .channel(`members-${activeServerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `server_id=eq.${activeServerId}`,
        },
        () => void fetchMembers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void fetchMembers(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [activeServerId, fetchMembers, supabase]);

  return (
    <aside
      className={cn(
        "border-l border-[#202225] bg-[#2b2d31]",
        mobile ? "h-full w-full p-4" : "h-full w-[240px] p-3",
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <Users className="h-4 w-4 text-[#b5bac1]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">
          Members ({members.length})
        </p>
      </div>

      <ScrollArea className={cn(mobile ? "h-[calc(100%-2rem)]" : "h-[calc(100%-2rem)]")}>
        <div className="space-y-3">
          {(["ADMIN", "MODERATOR", "GUEST"] as MemberRole[]).map((role) => {
            const rows = groupedMembers[role];
            if (!rows.length && !loading) {
              return null;
            }

            return (
              <section key={role}>
                <h4 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
                  {role}
                </h4>
                <div className="space-y-1">
                  {rows.map((member) => {
                    const displayName =
                      member.profile?.display_name ??
                      member.profile?.email ??
                      "Unknown User";

                    return (
                      <div
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-[#313338]"
                        key={member.id}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              alt={displayName}
                              src={member.profile?.avatar_url ?? undefined}
                            />
                            <AvatarFallback>
                              {displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-[#dbdee1]">
                              {displayName}
                            </p>
                            <p className="flex items-center gap-1 text-[11px] text-[#80848e]">
                              <CircleDot className="h-3 w-3 text-emerald-400" />
                              {member.profile?.status ?? "ONLINE"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={roleVariant[member.role]}>{member.role}</Badge>
                      </div>
                    );
                  })}
                  {loading ? (
                    <div className="h-10 animate-pulse rounded-md bg-[#3f4248]" />
                  ) : null}
                </div>
              </section>
            );
          })}
          {!loading && !members.length ? (
            <p className="px-2 text-xs text-[#80848e]">
              No members in this server yet.
            </p>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
