"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface OrbitGifResult {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number | null;
  height: number | null;
}

interface OrbitGifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gif: OrbitGifResult) => Promise<void> | void;
}

export function OrbitGifPicker({ open, onOpenChange, onSelectGif }: OrbitGifPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OrbitGifResult[]>([]);
  const [busyGifId, setBusyGifId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 240);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    const searchParams = new URLSearchParams();
    if (debouncedQuery) {
      searchParams.set("q", debouncedQuery);
    }
    searchParams.set("limit", "24");

    void fetch(`/api/giphy/search?${searchParams.toString()}`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: OrbitGifResult[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to fetch GIFs.");
        }
        setResults(payload.items ?? []);
      })
      .catch((fetchError) => {
        if (abortController.signal.aborted) {
          return;
        }
        setResults([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch GIFs.");
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [debouncedQuery, open]);

  const subtitle = useMemo(() => {
    if (debouncedQuery) {
      return `Results for "${debouncedQuery}"`;
    }
    return "Trending GIFs";
  }, [debouncedQuery]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border-white/10 bg-[#0a0b13] p-0 text-zinc-100">
        <DialogHeader className="border-b border-white/10 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-300" />
            GIF Picker
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="h-10 rounded-xl border-white/10 bg-black/35 pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search GIFs..."
              value={query}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>
        </div>

        <ScrollArea className="h-[55vh] px-4 pb-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}

          {!loading && !error ? (
            <div className="grid grid-cols-2 gap-3 pb-3 md:grid-cols-3">
              {results.map((gif) => (
                <button
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/35 text-left transition hover:border-violet-400/35"
                  disabled={busyGifId === gif.id}
                  key={gif.id}
                  onClick={async () => {
                    setBusyGifId(gif.id);
                    await onSelectGif(gif);
                    setBusyGifId(null);
                  }}
                  type="button"
                >
                  <Image
                    alt={gif.title}
                    className="h-36 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    height={gif.height ?? 360}
                    src={gif.preview_url}
                    unoptimized
                    width={gif.width ?? 360}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                    <p className="truncate text-[11px] text-zinc-100">{gif.title}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!loading && !error && results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-zinc-500">
              No GIFs found.
            </div>
          ) : null}
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-3">
          <Button className="rounded-full" onClick={() => onOpenChange(false)} variant="ghost">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
