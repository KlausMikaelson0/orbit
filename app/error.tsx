"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const errorMessage =
    error?.message?.trim() || "Something went wrong while rendering this page.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06070b] px-4 text-white">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-amber-300" />
        <h1 className="mb-2 text-2xl font-semibold">Orbit hit a turbulence point</h1>
        <p className="mb-6 text-sm text-zinc-300">{errorMessage}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button className="rounded-full" onClick={() => reset()} type="button">
            Try again
          </Button>
          <Button asChild className="rounded-full" variant="secondary">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
