"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Bot, Loader2, LogOut, Orbit, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOrbitSupabaseClient, isSupabaseReady } from "@/src/lib/supabase-browser";
import { DynamicNavigation } from "@/src/components/navigation/dynamic-navigation";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

interface OrbitDashboardShellProps {
  children: ReactNode;
}

export function OrbitDashboardShell({ children }: OrbitDashboardShellProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navSummary = useOrbitNavStore((state) => state.getSummary());

  useEffect(() => {
    if (!isSupabaseReady) {
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

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    if (!isSupabaseReady) {
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070b] text-violet-200">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isSupabaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070b] px-4 text-white">
        <div className="glass-panel max-w-xl rounded-3xl p-8">
          <h1 className="mb-3 text-2xl font-semibold">Supabase setup required</h1>
          <p className="text-sm text-zinc-300">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code>.env.local</code> to activate Orbit Auth and realtime sync.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070b] px-4 text-white">
        <div className="glass-panel max-w-lg rounded-3xl p-8 text-center">
          <Orbit className="mx-auto mb-3 h-7 w-7 text-violet-300" />
          <h1 className="mb-2 text-2xl font-semibold">Authentication required</h1>
          <p className="mb-5 text-sm text-zinc-300">
            Sign in to enter Orbit Dashboard and unlock Unified Spaces.
          </p>
          <Button asChild className="rounded-full px-6">
            <Link href="/auth">Go to Orbit Auth</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06070b] text-white">
      <div className="cosmic-grid absolute inset-0 opacity-35" />
      <div className="orb-blur absolute -left-20 top-16 h-80 w-80 bg-violet-500/30" />
      <div className="orb-blur absolute -right-24 bottom-0 h-96 w-96 bg-fuchsia-500/20" />

      <div className="relative mx-auto flex h-screen w-full max-w-[1700px] gap-4 p-4">
        <DynamicNavigation />

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="glass-panel flex h-[72px] items-center justify-between rounded-[1.75rem] px-5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                {navSummary.activeSpaceName}
              </p>
              <p className="truncate text-lg font-semibold text-violet-100">
                #{navSummary.activeChannelName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="rounded-full" size="sm" variant="secondary">
                <Sparkles className="h-4 w-4" />
                Orbit AI Soon
              </Button>
              <Button className="rounded-full" onClick={() => void signOut()} size="icon" variant="ghost">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="glass-panel min-h-0 flex-1 overflow-auto rounded-[1.75rem] p-5">
            {children}
          </div>
        </section>

        <aside className="glass-panel hidden w-[320px] shrink-0 rounded-[1.75rem] p-4 xl:block">
          <div className="mb-4 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-violet-200">AI-ready rail</p>
            <h2 className="mt-1 text-lg font-semibold">Orbit Pulse</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Context engines, summaries, and action suggestions will dock here.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <Bot className="h-4 w-4" />
                <p className="text-sm font-medium">Neural Insight</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                Launch-control thread velocity has increased 28% in the last 6 hours.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-200">
                <WandSparkles className="h-4 w-4" />
                <p className="text-sm font-medium">Suggested Automation</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-300">
                Convert repetitive standup updates into an async digest workflow.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
