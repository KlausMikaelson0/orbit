import { NextResponse } from "next/server";

import { ensureStaffAccessForServer } from "@/app/api/developer/webhooks/_shared";
import {
  createSupabaseServerServiceClient,
  getServerUserFromRequest,
} from "@/src/lib/supabase-server";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{
    webhookId: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const auth = await getServerUserFromRequest(request);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error ?? "Unauthorized." }, { status: 401 });
    }

    const { webhookId } = await params;
    if (!webhookId) {
      return NextResponse.json({ error: "webhookId is required." }, { status: 400 });
    }

    const service = createSupabaseServerServiceClient();
    const { data: webhook, error: webhookError } = await service
      .from("server_webhooks")
      .select("id, server_id")
      .eq("id", webhookId)
      .maybeSingle();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    const access = await ensureStaffAccessForServer(auth.user.id, webhook.server_id);
    if (!access.allowed) {
      return access.errorResponse ?? NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error } = await service
      .from("server_webhooks")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", webhookId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to revoke webhook.",
      },
      { status: 500 },
    );
  }
}
