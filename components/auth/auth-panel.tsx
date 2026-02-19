"use client";

import { FormEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Disc3, Loader2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuthPanelProps {
  supabase: SupabaseClient;
}

export function AuthPanel({ supabase }: AuthPanelProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = mode === "sign-in" ? "Sign in" : "Create account";

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    if (mode === "sign-in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }

      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. Check your inbox if email confirmation is enabled, then sign in.",
    );
    setMode("sign-in");
    setLoading(false);
  }

  async function handleGoogleAuth() {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e1f22] px-4 py-8 text-[#f2f3f5]">
      <div className="w-full max-w-md rounded-xl border border-[#2b2d31] bg-[#313338] p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-300">
            <Disc3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Orbit Chat</h1>
            <p className="text-sm text-[#b5bac1]">
              Discord-style realtime collaboration
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-md border border-[#4f545c] bg-[#2b2d31] p-3 text-xs text-[#b5bac1]">
          <div className="mb-1 flex items-center gap-2 font-medium text-[#dbdee1]">
            <ShieldCheck className="h-4 w-4 text-indigo-300" />
            Authentication
          </div>
          Email/password and Google OAuth are both wired through Supabase Auth.
        </div>

        <form className="space-y-3" onSubmit={handleAuth}>
          <Input
            autoComplete="email"
            placeholder="you@company.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            autoComplete="current-password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[#80848e]">
          <span className="h-px flex-1 bg-[#3f4248]" />
          OR
          <span className="h-px flex-1 bg-[#3f4248]" />
        </div>

        <Button
          className="w-full"
          disabled={loading}
          onClick={handleGoogleAuth}
          type="button"
          variant="secondary"
        >
          <Mail className="h-4 w-4" />
          Continue with Google
        </Button>

        <button
          className="mt-4 text-sm text-indigo-300 hover:text-indigo-200"
          disabled={loading}
          onClick={() => {
            setMode((current) =>
              current === "sign-in" ? "sign-up" : "sign-in",
            );
            setError(null);
            setMessage(null);
          }}
          type="button"
        >
          {mode === "sign-in"
            ? "Need an account? Create one"
            : "Already registered? Sign in"}
        </button>

        {message ? (
          <p className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
