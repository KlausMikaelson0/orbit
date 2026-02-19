import { create } from "zustand";

import type {
  OrbitChannel,
  OrbitMember,
  OrbitMessageView,
  OrbitNavSummary,
  OrbitProfile,
  OrbitServer,
  OrbitServerMembership,
} from "@/src/types/orbit";

interface OrbitNavState {
  collapsed: boolean;
  profile: OrbitProfile | null;
  servers: OrbitServer[];
  membershipsByServer: Record<string, OrbitMember>;
  channelsByServer: Record<string, OrbitChannel[]>;
  messageCache: Record<string, OrbitMessageView[]>;
  activeServerId: string | null;
  activeChannelId: string | null;
  setProfile: (profile: OrbitProfile) => void;
  setServersWithMemberships: (rows: OrbitServerMembership[]) => void;
  setChannels: (serverId: string, channels: OrbitChannel[]) => void;
  upsertServer: (server: OrbitServer, member?: OrbitMember) => void;
  upsertChannel: (channel: OrbitChannel) => void;
  setMessages: (channelId: string, messages: OrbitMessageView[]) => void;
  upsertMessage: (channelId: string, message: OrbitMessageView) => void;
  replaceMessage: (
    channelId: string,
    tempId: string,
    message: OrbitMessageView,
  ) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setActiveServer: (serverId: string | null) => void;
  setActiveChannel: (channelId: string | null) => void;
  getSummary: () => OrbitNavSummary;
}

function sortByCreatedAt<T extends { created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const useOrbitNavStore = create<OrbitNavState>((set, get) => ({
  collapsed: false,
  profile: null,
  servers: [],
  membershipsByServer: {},
  channelsByServer: {},
  messageCache: {},
  activeServerId: null,
  activeChannelId: null,
  setProfile: (profile) => set({ profile }),
  setServersWithMemberships: (rows) =>
    set((state) => {
      const servers = rows.map((row) => row.server);
      const membershipsByServer = Object.fromEntries(
        rows.map((row) => [row.server.id, row.member]),
      );

      const nextActiveServerId =
        state.activeServerId && servers.some((server) => server.id === state.activeServerId)
          ? state.activeServerId
          : servers[0]?.id ?? null;
      const channelsForActive = nextActiveServerId
        ? state.channelsByServer[nextActiveServerId] ?? []
        : [];
      const nextActiveChannelId =
        state.activeChannelId &&
        channelsForActive.some((channel) => channel.id === state.activeChannelId)
          ? state.activeChannelId
          : channelsForActive[0]?.id ?? null;

      return {
        servers,
        membershipsByServer,
        activeServerId: nextActiveServerId,
        activeChannelId: nextActiveChannelId,
      };
    }),
  setChannels: (serverId, channels) =>
    set((state) => {
      const nextChannels = sortByCreatedAt(channels);
      const channelsByServer = {
        ...state.channelsByServer,
        [serverId]: nextChannels,
      };

      const shouldTouchActive = state.activeServerId === serverId;
      if (!shouldTouchActive) {
        return { channelsByServer };
      }

      const nextActiveChannelId =
        state.activeChannelId &&
        nextChannels.some((channel) => channel.id === state.activeChannelId)
          ? state.activeChannelId
          : nextChannels[0]?.id ?? null;

      return {
        channelsByServer,
        activeChannelId: nextActiveChannelId,
      };
    }),
  upsertServer: (server, member) =>
    set((state) => {
      const nextServers = [
        ...state.servers.filter((current) => current.id !== server.id),
        server,
      ];
      const membershipsByServer = member
        ? { ...state.membershipsByServer, [server.id]: member }
        : state.membershipsByServer;

      return {
        servers: sortByCreatedAt(nextServers),
        membershipsByServer,
      };
    }),
  upsertChannel: (channel) =>
    set((state) => {
      const existing = state.channelsByServer[channel.server_id] ?? [];
      const nextChannels = sortByCreatedAt(
        [...existing.filter((item) => item.id !== channel.id), channel],
      );

      return {
        channelsByServer: {
          ...state.channelsByServer,
          [channel.server_id]: nextChannels,
        },
      };
    }),
  setMessages: (channelId, messages) =>
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [channelId]: sortByCreatedAt(messages),
      },
    })),
  upsertMessage: (channelId, message) =>
    set((state) => {
      const current = state.messageCache[channelId] ?? [];
      const nextMessages = sortByCreatedAt(
        [...current.filter((item) => item.id !== message.id), message],
      );

      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: nextMessages,
        },
      };
    }),
  replaceMessage: (channelId, tempId, message) =>
    set((state) => {
      const current = state.messageCache[channelId] ?? [];
      const nextMessages = sortByCreatedAt(
        [
          ...current.filter(
            (item) => item.id !== tempId && item.id !== message.id,
          ),
          message,
        ],
      );

      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: nextMessages,
        },
      };
    }),
  removeMessage: (channelId, messageId) =>
    set((state) => {
      const current = state.messageCache[channelId] ?? [];
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: current.filter((item) => item.id !== messageId),
        },
      };
    }),
  setCollapsed: (collapsed) => set({ collapsed }),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setActiveServer: (serverId) =>
    set((state) => {
      if (!serverId) {
        return {
          activeServerId: null,
          activeChannelId: null,
        };
      }

      const nextServer = state.servers.find((server) => server.id === serverId);
      if (!nextServer) {
        return {};
      }

      const channels = state.channelsByServer[serverId] ?? [];
      return {
        activeServerId: serverId,
        activeChannelId: channels[0]?.id ?? null,
      };
    }),
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  getSummary: () => {
    const { servers, channelsByServer, activeServerId, activeChannelId } = get();
    const activeServer = servers.find((server) => server.id === activeServerId);
    const activeChannels = activeServerId
      ? channelsByServer[activeServerId] ?? []
      : [];
    const activeChannel = activeChannels.find(
      (channel) => channel.id === activeChannelId,
    );

    return {
      activeServerName: activeServer?.name ?? "Unified Space",
      activeChannelName: activeChannel?.name ?? "general",
    };
  },
}));
