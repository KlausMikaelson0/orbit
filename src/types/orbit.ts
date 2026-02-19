export type SpaceVisibility = "PUBLIC" | "PRIVATE";
export type ChannelKind = "CHAT" | "VOICE" | "DOCS";

export interface UnifiedSpaceChannel {
  id: string;
  name: string;
  kind: ChannelKind;
  unreadCount?: number;
}

export interface UnifiedSpace {
  id: string;
  name: string;
  tagline: string;
  visibility: SpaceVisibility;
  accent: string;
  channels: UnifiedSpaceChannel[];
}

export interface OrbitNavSummary {
  activeSpaceName: string;
  activeChannelName: string;
}
