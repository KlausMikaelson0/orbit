import { create } from "zustand";

import { ORBIT_SPACES } from "@/src/lib/mock-spaces";
import type { OrbitNavSummary, UnifiedSpace } from "@/src/types/orbit";

interface OrbitNavState {
  spaces: UnifiedSpace[];
  collapsed: boolean;
  activeSpaceId: string;
  activeChannelId: string;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setActiveSpace: (spaceId: string) => void;
  setActiveChannel: (channelId: string) => void;
  getSummary: () => OrbitNavSummary;
}

const defaultSpace = ORBIT_SPACES[0];
const defaultChannel = defaultSpace.channels[0];

export const useOrbitNavStore = create<OrbitNavState>((set, get) => ({
  spaces: ORBIT_SPACES,
  collapsed: false,
  activeSpaceId: defaultSpace.id,
  activeChannelId: defaultChannel.id,
  setCollapsed: (collapsed) => set({ collapsed }),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setActiveSpace: (spaceId) =>
    set((state) => {
      const nextSpace = state.spaces.find((space) => space.id === spaceId);
      if (!nextSpace) {
        return {};
      }

      return {
        activeSpaceId: nextSpace.id,
        activeChannelId: nextSpace.channels[0]?.id ?? state.activeChannelId,
      };
    }),
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  getSummary: () => {
    const { spaces, activeSpaceId, activeChannelId } = get();
    const activeSpace = spaces.find((space) => space.id === activeSpaceId);
    const activeChannel = activeSpace?.channels.find(
      (channel) => channel.id === activeChannelId,
    );

    return {
      activeSpaceName: activeSpace?.name ?? "Unified Space",
      activeChannelName: activeChannel?.name ?? "overview",
    };
  },
}));
