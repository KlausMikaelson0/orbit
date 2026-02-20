"use client";

import { BarChart3, Loader2, RefreshCw, Signal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useServerAnalytics } from "@/src/hooks/use-server-analytics";

interface ServerAnalyticsDashboardProps {
  serverId: string | null;
  enabled: boolean;
}

function AnalyticsCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-violet-100">{value}</p>
    </div>
  );
}

export function ServerAnalyticsDashboard({
  serverId,
  enabled,
}: ServerAnalyticsDashboardProps) {
  const { analytics, loadingAnalytics, analyticsError, refreshAnalytics } =
    useServerAnalytics(serverId, enabled);

  if (!enabled || !serverId) {
    return null;
  }

  return (
    <section className="mb-3 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-violet-100">
          <BarChart3 className="h-4 w-4" />
          <p className="text-sm font-semibold">Global Analytics Dashboard</p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => void refreshAnalytics()}
          size="sm"
          type="button"
          variant="secondary"
        >
          {loadingAnalytics ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loadingAnalytics ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <AnalyticsCard label="Members Total" value={analytics.membersTotal} />
            <AnalyticsCard label="Channels" value={analytics.channelsTotal} />
            <AnalyticsCard label="Active (24h)" value={analytics.activeMembers24h} />
            <AnalyticsCard label="Online now" value={analytics.currentlyOnline} />
            <AnalyticsCard label="Messages (24h)" value={analytics.messages24h} />
            <AnalyticsCard label="Messages (7d)" value={analytics.messages7d} />
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-400">
            <Signal className="h-3.5 w-3.5 text-violet-200" />
            Data source:{" "}
            {analytics.source === "edge-function"
              ? "Supabase Edge Function"
              : "Client fallback"}
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-300">No analytics data available yet.</p>
      )}

      {analyticsError ? (
        <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {analyticsError}
        </p>
      ) : null}
    </section>
  );
}
