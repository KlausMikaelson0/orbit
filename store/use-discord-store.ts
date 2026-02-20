import { create } from "zustand";

import type { Channel, MemberWithProfile, Server } from "@/types";

interface DiscordStoreState {
  activeServerId: string | null;
  activeChannelId: string | null;
  serverSetupOpen: boolean;
  mobilePanels: {
    servers: boolean;
    channels: boolean;
    members: boolean;
  };
  servers: Server[];
  channels: Channel[];
  members: MemberWithProfile[];
  setActiveServerId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  setServerSetupOpen: (open: boolean) => void;
  setMobilePanelOpen: (
    panel: keyof DiscordStoreState["mobilePanels"],
    open: boolean,
  ) => void;
  setServers: (servers: Server[]) => void;
  setChannels: (channels: Channel[]) => void;
  setMembers: (members: MemberWithProfile[]) => void;
}

export const useDiscordStore = create<DiscordStoreState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  serverSetupOpen: false,
  mobilePanels: {
    servers: false,
    channels: false,
    members: false,
  },
  servers: [],
  channels: [],
  members: [],
  setActiveServerId: (id) =>
    set((state) => ({
      activeServerId: id,
      activeChannelId: id !== state.activeServerId ? null : state.activeChannelId,
    })),
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  setServerSetupOpen: (open) => set({ serverSetupOpen: open }),
  setMobilePanelOpen: (panel, open) =>
    set((state) => ({
      mobilePanels: {
        ...state.mobilePanels,
        [panel]: open,
      },
    })),
  setServers: (servers) => set({ servers }),
  setChannels: (channels) => set({ channels }),
  setMembers: (members) => set({ members }),
}));
