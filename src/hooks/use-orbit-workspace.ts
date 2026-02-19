"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { generateInviteCode } from "@/lib/utils";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type {
  ChannelType,
  OrbitChannel,
  OrbitMember,
  OrbitProfile,
  OrbitServer,
} from "@/src/types/orbit";

interface WorkspaceActionResult<T = void> {
  data?: T;
  error?: string;
}

interface MembershipRow extends OrbitMember {
  server: OrbitServer | OrbitServer[] | null;
}

export function useOrbitWorkspace(user: User | null) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const activeServerId = useOrbitNavStore((state) => state.activeServerId);
  const setProfile = useOrbitNavStore((state) => state.setProfile);
  const setServersWithMemberships = useOrbitNavStore(
    (state) => state.setServersWithMemberships,
  );
  const setChannels = useOrbitNavStore((state) => state.setChannels);
  const setActiveServer = useOrbitNavStore((state) => state.setActiveServer);
  const setActiveChannel = useOrbitNavStore((state) => state.setActiveChannel);
  const upsertServer = useOrbitNavStore((state) => state.upsertServer);
  const upsertChannel = useOrbitNavStore((state) => state.upsertChannel);

  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const ensureProfile = useCallback(async () => {
    if (!user) {
      return;
    }

    const fallbackName = user.email?.split("@")[0] ?? "orbit";
    const username = `${fallbackName}_${user.id.slice(0, 6)}`.toLowerCase();

    const { data } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username,
          full_name:
            (typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : null) ?? fallbackName,
          avatar_url:
            typeof user.user_metadata?.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : null,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (data) {
      setProfile(data as OrbitProfile);
    }
  }, [setProfile, supabase, user]);

  const fetchServers = useCallback(async () => {
    if (!user) {
      setServersWithMemberships([]);
      setActiveServer(null);
      setLoadingServers(false);
      return;
    }

    setLoadingServers(true);

    const { data } = await supabase
      .from("members")
      .select(
        "id, role, profile_id, server_id, created_at, updated_at, server:servers(id, name, image_url, invite_code, owner_id, created_at, updated_at)",
      )
      .eq("profile_id", user.id)
      .order("created_at", { ascending: true });

    const rows = (data ?? []) as unknown as MembershipRow[];
    const formatted = rows
      .map((row) => ({
        ...row,
        server: Array.isArray(row.server) ? row.server[0] ?? null : row.server,
      }))
      .filter((row): row is MembershipRow & { server: OrbitServer } => Boolean(row.server))
      .map((row) => ({
        member: {
          id: row.id,
          role: row.role,
          profile_id: row.profile_id,
          server_id: row.server_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        server: row.server,
      }));

    setServersWithMemberships(formatted);

    if (!formatted.length) {
      setActiveServer(null);
      setLoadingServers(false);
      return;
    }

    const store = useOrbitNavStore.getState();
    const activeId = store.activeServerId;
    if (!activeId || !formatted.some((row) => row.server.id === activeId)) {
      setActiveServer(formatted[0].server.id);
    }

    setLoadingServers(false);
  }, [setActiveServer, setServersWithMemberships, supabase, user]);

  const fetchChannels = useCallback(
    async (serverId: string | null) => {
      if (!serverId) {
        return;
      }

      setLoadingChannels(true);
      const { data } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("created_at", { ascending: true });

      setChannels(serverId, (data ?? []) as OrbitChannel[]);
      setLoadingChannels(false);
    },
    [setChannels, supabase],
  );

  useEffect(() => {
    void ensureProfile();
    void fetchServers();
  }, [ensureProfile, fetchServers]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const membershipChannel = supabase
      .channel(`orbit-memberships-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `profile_id=eq.${user.id}`,
        },
        () => void fetchServers(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servers" },
        () => void fetchServers(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(membershipChannel);
    };
  }, [fetchServers, supabase, user]);

  useEffect(() => {
    if (!activeServerId) {
      setActiveChannel(null);
      return;
    }

    // Channel list is refreshed whenever server changes.
    void fetchChannels(activeServerId);
  }, [activeServerId, fetchChannels, setActiveChannel]);

  useEffect(() => {
    if (!activeServerId) {
      return;
    }

    const channelsRealtime = supabase
      .channel(`orbit-channels-${activeServerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `server_id=eq.${activeServerId}`,
        },
        () => void fetchChannels(activeServerId),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channelsRealtime);
    };
  }, [activeServerId, fetchChannels, supabase]);

  const createServer = useCallback(
    async (values: { name: string; imageUrl?: string }) => {
      if (!user) {
        return { error: "You must be signed in." } satisfies WorkspaceActionResult;
      }

      const trimmedName = values.name.trim();
      if (!trimmedName) {
        return { error: "Server name is required." } satisfies WorkspaceActionResult;
      }

      const { data: server, error: serverError } = await supabase
        .from("servers")
        .insert({
          name: trimmedName,
          image_url: values.imageUrl?.trim() || null,
          invite_code: generateInviteCode(),
          owner_id: user.id,
        })
        .select("*")
        .single();

      if (serverError || !server) {
        return {
          error: serverError?.message ?? "Failed to create server.",
        } satisfies WorkspaceActionResult;
      }

      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          role: "ADMIN",
          profile_id: user.id,
          server_id: server.id,
        })
        .select("*")
        .single();

      if (memberError || !member) {
        return {
          error: memberError?.message ?? "Failed to attach owner membership.",
        } satisfies WorkspaceActionResult;
      }

      const { data: channel } = await supabase
        .from("channels")
        .insert({
          name: "general",
          type: "TEXT" as ChannelType,
          server_id: server.id,
        })
        .select("*")
        .single();

      upsertServer(server as OrbitServer, member as OrbitMember);
      if (channel) {
        upsertChannel(channel as OrbitChannel);
      }
      setActiveServer(server.id);

      await fetchServers();
      await fetchChannels(server.id);

      return { data: server as OrbitServer } satisfies WorkspaceActionResult<OrbitServer>;
    },
    [
      fetchChannels,
      fetchServers,
      setActiveServer,
      supabase,
      upsertChannel,
      upsertServer,
      user,
    ],
  );

  const createChannel = useCallback(
    async (values: {
      serverId: string;
      name: string;
      type: ChannelType;
    }) => {
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        return { error: "Channel name is required." } satisfies WorkspaceActionResult;
      }

      const { data: channel, error } = await supabase
        .from("channels")
        .insert({
          server_id: values.serverId,
          name: trimmedName,
          type: values.type,
        })
        .select("*")
        .single();

      if (error || !channel) {
        return {
          error: error?.message ?? "Failed to create channel.",
        } satisfies WorkspaceActionResult;
      }

      upsertChannel(channel as OrbitChannel);
      setActiveChannel(channel.id);

      return { data: channel as OrbitChannel } satisfies WorkspaceActionResult<OrbitChannel>;
    },
    [setActiveChannel, supabase, upsertChannel],
  );

  const joinServerByInvite = useCallback(
    async (inviteCode: string) => {
      if (!user) {
        return { error: "You must be signed in." } satisfies WorkspaceActionResult;
      }

      const normalizedCode = inviteCode.trim().toUpperCase();
      if (!normalizedCode) {
        return { error: "Invite code is required." } satisfies WorkspaceActionResult;
      }

      const { data: server, error: serverError } = await supabase
        .from("servers")
        .select("*")
        .eq("invite_code", normalizedCode)
        .maybeSingle();

      if (serverError || !server) {
        return {
          error: "Invite code is invalid.",
        } satisfies WorkspaceActionResult;
      }

      const { data: existingMember } = await supabase
        .from("members")
        .select("*")
        .eq("profile_id", user.id)
        .eq("server_id", server.id)
        .maybeSingle();

      let member = existingMember as OrbitMember | null;
      if (!member) {
        const { data: insertedMember, error: memberError } = await supabase
          .from("members")
          .insert({
            role: "GUEST",
            profile_id: user.id,
            server_id: server.id,
          })
          .select("*")
          .single();

        if (memberError || !insertedMember) {
          return {
            error: memberError?.message ?? "Unable to join server.",
          } satisfies WorkspaceActionResult;
        }

        member = insertedMember as OrbitMember;
      }

      upsertServer(server as OrbitServer, member);
      setActiveServer(server.id);
      await fetchServers();
      await fetchChannels(server.id);

      return { data: server as OrbitServer } satisfies WorkspaceActionResult<OrbitServer>;
    },
    [fetchChannels, fetchServers, setActiveServer, supabase, upsertServer, user],
  );

  return {
    loadingServers,
    loadingChannels,
    fetchServers,
    fetchChannels,
    createServer,
    createChannel,
    joinServerByInvite,
  };
}
