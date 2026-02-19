export type ChannelType = "TEXT" | "AUDIO" | "VIDEO";
export type MemberRole = "ADMIN" | "MODERATOR" | "GUEST";

export interface OrbitProfile {
  id: string;
  username: string | null;
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

export interface OrbitMessageView extends OrbitMessage {
  author: OrbitMessageAuthor;
  optimistic?: boolean;
}

export interface OrbitNavSummary {
  activeServerName: string;
  activeChannelName: string;
}

export interface OrbitServerMembership {
  member: OrbitMember;
  server: OrbitServer;
}
