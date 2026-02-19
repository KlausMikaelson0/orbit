"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  notifyOrbitMessage,
  playOrbitPingSound,
} from "@/src/lib/orbit-notifications";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type {
  OrbitDmConversation,
  OrbitDmMessage,
  OrbitDmParticipant,
  OrbitDmThread,
  OrbitProfile,
  OrbitRelationship,
} from "@/src/types/orbit";

interface OrbitSocialResult<T = void> {
  data?: T;
  error?: string;
}

interface ParticipantWithProfile extends OrbitDmParticipant {
  profile: OrbitProfile | OrbitProfile[] | null;
}

export interface UseOrbitSocialResult {
  loadingSocial: boolean;
  sendFriendRequest: (identifier: string) => Promise<OrbitSocialResult>;
  acceptFriendRequest: (relationshipId: string) => Promise<OrbitSocialResult>;
  declineFriendRequest: (relationshipId: string) => Promise<OrbitSocialResult>;
  openOrCreateDmWithProfile: (
    profile: OrbitProfile,
  ) => Promise<OrbitSocialResult<OrbitDmConversation>>;
  fetchRelationships: () => Promise<void>;
  fetchDmConversations: () => Promise<void>;
}

function normalizeProfileRow(
  row: OrbitProfile | OrbitProfile[] | null | undefined,
): OrbitProfile | null {
  if (!row) {
    return null;
  }
  if (Array.isArray(row)) {
    return row[0] ?? null;
  }
  return row;
}

