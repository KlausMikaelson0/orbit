export type ChannelType = "TEXT" | "AUDIO" | "VIDEO";
export type MemberRole = "ADMIN" | "MODERATOR" | "GUEST";
export type OrbitViewMode = "SERVER" | "DM_HOME" | "DM_THREAD" | "FRIENDS";
export type RelationshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED";
export type OrbitThemePreset = "MIDNIGHT" | "ONYX" | "CYBERPUNK" | "CUSTOM";
export type OrbitTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type OrbitLocale = "en" | "ar" | "tr";
export type OrbitSubscriptionTier = "FREE" | "PULSE" | "PULSE_PLUS";
export type OrbitSubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface OrbitProfile {
  id: string;
  username: string | null;
  tag: string | null;
  full_name: string | null;
  avatar_url: string | null;
  active_background_slug?: string | null;
  active_background_css?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrbitServer {
  id: string;
  name: string;
  image_url: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitChannel {
  id: string;
  name: string;
  type: ChannelType;
  server_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitMember {
  id: string;
  role: MemberRole;
  profile_id: string;
  server_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitMessage {
  id: string;
  content: string | null;
  file_url: string | null;
  member_id: string;
  channel_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitMessageAuthor {
  member: OrbitMember | null;
  profile: OrbitProfile | null;
}

export interface OrbitAttachmentMeta {
  name: string;
  mimeType: string;
}

export interface OrbitLinkPreview {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  site_name: string | null;
}

export interface OrbitMessageView {
  id: string;
  content: string | null;
  file_url: string | null;
  member_id: string | null;
  channel_id: string | null;
  profile_id: string | null;
  thread_id: string | null;
  thread_parent_id: string | null;
  created_at: string;
  updated_at: string;
  author: OrbitMessageAuthor;
  optimistic?: boolean;
  attachment?: OrbitAttachmentMeta | null;
  link_preview?: OrbitLinkPreview | null;
  moderation?: OrbitModerationSignal | null;
}

export interface OrbitNavSummary {
  activeServerName: string;
  activeChannelName: string;
}

export interface OrbitServerMembership {
  member: OrbitMember;
  server: OrbitServer;
}

export interface OrbitMemberWithProfile {
  member: OrbitMember;
  profile: OrbitProfile | null;
  online: boolean;
}

export interface OrbitDmThread {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitDmParticipant {
  id: string;
  thread_id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitDmMessage {
  id: string;
  thread_id: string;
  profile_id: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrbitDmConversation {
  thread: OrbitDmThread;
  otherProfile: OrbitProfile;
  lastMessage: OrbitDmMessage | null;
}

export interface OrbitRelationship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: RelationshipStatus;
  created_at: string;
  updated_at: string;
  requester: OrbitProfile | null;
  addressee: OrbitProfile | null;
}

export interface OrbitFriendView {
  relationship: OrbitRelationship;
  profile: OrbitProfile;
  online: boolean;
}

export interface OrbitServerBot {
  id: string;
  server_id: string;
  name: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface OrbitModerationSignal {
  score: number;
  reason: string;
}

export interface OrbitMessageFlag {
  id: string;
  message_id: string;
  flagged_by: string;
  model: string;
  score: number;
  reason: string;
  created_at: string;
}

export interface OrbitChannelTask {
  id: string;
  channel_id: string;
  creator_profile_id: string;
  content: string;
  status: OrbitTaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  creator: OrbitProfile | null;
}

export interface OrbitServerWebhook {
  id: string;
  server_id: string;
  channel_id: string;
  sender_member_id: string;
  created_by: string;
  name: string;
  is_active: boolean;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrbitIncomingCall {
  call_id: string;
  caller_profile_id: string;
  caller_name: string;
  caller_avatar_url: string | null;
  recipient_profile_id: string;
  mode: "AUDIO" | "VIDEO";
  room_id: string;
  thread_id: string | null;
  started_at: string;
}

export interface OrbitActiveCallSession {
  call_id: string;
  peer_profile_id: string;
  peer_name: string;
  peer_avatar_url: string | null;
  mode: "AUDIO" | "VIDEO";
  room_id: string;
  thread_id: string | null;
  joined_at: string;
}

export interface OrbitProfileSubscription {
  profile_id: string;
  tier: OrbitSubscriptionTier;
  status: OrbitSubscriptionStatus;
  renews_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrbitProfileWallet {
  profile_id: string;
  starbits_balance: number;
  lifetime_earned: number;
  last_daily_claim_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrbitStoreCategory = "BACKGROUND" | "PROFILE_FLARE" | "SFX_PACK";

export interface OrbitStoreItem {
  slug: string;
  name: string;
  description: string;
  category: OrbitStoreCategory;
  rarity: string;
  price_starbits: number;
  css_background: string | null;
  preview_emoji: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrbitInventoryItem {
  item_slug: string;
  purchased_at: string;
}
