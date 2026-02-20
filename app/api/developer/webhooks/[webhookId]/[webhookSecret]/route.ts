import { NextResponse } from "next/server";

import {
  getOrbitRequestIp,
  matchesWebhookSecret,
} from "@/src/lib/orbit-developer-api";
import { moderateOrbitImageUrl } from "@/src/lib/orbit-image-moderation";
import { checkOrbitRateLimit } from "@/src/lib/rate-limit";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase-server";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{
    webhookId: string;
    webhookSecret: string;
  }>;
}

interface WebhookMessageBody {
  content?: string;
  fileUrl?: string;
  username?: string;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { webhookId, webhookSecret } = await params;
    if (!webhookId || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing webhook credentials." },
        { status: 400 },
      );
    }

    const ip = getOrbitRequestIp(request);
    const rate = checkOrbitRateLimit({
      key: `orbit-webhook:${webhookId}:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Webhook rate limit reached. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
          },
        },
      );
    }

    const body = (await request.json()) as WebhookMessageBody;
    const trimmedContent = body.content?.trim() ?? "";
    const fileUrl = body.fileUrl?.trim() ?? null;
    const username = body.username?.trim() ?? null;

    if (!trimmedContent && !fileUrl) {
      return NextResponse.json(
        { error: "Provide content or fileUrl." },
        { status: 400 },
      );
    }

    if (trimmedContent.length > 1900) {
      return NextResponse.json(
        { error: "Content exceeds 1900 characters." },
        { status: 400 },
      );
    }

    if (fileUrl) {
      const moderation = moderateOrbitImageUrl(fileUrl);
      if (!moderation.safe) {
        return NextResponse.json(
          { error: moderation.reason ?? "Attachment blocked by moderation." },
          { status: 400 },
        );
      }
    }

    const service = createSupabaseServerServiceClient();
    const { data: webhook, error: webhookError } = await service
      .from("server_webhooks")
      .select(
        "id, name, channel_id, sender_member_id, secret_hash, is_active, revoked_at",
      )
      .eq("id", webhookId)
      .maybeSingle();

    if (webhookError || !webhook || !webhook.is_active || webhook.revoked_at) {
      return NextResponse.json({ error: "Webhook is not active." }, { status: 404 });
    }

    if (!matchesWebhookSecret(webhookSecret, webhook.secret_hash)) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }

    const senderName = username || webhook.name || "Orbit Webhook";
    const content =
      trimmedContent.length > 0
        ? `🤖 **${senderName.slice(0, 60)}**\n${trimmedContent}`
        : `🤖 **${senderName.slice(0, 60)}** sent an attachment.`;

    const { data: message, error: messageError } = await service
      .from("messages")
      .insert({
        channel_id: webhook.channel_id,
        member_id: webhook.sender_member_id,
        content,
        file_url: fileUrl,
      })
      .select("id, created_at")
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: messageError?.message ?? "Unable to send webhook message." },
        { status: 400 },
      );
    }

    void service
      .from("server_webhooks")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", webhookId);

    return NextResponse.json(
      {
        ok: true,
        messageId: message.id,
        createdAt: message.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to execute webhook delivery.",
      },
      { status: 500 },
    );
  }
}