export function useOrbitSocial(user: User | null): UseOrbitSocialResult {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const profile = useOrbitNavStore((state) => state.profile);
  const setRelationships = useOrbitNavStore((state) => state.setRelationships);
  const setDmConversations = useOrbitNavStore((state) => state.setDmConversations);
  const setOnlineProfileIds = useOrbitNavStore((state) => state.setOnlineProfileIds);
  const setActiveDmThread = useOrbitNavStore((state) => state.setActiveDmThread);

  const [loadingSocial, setLoadingSocial] = useState(true);

  const fetchRelationships = useCallback(async () => {
    if (!user) {
      setRelationships([]);
      return;
    }

    const { data } = await supabase
      .from("relationships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Array<{
      id: string;
      requester_id: string;
      addressee_id: string;
      status: "PENDING" | "ACCEPTED" | "BLOCKED";
      created_at: string;
      updated_at: string;
    }>;

    const profileIds = Array.from(
      new Set(
        rows.flatMap((row) => [row.requester_id, row.addressee_id]),
      ),
    );
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);
    const profileRows = (profileData ?? []) as OrbitProfile[];
    const profileById = new Map(profileRows.map((item) => [item.id, item]));

    const relationships: OrbitRelationship[] = rows.map((row) => ({
      ...row,
      requester: profileById.get(row.requester_id) ?? null,
      addressee: profileById.get(row.addressee_id) ?? null,
    }));

    setRelationships(relationships);
  }, [setRelationships, supabase, user]);

  const fetchDmConversations = useCallback(async () => {
    if (!user) {
      setDmConversations([]);
      return;
    }

    const { data: selfParticipantsData } = await supabase
      .from("dm_participants")
      .select("*")
      .eq("profile_id", user.id);

    const selfParticipants = (selfParticipantsData ?? []) as OrbitDmParticipant[];
    if (!selfParticipants.length) {
      setDmConversations([]);
      return;
    }

    const threadIds = Array.from(
      new Set(selfParticipants.map((row) => row.thread_id)),
    );

    const [threadsResult, otherParticipantsResult, messagesResult] =
      await Promise.all([
        supabase
          .from("dm_threads")
          .select("*")
          .in("id", threadIds)
          .order("updated_at", { ascending: false }),
        supabase
          .from("dm_participants")
          .select(
            "id, thread_id, profile_id, created_at, updated_at, profile:profiles(*)",
          )
          .in("thread_id", threadIds)
          .neq("profile_id", user.id),
        supabase
          .from("dm_messages")
          .select("*")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

    const threads = (threadsResult.data ?? []) as OrbitDmThread[];
    const otherParticipants =
      (otherParticipantsResult.data ?? []) as unknown as ParticipantWithProfile[];
    const latestMessages = (messagesResult.data ?? []) as OrbitDmMessage[];

    const threadById = new Map(threads.map((thread) => [thread.id, thread]));
    const otherProfileByThread = new Map<string, OrbitProfile>();
    for (const participant of otherParticipants) {
      const profileRow = normalizeProfileRow(participant.profile);
      if (profileRow) {
        otherProfileByThread.set(participant.thread_id, profileRow);
      }
    }

    const lastMessageByThread = new Map<string, OrbitDmMessage>();
    for (const message of latestMessages) {
      if (!lastMessageByThread.has(message.thread_id)) {
        lastMessageByThread.set(message.thread_id, message);
      }
    }

    const conversations: OrbitDmConversation[] = [];
    for (const threadId of threadIds) {
      const thread = threadById.get(threadId);
      const otherProfile = otherProfileByThread.get(threadId);
      if (!thread || !otherProfile) {
        continue;
      }
      conversations.push({
        thread,
        otherProfile,
        lastMessage: lastMessageByThread.get(threadId) ?? null,
      });
    }

    conversations.sort((a, b) => {
      const aDate = a.lastMessage?.created_at ?? a.thread.updated_at;
      const bDate = b.lastMessage?.created_at ?? b.thread.updated_at;
      return bDate.localeCompare(aDate);
    });

    setDmConversations(conversations);
  }, [setDmConversations, supabase, user]);

  useEffect(() => {
    setLoadingSocial(true);
    void Promise.all([fetchRelationships(), fetchDmConversations()]).finally(() =>
      setLoadingSocial(false),
    );
  }, [fetchDmConversations, fetchRelationships]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const socialChannel = supabase
      .channel(`orbit-social-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "relationships",
        },
        () => void fetchRelationships(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_participants",
        },
        () => void fetchDmConversations(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        (payload) => {
          void (async () => {
            const inserted = payload.new as OrbitDmMessage;
            const currentState = useOrbitNavStore.getState();
            const knownThread = currentState.dmConversations.some(
              (conversation) => conversation.thread.id === inserted.thread_id,
            );
            if (!knownThread) {
              return;
            }

            await fetchDmConversations();

            if (inserted.profile_id === user.id) {
              return;
            }

            const isCurrentThread =
              currentState.activeView === "DM_THREAD" &&
              currentState.activeDmThreadId === inserted.thread_id;
            if (!isCurrentThread || document.hidden) {
              const source = currentState.dmConversations.find(
                (conversation) => conversation.thread.id === inserted.thread_id,
              );
              const title = source
                ? `DM from ${
                    source.otherProfile.full_name ??
                    source.otherProfile.username ??
                    "Orbit User"
                  }`
                : "New direct message";
              const body = inserted.content ?? "Sent an attachment";
              playOrbitPingSound();
              await notifyOrbitMessage(title, body);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(socialChannel);
    };
  }, [fetchDmConversations, fetchRelationships, supabase, user]);

  useEffect(() => {
    if (!user) {
      setOnlineProfileIds([]);
      return;
    }

    const presenceChannel = supabase.channel("orbit-global-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const syncPresence = () => {
      const state = presenceChannel.presenceState();
      const ids = new Set<string>();
      for (const key of Object.keys(state)) {
        const entries = state[key] as Array<{ profile_id?: string }>;
        for (const entry of entries) {
          if (entry.profile_id) {
            ids.add(entry.profile_id);
          }
        }
      }
      setOnlineProfileIds(Array.from(ids));
    };

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            profile_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(presenceChannel);
    };
  }, [setOnlineProfileIds, supabase, user]);

  const sendFriendRequest = useCallback(
    async (identifier: string): Promise<OrbitSocialResult> => {
      if (!user) {
        return { error: "You must be signed in." };
      }

      const parsed = identifier.trim().match(/^([a-zA-Z0-9_]{2,32})#(\d{4})$/);
      if (!parsed) {
        return { error: "Use the format username#1234" };
      }

      const username = parsed[1].toLowerCase();
      const tag = parsed[2];

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("tag", tag)
        .maybeSingle();

      if (!targetProfile) {
        return { error: "No user found with that tag." };
      }

      if (targetProfile.id === user.id) {
        return { error: "You cannot add yourself." };
      }

      const { data: existing } = await supabase
        .from("relationships")
        .select("*")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${targetProfile.id}),and(requester_id.eq.${targetProfile.id},addressee_id.eq.${user.id})`,
        )
        .maybeSingle();

      if (existing) {
        return { error: "A relationship already exists with this user." };
      }

      const { error } = await supabase.from("relationships").insert({
        requester_id: user.id,
        addressee_id: targetProfile.id,
        status: "PENDING",
      });

      if (error) {
        return { error: error.message };
      }

      await fetchRelationships();
      return {};
    },
    [fetchRelationships, supabase, user],
  );

  const acceptFriendRequest = useCallback(
    async (relationshipId: string): Promise<OrbitSocialResult> => {
      if (!user) {
        return { error: "You must be signed in." };
      }

      const { error } = await supabase
        .from("relationships")
        .update({ status: "ACCEPTED" })
        .eq("id", relationshipId)
        .eq("addressee_id", user.id);

      if (error) {
        return { error: error.message };
      }

      await fetchRelationships();
      return {};
    },
    [fetchRelationships, supabase, user],
  );

  const declineFriendRequest = useCallback(
    async (relationshipId: string): Promise<OrbitSocialResult> => {
      if (!user) {
        return { error: "You must be signed in." };
      }

      const { error } = await supabase
        .from("relationships")
        .delete()
        .eq("id", relationshipId)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        return { error: error.message };
      }

      await fetchRelationships();
      return {};
    },
    [fetchRelationships, supabase, user],
  );

  const openOrCreateDmWithProfile = useCallback(
    async (targetProfile: OrbitProfile): Promise<OrbitSocialResult<OrbitDmConversation>> => {
      if (!user || !profile) {
        return { error: "You must be signed in." };
      }

      const currentState = useOrbitNavStore.getState();
      const existing = currentState.dmConversations.find(
        (conversation) => conversation.otherProfile.id === targetProfile.id,
      );
      if (existing) {
        setActiveDmThread(existing.thread.id);
        return { data: existing };
      }

      const { data: thread, error: threadError } = await supabase
        .from("dm_threads")
        .insert({})
        .select("*")
        .single();

      if (threadError || !thread) {
        return { error: threadError?.message ?? "Unable to create DM thread." };
      }

      const { error: participantError } = await supabase.from("dm_participants").insert([
        {
          thread_id: thread.id,
          profile_id: user.id,
        },
        {
          thread_id: thread.id,
          profile_id: targetProfile.id,
        },
      ]);

      if (participantError) {
        return { error: participantError.message };
      }

      const createdConversation: OrbitDmConversation = {
        thread: thread as OrbitDmThread,
        otherProfile: targetProfile,
        lastMessage: null,
      };

      useOrbitNavStore.getState().upsertDmConversation(createdConversation);
      setActiveDmThread(thread.id);
      await fetchDmConversations();

      return { data: createdConversation };
    },
    [fetchDmConversations, profile, setActiveDmThread, supabase, user],
  );

  return {
    loadingSocial,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    openOrCreateDmWithProfile,
    fetchRelationships,
    fetchDmConversations,
  };
}
