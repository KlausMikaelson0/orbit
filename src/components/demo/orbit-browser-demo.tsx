"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Hash,
  MessagesSquare,
  Mic,
  Orbit,
  Sparkles,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DemoChannelType = "TEXT" | "AUDIO" | "VIDEO" | "FORUM";

interface DemoMessage {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  accent: "violet" | "cyan" | "emerald";
}

interface DemoMember {
  id: string;
  name: string;
  role: "Admin" | "Moderator" | "Guest";
  online: boolean;
}

interface DemoChannel {
  id: string;
  name: string;
  type: DemoChannelType;
  topic: string;
  messages: DemoMessage[];
}

interface DemoServer {
  id: string;
  name: string;
  short: string;
  channels: DemoChannel[];
  members: DemoMember[];
}

const DEMO_SERVERS: DemoServer[] = [
  {
    id: "orbit-hq",
    name: "Orbit HQ",
    short: "OH",
    channels: [
      {
        id: "hq-general",
        name: "general",
        type: "TEXT",
        topic: "Product updates, roadmap, and team sync.",
        messages: [
          {
            id: "m-1",
            author: "Nora",
            content:
              "Welcome to Orbit web demo. This is the Discord-style live chat surface.",
            createdAt: "10:14",
            accent: "violet",
          },
          {
            id: "m-2",
            author: "Orbit Bot",
            content:
              "Tip: open /auth after configuring Supabase to switch from demo to full realtime mode.",
            createdAt: "10:15",
            accent: "cyan",
          },
          {
            id: "m-3",
            author: "Mika",
            content:
              "Voice, video, forum, shop, quests, and labs are all wired in the full stack build.",
            createdAt: "10:17",
            accent: "emerald",
          },
        ],
      },
      {
        id: "hq-announcements",
        name: "announcements",
        type: "TEXT",
        topic: "Official release notes.",
        messages: [
          {
            id: "m-4",
            author: "Orbit Team",
            content: "v1.0.2 desktop builds are available for Windows, macOS, and Linux.",
            createdAt: "09:40",
            accent: "violet",
          },
        ],
      },
      {
        id: "hq-voice",
        name: "town-hall",
        type: "AUDIO",
        topic: "Community voice stage.",
        messages: [],
      },
      {
        id: "hq-forum",
        name: "product-forum",
        type: "FORUM",
        topic: "Long-form threads and tagged discussions.",
        messages: [],
      },
    ],
    members: [
      { id: "u-1", name: "Nora", role: "Admin", online: true },
      { id: "u-2", name: "Mika", role: "Moderator", online: true },
      { id: "u-3", name: "Orbit Bot", role: "Guest", online: true },
      { id: "u-4", name: "Jad", role: "Guest", online: false },
    ],
  },
  {
    id: "creator-lab",
    name: "Creator Lab",
    short: "CL",
    channels: [
      {
        id: "cl-general",
        name: "creator-chat",
        type: "TEXT",
        topic: "Creator economy, tiers, and growth loops.",
        messages: [
          {
            id: "m-5",
            author: "Rayan",
            content: "Use Labs to manage tiers, tips, and app marketplace installs.",
            createdAt: "11:02",
            accent: "cyan",
          },
        ],
      },
      {
        id: "cl-stage",
        name: "stage-live",
        type: "VIDEO",
        topic: "Live sessions and showcases.",
        messages: [],
      },
    ],
    members: [
      { id: "u-5", name: "Rayan", role: "Admin", online: true },
      { id: "u-6", name: "Luna", role: "Moderator", online: true },
      { id: "u-7", name: "Ibrahim", role: "Guest", online: false },
    ],
  },
];

function iconForType(type: DemoChannelType) {
  if (type === "AUDIO") return Mic;
  if (type === "VIDEO") return Video;
  if (type === "FORUM") return MessagesSquare;
  return Hash;
}

