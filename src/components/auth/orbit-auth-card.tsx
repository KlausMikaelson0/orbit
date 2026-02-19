"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Orbit, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrbitSupabaseClient, isSupabaseReady } from "@/src/lib/supabase-browser";

type OrbitAuthMode = "signin" | "signup";

export function OrbitAuthCard() {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<OrbitAuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseReady) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseReady) {
      setError("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_* variables.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. Verify your email if confirmation is enabled, then sign in.",
    );
    setMode("signin");
    setLoading(false);
  }

  async function handleGoogle() {
    if (!isSupabaseReady) {
      setError("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_* variables.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  const title = mode === "signin" ? "Welcome back to Orbit" : "Create your Orbit identity";
  const subtitle =
    mode === "signin"
      ? "Continue your mission in Unified Spaces."
      : "Spin up your workspace and invite your team.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06070b] px-4 py-12 text-white">
      <motion.div
        animate={{ y: [0, -25, 0], opacity: [0.25, 0.45, 0.25] }}
        className="orb-blur absolute -left-20 top-0 h-80 w-80 bg-violet-500/30"
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY }}
      />
      <motion.div
        animate={{ x: [0, 24, 0], scale: [1, 1.08, 1] }}
        className="orb-blur absolute -right-16 bottom-0 h-96 w-96 bg-fuchsia-500/20"
        transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY }}
      />
      <div className="cosmic-grid absolute inset-0 opacity-30" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-3xl p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-200">
              <Orbit className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold">Orbit Auth</p>
              <p className="text-sm text-zinc-400">Secure. Fast. Realtime-native.</p>
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-semibold">{title}</h1>
          <p className="mb-8 text-zinc-300">{subtitle}</p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <Input
                className="h-11 rounded-xl bg-black/30"
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                value={name}
              />
            ) : null}
            <Input
              className="h-11 rounded-xl bg-black/30"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@orbit.team"
              type="email"
              value={email}
            />
            <Input
              className="h-11 rounded-xl bg-black/30"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type="password"
              value={password}
            />
            <Button className="h-11 w-full rounded-xl text-sm" disabled={loading} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in to Orbit" : "Create Orbit account"}
            </Button>
          </form>

          <Button
            className="mt-3 h-11 w-full rounded-xl border-violet-400/30 bg-transparent hover:bg-violet-500/10"
            disabled={loading}
            onClick={handleGoogle}
            variant="outline"
          >
            Continue with Google
          </Button>

          <button
            className="mt-5 text-sm text-violet-200 hover:text-violet-100"
            disabled={loading}
            onClick={() => {
              setMode((current) => (current === "signin" ? "signup" : "signin"));
              setError(null);
              setMessage(null);
            }}
            type="button"
          >
            {mode === "signin"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>

          {message ? (
            <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="glass-panel flex flex-col justify-between rounded-3xl p-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Orbit Identity Layer
            </div>
            <h2 className="mb-3 text-2xl font-semibold">Your mission starts with one secure node.</h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Orbit Auth is tuned for modern product teams: email/password,
              Google OAuth, and Supabase session continuity that scales from MVP to
              global realtime collaboration.
            </p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-400">Session continuity</p>
              <p className="text-lg font-semibold text-violet-200">Cross-tab synced</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-400">OAuth readiness</p>
              <p className="text-lg font-semibold text-violet-200">Google enabled</p>
            </div>
            <Button asChild className="w-full rounded-xl" variant="ghost">
              <Link href="/">Back to Neural Hub</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
