"use client";

import { motion } from "framer-motion";
import { Plus, Sparkles, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useModal } from "@/src/hooks/use-modal";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

interface ServerSidebarProps {
  loading?: boolean;
}

export function ServerSidebar({ loading = false }: ServerSidebarProps) {
  const { servers, activeServerId, setActiveServer } = useOrbitNavStore((state) => ({
    servers: state.servers,
    activeServerId: state.activeServerId,
    setActiveServer: state.setActiveServer,
  }));
  const { onOpen } = useModal();

  return (
    <aside className="glass-panel h-full w-[88px] rounded-[1.75rem] border border-white/10 p-2">
      <TooltipProvider>
        <div className="mb-2 flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-10 w-10 rounded-2xl border border-violet-400/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                onClick={() => onOpen("createServer")}
                size="icon"
                variant="ghost"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Create server</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Create server</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-10 w-10 rounded-2xl border border-violet-400/30 bg-white/[0.04] text-violet-100 hover:bg-violet-500/20"
                onClick={() => onOpen("joinServer")}
                size="icon"
                variant="ghost"
              >
                <UserPlus className="h-4 w-4" />
                <span className="sr-only">Join server</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Join by invite</TooltipContent>
          </Tooltip>
        </div>

        <ScrollArea className="h-[calc(100%-6.25rem)]">
          <div className="space-y-2 px-0.5">
            {servers.map((server) => {
              const active = server.id === activeServerId;
              return (
                <Tooltip key={server.id}>
                  <TooltipTrigger asChild>
                    <motion.button
                      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                        active
                          ? "border-violet-300/60 bg-violet-500/20 text-white"
                          : "border-transparent bg-white/[0.04] text-zinc-200 hover:border-white/10 hover:bg-white/[0.08]"
                      }`}
                      onClick={() => setActiveServer(server.id)}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                    >
                      {active ? (
                        <span className="absolute -left-[7px] h-6 w-1 rounded-r-full bg-violet-300" />
                      ) : null}
                      <Avatar className="h-9 w-9 rounded-xl">
                        <AvatarImage alt={server.name} src={server.image_url ?? undefined} />
                        <AvatarFallback className="rounded-xl bg-violet-500/25 text-xs text-violet-100">
                          {server.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{server.name}</TooltipContent>
                </Tooltip>
              );
            })}

            {!loading && servers.length === 0 ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/10 text-zinc-500">
                <Sparkles className="h-4 w-4" />
              </div>
            ) : null}
            {loading ? (
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/[0.08]" />
            ) : null}
          </div>
        </ScrollArea>
      </TooltipProvider>
    </aside>
  );
}
