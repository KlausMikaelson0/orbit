export type ChannelType = "TEXT" | "AUDIO" | "VIDEO";
export type MemberRole = "ADMIN" | "MODERATOR" | "GUEST";
export type OrbitViewMode = "SERVER" | "DM_HOME" | "DM_THREAD" | "FRIENDS";
export type RelationshipStatus = "PENDING" | "ACCEPTED" | "BLOCKED";

export interface OrbitProfile {
  id: string;
  username: string | null;
  tag: string | null;
  full_name: string | null;
  avatar_url: string | null;
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

export interface OrbitMessageView {
  id: string;
  content: string | null;
  file_url: string | null;
  member_id: string | null;
  channel_id: string | null;
  profile_id: string | null;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
  author: OrbitMessageAuthor;
  optimistic?: boolean;
  attachment?: OrbitAttachmentMeta | null;
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
