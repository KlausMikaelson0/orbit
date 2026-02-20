import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env vars are not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = (await request.json()) as { serverId?: string };
    const serverId = body.serverId?.trim();
    if (!serverId) {
      return new Response(JSON.stringify({ error: "serverId is required." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const [{ data: server }, { data: membership }] = await Promise.all([
      admin.from("servers").select("id, owner_id").eq("id", serverId).maybeSingle(),
      admin
        .from("members")
        .select("id, role")
        .eq("server_id", serverId)
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);

    const canView =
      server?.owner_id === user.id ||
      membership?.role === "ADMIN" ||
      membership?.role === "MODERATOR";
    if (!canView) {
      return new Response(JSON.stringify({ error: "Forbidden." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [channelsResult, membersCountResult] = await Promise.all([
      admin.from("channels").select("id").eq("server_id", serverId),
      admin
        .from("members")
        .select("id", { head: true, count: "exact" })
        .eq("server_id", serverId),
    ]);

    const channelIds = (channelsResult.data ?? []).map((row) => row.id);

    let messages: Array<{
      created_at: string;
      member: { profile_id: string } | Array<{ profile_id: string }> | null;
    }> = [];
    if (channelIds.length) {
      const { data: messageRows } = await admin
        .from("messages")
        .select("created_at, member:members(profile_id)")
        .in("channel_id", channelIds)
        .gte("created_at", since7d)
        .limit(5000);
      messages = (messageRows ?? []) as typeof messages;
    }

    const messages24h = messages.filter((message) => message.created_at >= since24h);
    const activeProfiles24h = new Set(
      messages24h
        .map((row) => {
          const member = row.member;
          if (!member) return null;
          return Array.isArray(member)
            ? (member[0]?.profile_id ?? null)
            : member.profile_id;
        })
        .filter((value): value is string => Boolean(value)),
    );

    const payload = {
      membersTotal: membersCountResult.count ?? 0,
      channelsTotal: channelIds.length,
      activeMembers24h: activeProfiles24h.size,
      currentlyOnline: activeProfiles24h.size,
      messages24h: messages24h.length,
      messages7d: messages.length,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
