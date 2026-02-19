"use client";

import Link from "next/link";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const message = error?.message?.trim() || "Unexpected application error.";

  return (
    <html className="dark" data-orbit-theme="midnight" lang="en">
      <body className="bg-[#06070b] text-white antialiased">
        <main className="flex min-h-screen items-center justify-center px-4">
          <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/35 p-8 text-center">
            <h1 className="mb-2 text-2xl font-semibold text-violet-100">
              Orbit encountered a critical error
            </h1>
            <p className="mb-6 text-sm text-zinc-300">{message}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                className="rounded-full border border-violet-400/35 bg-violet-500/20 px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-500/30"
                onClick={() => reset()}
                type="button"
              >
                Retry
              </button>
              <Link
                className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/[0.08]"
                href="/"
              >
                Back to home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