function accentClass(accent: DemoMessage["accent"]) {
  if (accent === "cyan") return "bg-cyan-500/20 text-cyan-100 border-cyan-400/30";
  if (accent === "emerald") return "bg-emerald-500/20 text-emerald-100 border-emerald-400/30";
  return "bg-violet-500/20 text-violet-100 border-violet-400/30";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function OrbitBrowserDemo() {
  const [activeServerId, setActiveServerId] = useState(DEMO_SERVERS[0]?.id ?? null);
  const activeServer = useMemo(
    () => DEMO_SERVERS.find((server) => server.id === activeServerId) ?? DEMO_SERVERS[0] ?? null,
    [activeServerId],
  );
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    activeServer?.channels[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, DemoMessage[]>>(() => {
    const entries = DEMO_SERVERS.flatMap((server) =>
      server.channels.map((channel) => [channel.id, channel.messages] as const),
    );
    return Object.fromEntries(entries);
  });

  useEffect(() => {
    if (!activeServer) {
      setActiveChannelId(null);
      return;
    }
    if (activeServer.channels.some((channel) => channel.id === activeChannelId)) {
      return;
    }
    setActiveChannelId(activeServer.channels[0]?.id ?? null);
  }, [activeChannelId, activeServer]);

  const activeChannel = useMemo(
    () =>
      activeServer?.channels.find((channel) => channel.id === activeChannelId) ??
      activeServer?.channels[0] ??
      null,
    [activeChannelId, activeServer],
  );

  const visibleMessages = activeChannel ? messagesByChannel[activeChannel.id] ?? [] : [];

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeChannel || activeChannel.type !== "TEXT") {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const nowLabel = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const nextMessage: DemoMessage = {
      id: `local-${crypto.randomUUID()}`,
      author: "You",
      content: trimmed,
      createdAt: nowLabel,
      accent: "violet",
    };

    setMessagesByChannel((current) => ({
      ...current,
      [activeChannel.id]: [...(current[activeChannel.id] ?? []), nextMessage],
    }));
    setDraft("");
  }

  if (!activeServer || !activeChannel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070b] text-zinc-200">
        Demo data is unavailable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <div className="mx-auto flex h-screen w-full max-w-[1700px] gap-3 p-3">
        <aside className="glass-panel hidden w-[84px] rounded-[1.75rem] border border-white/10 p-2 md:block">
          <div className="space-y-2">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/15 text-violet-100"
              type="button"
            >
              <Orbit className="h-5 w-5" />
            </button>
            {DEMO_SERVERS.map((server) => {
              const active = server.id === activeServer.id;
              return (
                <button
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                    active
                      ? "border-violet-300/60 bg-violet-500/20 text-violet-100"
                      : "border-transparent bg-white/[0.05] text-zinc-300 hover:border-white/15 hover:bg-white/[0.08]"
                  }`}
                  key={server.id}
                  onClick={() => setActiveServerId(server.id)}
                  type="button"
                >
                  {server.short}
                </button>
              );
            })}
          </div>
        </aside>

        <aside className="glass-panel hidden w-[300px] rounded-[1.75rem] border border-white/10 p-3 lg:block">
          <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-sm font-semibold text-violet-100">{activeServer.name}</p>
            <p className="mt-1 text-xs text-zinc-400">{activeChannel.topic}</p>
          </div>
          <div className="space-y-1">
            {activeServer.channels.map((channel) => {
              const Icon = iconForType(channel.type);
              const active = channel.id === activeChannel.id;
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm transition ${
                    active
                      ? "bg-violet-500/20 text-violet-100"
                      : "text-zinc-300 hover:bg-white/[0.07]"
                  }`}
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {channel.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">{channel.type}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="glass-panel min-w-0 flex-1 rounded-[1.75rem] border border-white/10 p-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-violet-200">Orbit Browser Demo</p>
              <p className="text-sm text-zinc-100">
                #{activeChannel.name} · Discord-style preview without backend setup
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild className="rounded-full" size="sm" variant="secondary">
                <Link href="/auth">Connect Supabase Auth</Link>
              </Button>
              <Button asChild className="rounded-full" size="sm">
                <Link href="/dashboard">
                  Open full dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          {activeChannel.type !== "TEXT" ? (
            <div className="flex h-[calc(100%-4.4rem)] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
              <div className="max-w-md">
                <Sparkles className="mx-auto mb-2 h-5 w-5 text-violet-300" />
                <p className="text-base font-semibold text-zinc-100">{activeChannel.type} channel preview</p>
                <p className="mt-2 text-sm text-zinc-300">
                  This demo keeps media channels in preview mode. Configure Supabase + LiveKit to run
                  live voice/video sessions and forum threads.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(100%-4.4rem)] min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="space-y-2">
                  {visibleMessages.map((message) => (
                    <article className="rounded-xl px-2.5 py-2 hover:bg-white/[0.04]" key={message.id}>
                      <div className="mb-1 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/25 text-[11px]">
                          {initials(message.author)}
                        </div>
                        <p className="text-sm font-medium text-zinc-100">{message.author}</p>
                        <p className="text-[11px] text-zinc-500">{message.createdAt}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${accentClass(message.accent)}`}>
                          demo
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200">{message.content}</p>
                    </article>
                  ))}
                </div>
              </div>

              <form className="mt-3 flex items-center gap-2" onSubmit={submitMessage}>
                <Input
                  className="h-11 rounded-xl border-white/15 bg-black/35"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Send a message in demo mode..."
                  value={draft}
                />
                <Button className="h-11 rounded-xl px-5" type="submit">
                  Send
                </Button>
              </form>
            </div>
          )}
        </main>

        <aside className="glass-panel hidden w-[300px] rounded-[1.75rem] border border-white/10 p-3 xl:block">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">Members</p>
          <div className="space-y-1">
            {activeServer.members.map((member) => (
              <div
                className="flex items-center justify-between rounded-xl px-2.5 py-2 hover:bg-white/[0.06]"
                key={member.id}
              >
                <div>
                  <p className="text-sm text-zinc-100">{member.name}</p>
                  <p className="text-[11px] text-zinc-500">{member.role}</p>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    member.online ? "bg-emerald-400" : "bg-zinc-600"
                  }`}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
