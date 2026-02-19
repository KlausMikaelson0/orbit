export type ChannelType = "TEXT" | "AUDIO" | "VIDEO";

export type MemberRole = "ADMIN" | "MODERATOR" | "GUEST";

export type ProfileStatus = "ONLINE" | "AWAY" | "OFFLINE";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface Server {
  id: string;
  name: string;
  image_url: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: ChannelType;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  server_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberWithProfile extends Member {
  profile: Profile | null;
}

export interface MessageWithAuthor extends Message {
  author: Profile | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      servers: {
        Row: Server;
        Insert: {
          id?: string;
          name: string;
          image_url?: string | null;
          invite_code: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string | null;
          invite_code?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      channels: {
        Row: Channel;
        Insert: {
          id?: string;
          server_id: string;
          name: string;
          type: ChannelType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          server_id?: string;
          name?: string;
          type?: ChannelType;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: Member;
        Insert: {
          id?: string;
          server_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          server_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: Message;
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          content?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          content?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Enums: {
      channel_type: ChannelType;
      member_role: MemberRole;
      profile_status: ProfileStatus;
    };
  };
}
