"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  Download,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Menu,
  Orbit,
  PanelRight,
  Settings2,
  Sparkles,
  Users,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SwipeDismissable } from "@/components/ui/swipe-dismissable";
import { OrbitModals } from "@/src/components/modals/orbit-modals";
import { OrbitWelcomeTutorial } from "@/src/components/onboarding/orbit-welcome-tutorial";
import { ChannelSidebar } from "@/src/components/sidebar/channel-sidebar";
import { MembersSidebar } from "@/src/components/sidebar/members-sidebar";
import { ServerSidebar } from "@/src/components/sidebar/server-sidebar";
import { OrbitSocialProvider } from "@/src/context/orbit-social-context";
import { useModal } from "@/src/hooks/use-modal";
import { useOrbitInstallPrompt } from "@/src/hooks/use-orbit-install-prompt";
import { useOrbitThemeEngine } from "@/src/hooks/use-orbit-theme-engine";
import { useOrbitSocial } from "@/src/hooks/use-orbit-social";
import { useOrbitWorkspace } from "@/src/hooks/use-orbit-workspace";
import { getOrbitSupabaseClient, isSupabaseReady } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

interface OrbitDashboardShellProps {
  children: ReactNode;
}

const OrbitCommandPalette = dynamic(
  () =>
    import("@/src/components/search/orbit-command-palette").then(
      (mod) => mod.OrbitCommandPalette,
    ),
  { ssr: false },
);

export function OrbitDashboardShell({ children }: OrbitDashboardShellProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { onOpen } = useModal();
  useOrbitThemeEngine();
  const { canInstall, triggerInstall } = useOrbitInstallPrompt();
  const {
    navSummary,
    serverCount,
    mobilePanels,
    setMobilePanelOpen,
    privacyMode,
    togglePrivacyMode,
  } = useOrbitNavStore((state) => ({
    navSummary: state.getSummary(),
    serverCount: state.servers.length,
    mobilePanels: state.mobilePanels,
    setMobilePanelOpen: state.setMobilePanelOpen,
    privacyMode: state.privacyMode,
    togglePrivacyMode: state.togglePrivacyMode,
  }));
  const { loadingServers, createServer, createChannel, joinServerByInvite } =
    useOrbitWorkspace(session?.user ?? null);
  const social = useOrbitSocial(session?.user ?? null);

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

      <OrbitSocialProvider value={social}>
        <OrbitCommandPalette
          openOrCreateDmWithProfile={social.openOrCreateDmWithProfile}
        />
        <OrbitWelcomeTutorial
          onCreateSpace={() => onOpen("createServer")}
          onJoinSpace={() => onOpen("joinServer")}
          serverCount={serverCount}
        />

        <div className="relative mx-auto flex h-screen w-full max-w-[1700px] gap-4 p-4">
          <div className="hidden md:block">
            <ServerSidebar loading={loadingServers} />
          </div>
          <div className="hidden lg:block">
            <ChannelSidebar />
          </div>

          <section className="flex min-w-0 flex-1 flex-col gap-4">
            <header className="glass-panel flex h-[72px] items-center justify-between rounded-[1.75rem] px-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 md:hidden">
                  <Button
                    className="rounded-full"
                    onClick={() => setMobilePanelOpen("servers", true)}
                    size="icon"
                    variant="ghost"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-full"
                    onClick={() => setMobilePanelOpen("context", true)}
                    size="icon"
                    variant="ghost"
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                    {navSummary.activeServerName}
                  </p>
                  <p className="truncate text-lg font-semibold text-violet-100">
                    #{navSummary.activeChannelName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  className="rounded-full"
                  onClick={() => togglePrivacyMode()}
                  size="icon"
                  title="Privacy Mode"
                  variant={privacyMode ? "secondary" : "ghost"}
                >
                  {privacyMode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => onOpen("joinServer")}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Join</span>
                </Button>
                <Button
                  className="rounded-full"
                  onClick={() => onOpen("settings")}
                  size="icon"
                  title="Orbit Settings"
                  variant="ghost"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                {canInstall ? (
                  <Button
                    className="rounded-full"
                    onClick={() => void triggerInstall()}
                    size="icon"
                    title="Install Orbit App"
                    variant="ghost"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button className="hidden rounded-full sm:inline-flex" size="sm" variant="secondary">
                  <Sparkles className="h-4 w-4" />
                  Orbit AI Soon
                </Button>
                <Button className="rounded-full" onClick={() => void signOut()} size="icon" variant="ghost">
                  <LogOut className="h-4 w-4" />
                </Button>
                <Button
                  className="rounded-full xl:hidden"
                  onClick={() => setMobilePanelOpen("members", true)}
                  size="icon"
                  variant="ghost"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="glass-panel min-h-0 flex-1 overflow-auto rounded-[1.75rem] p-5">
              {children}
            </div>
          </section>

          <MembersSidebar user={session.user} />
        </div>

        <Dialog
          onOpenChange={(open) => setMobilePanelOpen("servers", open)}
          open={mobilePanels.servers}
        >
          <DialogContent className="h-[86vh] max-w-[95vw] p-0 md:hidden">
            <SwipeDismissable
              className="h-full"
              direction="right"
              onDismiss={() => setMobilePanelOpen("servers", false)}
            >
              <ServerSidebar
                loading={loadingServers}
                mobile
                onNavigate={() => setMobilePanelOpen("servers", false)}
              />
            </SwipeDismissable>
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => setMobilePanelOpen("context", open)}
          open={mobilePanels.context}
        >
          <DialogContent className="h-[86vh] max-w-[95vw] p-0 lg:hidden">
            <SwipeDismissable
              className="h-full"
              direction="right"
              onDismiss={() => setMobilePanelOpen("context", false)}
            >
              <ChannelSidebar
                mobile
                onNavigate={() => setMobilePanelOpen("context", false)}
              />
            </SwipeDismissable>
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => setMobilePanelOpen("members", open)}
          open={mobilePanels.members}
        >
          <DialogContent className="h-[86vh] max-w-[95vw] p-0 xl:hidden">
            <SwipeDismissable
              className="h-full"
              direction="right"
              onDismiss={() => setMobilePanelOpen("members", false)}
            >
              <MembersSidebar mobile user={session.user} />
            </SwipeDismissable>
          </DialogContent>
        </Dialog>

        <OrbitModals
          createChannel={createChannel}
          createServer={createServer}
          joinServerByInvite={joinServerByInvite}
        />
      </OrbitSocialProvider>
    </div>
  );
}
