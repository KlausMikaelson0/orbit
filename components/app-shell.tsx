"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Loader2, Wrench } from "lucide-react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { DiscordLayout } from "@/components/layout/discord-layout";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export function AppShell() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1e1f22] px-4 text-[#f2f3f5]">
        <div className="w-full max-w-xl rounded-xl border border-[#2b2d31] bg-[#313338] p-6">
          <div className="mb-3 flex items-center gap-2 text-indigo-300">
            <Wrench className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Supabase setup required</h1>
          </div>
          <p className="text-sm text-[#b5bac1]">
            Create a <code className="rounded bg-[#1e1f22] px-1">.env.local</code>{" "}
            file with <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to activate auth,
            realtime, and persistence.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1e1f22] text-[#f2f3f5]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (!session?.user) {
    return <AuthPanel supabase={supabase} />;
  }

  return <DiscordLayout supabase={supabase} user={session.user} />;
}
