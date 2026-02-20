import { NextResponse } from "next/server";

import { createSupabaseServerServiceClient } from "@/src/lib/supabase-server";

interface StaffAccessResult {
  allowed: boolean;
  memberId: string | null;
  serverId: string;
  errorResponse?: NextResponse;
}

export async function ensureStaffAccessForServer(
  userId: string,
  serverId: string,
): Promise<StaffAccessResult> {
  const service = createSupabaseServerServiceClient();

  const [{ data: server, error: serverError }, { data: membership, error: memberError }] =
    await Promise.all([
      service.from("servers").select("id, owner_id").eq("id", serverId).maybeSingle(),
      service
        .from("members")
        .select("id, role")
        .eq("server_id", serverId)
        .eq("profile_id", userId)
        .maybeSingle(),
    ]);

  if (serverError || !server) {
    return {
      allowed: false,
      memberId: null,
      serverId,
      errorResponse: NextResponse.json(
        { error: "Server not found." },
        { status: 404 },
      ),
    };
  }

  if (memberError) {
    return {
      allowed: false,
      memberId: null,
      serverId,
      errorResponse: NextResponse.json(
        { error: memberError.message },
        { status: 400 },
      ),
    };
  }

  const isOwner = server.owner_id === userId;
  const isStaff =
    membership?.role === "ADMIN" || membership?.role === "MODERATOR";

  if (!isOwner && !isStaff) {
    return {
      allowed: false,
      memberId: membership?.id ?? null,
      serverId,
      errorResponse: NextResponse.json(
        { error: "Staff access required." },
        { status: 403 },
      ),
    };
  }

  return {
    allowed: true,
    memberId: membership?.id ?? null,
    serverId,
  };
}

export async function resolveChannelServer(channelId: string) {
  const service = createSupabaseServerServiceClient();
  const { data, error } = await service
    .from("channels")
    .select("id, server_id, name")
    .eq("id", channelId)
    .maybeSingle();

  return { data, error };
}
