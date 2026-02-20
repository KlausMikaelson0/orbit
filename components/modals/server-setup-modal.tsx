"use client";

import { FormEvent, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateInviteCode } from "@/lib/utils";
import { useDiscordStore } from "@/store/use-discord-store";
import type { ChannelType, MemberRole, Server } from "@/types";

interface ServerSetupModalProps {
  supabase: SupabaseClient;
  user: User;
}

export function ServerSetupModal({ supabase, user }: ServerSetupModalProps) {
  const { serverSetupOpen, setServerSetupOpen, setActiveServerId } = useDiscordStore();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Server name is required.");
      return;
    }

    setCreating(true);

    try {
      const { data: createdServer, error: createServerError } = await supabase
        .from("servers")
        .insert({
          name: trimmedName,
          image_url: imageUrl.trim() ? imageUrl.trim() : null,
          owner_id: user.id,
          invite_code: generateInviteCode(),
        })
        .select("*")
        .single();

      if (createServerError || !createdServer) {
        throw createServerError ?? new Error("Could not create server.");
      }

      const role: MemberRole = "ADMIN";
      const defaultChannels: { name: string; type: ChannelType }[] = [
        { name: "general", type: "TEXT" },
        { name: "announcements", type: "TEXT" },
        { name: "voice-lounge", type: "AUDIO" },
      ];

      await supabase.from("members").upsert({
        server_id: createdServer.id,
        user_id: user.id,
        role,
      });

      await supabase.from("channels").insert(
        defaultChannels.map((channel) => ({
          server_id: createdServer.id,
          name: channel.name,
          type: channel.type,
        })),
      );

      setActiveServerId((createdServer as Server).id);
      setServerSetupOpen(false);
      setName("");
      setImageUrl("");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create server.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog onOpenChange={setServerSetupOpen} open={serverSetupOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new server</DialogTitle>
          <DialogDescription>
            Spin up a workspace instantly with default text and voice channels.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleCreateServer}>
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Server name"
            value={name}
          />
          <Input
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="Optional server image URL"
            value={imageUrl}
          />
          {error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setServerSetupOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={creating} type="submit">
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Create server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
