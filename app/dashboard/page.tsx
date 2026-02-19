import { ArrowUpRight, CircleDashed, MessageSquareText, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";

const activity = [
  { label: "Messages synced", value: "14,232", trend: "+11.2%" },
  { label: "Active space members", value: "482", trend: "+4.7%" },
  { label: "Realtime events / minute", value: "2,164", trend: "+18.1%" },
];

export default function DashboardHomePage() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                Orbit Mission Board
              </p>
              <h1 className="text-2xl font-semibold text-violet-100">
                Unified collaboration cockpit
              </h1>
            </div>
            <Button className="rounded-full" size="sm">
              Create Space
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {activity.map((item) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                key={item.label}
              >
                <p className="text-xs text-zinc-400">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-emerald-300">{item.trend}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Live Orbit queue</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-medium text-violet-100">Launch-control brief</p>
              <p className="mt-1 text-zinc-300">
                Draft executive summary for tomorrow's release call.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-medium text-violet-100">Neural digest pending</p>
              <p className="mt-1 text-zinc-300">
                AI context digest is compiling from 3 spaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-violet-300" />
            <h2 className="text-lg font-semibold">Conversation Flow</h2>
          </div>
          <p className="text-sm text-zinc-300">
            Orbit keeps messages clean and contextual. Threads are grouped by
            objective, not noise, making asynchronous collaboration easier for distributed teams.
          </p>
        </article>
        <article className="rounded-3xl border border-white/10 bg-black/25 p-5">
          <div className="mb-3 flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-violet-300" />
            <h2 className="text-lg font-semibold">Realtime Stability</h2>
          </div>
          <p className="text-sm text-zinc-300">
            Powered by Supabase Realtime channels, Orbit pushes updates with
            predictable latency while preserving smooth interaction on low-power devices.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-dashed border-violet-300/30 bg-violet-500/10 p-5">
        <div className="flex items-start gap-3">
          <CircleDashed className="mt-1 h-5 w-5 text-violet-200" />
          <div>
            <h3 className="text-lg font-semibold text-violet-100">AI-ready architecture</h3>
            <p className="mt-1 text-sm text-zinc-300">
              The dashboard is structured for future agent orchestration: context rails, task
              extraction, and predictive summaries can slot in without redesigning core flows.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
