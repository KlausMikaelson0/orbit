"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Plus, Server as ServerIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDiscordStore } from "@/store/use-discord-store";
import type { Database, Server } from "@/types";

interface ServerSidebarProps {
  supabase: SupabaseClient<Database>;
  userId: string;
  mobile?: boolean;
  onServerPicked?: () => void;
}

export function ServerSidebar({
  supabase,
  userId,
  mobile = false,
  onServerPicked,
}: ServerSidebarProps) {
  const {
    servers,
    activeServerId,
    setServers,
    setActiveServerId,
    setServerSetupOpen,
  } = useDiscordStore();
  const [loading, setLoading] = useState(true);

  const fetchServers = useCallback(async () => {
    setLoading(true);

    const [ownedServersResult, membershipsResult] = await Promise.all([
      supabase
        .from("servers")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true }),
      supabase.from("members").select("server_id").eq("user_id", userId),
    ]);

    const ownedServers = (ownedServersResult.data ?? []) as Server[];
    const memberServerIds = Array.from(
      new Set((membershipsResult.data ?? []).map((membership) => membership.server_id)),
    );

    let memberServers: Server[] = [];

    if (memberServerIds.length > 0) {
      const { data } = await supabase
        .from("servers")
        .select("*")
        .in("id", memberServerIds)
        .order("created_at", { ascending: true });

      memberServers = (data ?? []) as Server[];
    }

    const mergedById = new Map<string, Server>();
    for (const server of [...ownedServers, ...memberServers]) {
      mergedById.set(server.id, server);
    }

    const merged = Array.from(mergedById.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    setServers(merged);

    if (!merged.length) {
      setActiveServerId(null);
      setLoading(false);
      return;
    }

    if (!activeServerId || !merged.some((server) => server.id === activeServerId)) {
      setActiveServerId(merged[0].id);
    }

    setLoading(false);
  }, [activeServerId, setActiveServerId, setServers, supabase, userId]);

  useEffect(() => {
    void fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel(`servers-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servers" },
        () => void fetchServers(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `user_id=eq.${userId}`,
        },
        () => void fetchServers(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [fetchServers, supabase, userId]);

  return (
    <aside
      className={cn(
        "border-r border-[#202225] bg-[#1e1f22]",
        mobile ? "h-full w-full p-3" : "h-full w-[72px] p-2",
      )}
    >
      <div className={cn("flex items-center", mobile ? "justify-between" : "justify-center")}>
        <div className="text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">
          Servers
        </div>
        <Button
          className="h-8 w-8 rounded-2xl"
          onClick={() => setServerSetupOpen(true)}
          size="icon"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Create server</span>
        </Button>
      </div>

      <ScrollArea className={cn("mt-3", mobile ? "h-[calc(100%-2.5rem)]" : "h-[calc(100%-2.5rem)]")}>
        <TooltipProvider>
          <div
            className={cn(
              "gap-3",
              mobile ? "grid grid-cols-2 sm:grid-cols-3" : "flex flex-col items-center",
            )}
          >
            {!loading && servers.length === 0 ? (
              <p className={cn("text-xs text-[#80848e]", mobile ? "col-span-full" : "text-center")}>
                No servers yet.
              </p>
            ) : null}
            {servers.map((server) => {
              const isActive = server.id === activeServerId;
              const initial = server.name.slice(0, 2).toUpperCase();

              return (
                <Tooltip key={server.id}>
                  <TooltipTrigger asChild>
                    <motion.button
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition",
                        isActive
                          ? "bg-[#5865f2]/20 text-white"
                          : "bg-[#2b2d31] text-[#dbdee1] hover:bg-[#3f4248]",
                        mobile ? "w-full" : "w-12 justify-center rounded-2xl px-0",
                      )}
                      onClick={() => {
                        setActiveServerId(server.id);
                        onServerPicked?.();
                      }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {!mobile && (
                        <span
                          className={cn(
                            "absolute -left-2 h-5 w-1 rounded-r-full bg-white transition-all",
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70",
                          )}
                        />
                      )}
                      <Avatar className={mobile ? "h-8 w-8" : "h-10 w-10"}>
                        <AvatarImage alt={server.name} src={server.image_url ?? undefined} />
                        <AvatarFallback>{initial}</AvatarFallback>
                      </Avatar>
                      {mobile ? (
                        <span className="truncate text-sm font-medium">{server.name}</span>
                      ) : null}
                    </motion.button>
                  </TooltipTrigger>
                  {!mobile ? (
                    <TooltipContent side="right">
                      <p>{server.name}</p>
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              );
            })}
            {loading ? (
              <div className={cn("animate-pulse rounded-md bg-[#2b2d31]", mobile ? "h-10" : "h-12 w-12")} />
            ) : null}
          </div>
        </TooltipProvider>
      </ScrollArea>
    </aside>
  );
}
