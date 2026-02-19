import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  return value;
}

function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }
  return value;
}

function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return value;
}

export function createSupabaseServerUserClient(accessToken?: string) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export function createSupabaseServerServiceClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getAccessTokenFromRequest(request: Request) {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function getServerUserFromRequest(
  request: Request,
): Promise<{ user: User | null; error?: string; accessToken?: string }> {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { user: null, error: "Missing bearer token." };
  }

  try {
    const authClient = createSupabaseServerUserClient();
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data.user) {
      return { user: null, error: error?.message ?? "Unauthorized." };
    }
    return { user: data.user, accessToken };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : "Unauthorized.",
    };
  }
}
