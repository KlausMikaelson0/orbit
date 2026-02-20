import { NextResponse } from "next/server";

import {
  ensureStaffAccessForServer,
  resolveChannelServer,
} from "@/app/api/developer/webhooks/_shared";
import {
  generateWebhookSecret,
  hashWebhookSecret,
} from "@/src/lib/orbit-developer-api";
import {
  createSupabaseServerServiceClient,
  getServerUserFromRequest,
} from "@/src/lib/supabase-server";
import { checkOrbitRateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";

interface CreateWebhookBody {
  channelId?: string;
  name?: string;
}

export async function GET(request: Request) {
  try {
    const auth = await getServerUserFromRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
    }

    const service = createSupabaseServerServiceClient();
    const requestUrl = new URL(request.url);
    const channelId = requestUrl.searchParams.get("channelId");
    const serverId = requestUrl.searchParams.get("serverId");

    let targetServerId: string | null = null;
    if (channelId) {
      const channel = await resolveChannelServer(channelId);
      if (channel.error || !channel.data) {
        return NextResponse.json({ error: "Channel not found." }, { status: 404 });
      }
      targetServerId = channel.data.server_id;
    } else if (serverId) {
      targetServerId = serverId;
    }

    if (!targetServerId) {
      return NextResponse.json(
        { error: "Provide channelId or serverId." },
        { status: 400 },
      );
    }

    const access = await ensureStaffAccessForServer(auth.user.id, targetServerId);
    if (!access.allowed) {
      return access.errorResponse ?? NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const query = service
      .from("server_webhooks")
      .select(
        "id, server_id, channel_id, sender_member_id, created_by, name, is_active, last_used_at, revoked_at, created_at, updated_at",
      )
      .eq("server_id", targetServerId)
      .order("created_at", { ascending: false });

    if (channelId) {
      query.eq("channel_id", channelId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const origin = requestUrl.origin;
    return NextResponse.json({
      webhooks: (data ?? []).map((row) => ({
        ...row,
        endpoint: `${origin}/api/developer/webhooks/${row.id}/<webhook-secret>`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to list webhooks.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getServerUserFromRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
    }

    const createRate = checkOrbitRateLimit({
      key: `orbit-webhook-create:${auth.user.id}`,
      limit: 12,
      windowMs: 10 * 60_000,
    });
    if (!createRate.allowed) {
      return NextResponse.json(
        { error: "Webhook creation rate limit reached. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(createRate.retryAfterSeconds),
          },
        },
      );
    }

    const body = (await request.json()) as CreateWebhookBody;
    const channelId = body.channelId?.trim();
    const name = body.name?.trim() || "Orbit Webhook";
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required." }, { status: 400 });
    }

    const channel = await resolveChannelServer(channelId);
    if (channel.error || !channel.data) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    }

    const access = await ensureStaffAccessForServer(auth.user.id, channel.data.server_id);
    if (!access.allowed) {
      return access.errorResponse ?? NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const service = createSupabaseServerServiceClient();
    let senderMemberId = access.memberId;
    if (!senderMemberId) {
      const { data: member, error: memberError } = await service
        .from("members")
        .select("id")
        .eq("server_id", channel.data.server_id)
        .eq("profile_id", auth.user.id)
        .maybeSingle();

      if (memberError || !member) {
        return NextResponse.json(
          { error: "Webhook sender membership not found in this server." },
          { status: 400 },
        );
      }
      senderMemberId = member.id;
    }

    const secret = generateWebhookSecret();
    const secretHash = hashWebhookSecret(secret);

    const { data, error } = await service
      .from("server_webhooks")
      .insert({
        server_id: channel.data.server_id,
        channel_id: channelId,
        sender_member_id: senderMemberId,
        created_by: auth.user.id,
        name: name.slice(0, 60),
        secret_hash: secretHash,
        is_active: true,
      })
      .select(
        "id, server_id, channel_id, sender_member_id, created_by, name, is_active, last_used_at, revoked_at, created_at, updated_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to create webhook." },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    return NextResponse.json(
      {
        webhook: data,
        webhookSecret: secret,
        endpoint: `${origin}/api/developer/webhooks/${data.id}/${secret}`,
        note: "Store this secret now. Orbit does not expose it again.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create webhook.",
      },
      { status: 500 },
    );
  }
}
