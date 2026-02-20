"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  Bot,
  CalendarClock,
  Coins,
  CreditCard,
  Cpu,
  Gauge,
  HandCoins,
  Landmark,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type {
  OrbitAchievement,
  OrbitAchievementProgress,
  OrbitCallClip,
  OrbitChannelPermission,
  OrbitCreatorPayoutAccount,
  OrbitCreatorPayoutRequest,
  OrbitCreatorTier,
  OrbitPayoutDestinationType,
  OrbitInstalledApp,
  OrbitLeaderboardEntry,
  OrbitMarketplaceApp,
  OrbitSeason,
  OrbitSeasonProgress,
  OrbitServerAiSettings,
  OrbitServerEvent,
  OrbitServerTemplate,
} from "@/src/types/orbit";

type PermissionToggleField = "can_view" | "can_post" | "can_connect" | "can_manage";

export function OrbitLabsView() {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const { servers, activeServerId, channelsByServer, profile, setProfile } = useOrbitNavStore(
    (state) => ({
      servers: state.servers,
      activeServerId: state.activeServerId,
      channelsByServer: state.channelsByServer,
      profile: state.profile,
      setProfile: state.setProfile,
    }),
  );
  const [scopeServerId, setScopeServerId] = useState<string | null>(activeServerId);
  const [scopeChannelId, setScopeChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  const [templates, setTemplates] = useState<OrbitServerTemplate[]>([]);
  const [permissions, setPermissions] = useState<OrbitChannelPermission[]>([]);
  const [events, setEvents] = useState<OrbitServerEvent[]>([]);
  const [aiSettings, setAiSettings] = useState<OrbitServerAiSettings | null>(null);
  const [seasons, setSeasons] = useState<OrbitSeason[]>([]);
  const [seasonProgressRows, setSeasonProgressRows] = useState<OrbitSeasonProgress[]>([]);
  const [achievements, setAchievements] = useState<OrbitAchievement[]>([]);
  const [achievementProgressRows, setAchievementProgressRows] = useState<
    OrbitAchievementProgress[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<OrbitLeaderboardEntry[]>([]);
  const [creatorTiers, setCreatorTiers] = useState<OrbitCreatorTier[]>([]);
  const [marketplaceApps, setMarketplaceApps] = useState<OrbitMarketplaceApp[]>([]);
  const [installedApps, setInstalledApps] = useState<OrbitInstalledApp[]>([]);
  const [clips, setClips] = useState<OrbitCallClip[]>([]);

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<OrbitServerEvent["event_type"]>("STAGE");
  const [eventStartsAt, setEventStartsAt] = useState("");

  const [creatorSlug, setCreatorSlug] = useState("");
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorPrice, setCreatorPrice] = useState("250");
  const [creatorBenefits, setCreatorBenefits] = useState("");
  const [tipCreatorId, setTipCreatorId] = useState("");
  const [tipAmount, setTipAmount] = useState("100");
  const [tipNote, setTipNote] = useState("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [payoutAccount, setPayoutAccount] = useState<OrbitCreatorPayoutAccount | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<OrbitCreatorPayoutRequest[]>([]);
  const [payoutDestinationType, setPayoutDestinationType] =
    useState<OrbitPayoutDestinationType>("BANK");
  const [payoutProvider, setPayoutProvider] = useState("MANUAL");
  const [payoutDestinationLabel, setPayoutDestinationLabel] = useState("");
  const [payoutHandle, setPayoutHandle] = useState("");
  const [payoutAccountHolder, setPayoutAccountHolder] = useState("");
  const [payoutRequestAmount, setPayoutRequestAmount] = useState("500");
  const [payoutRequestNote, setPayoutRequestNote] = useState("");

  const [clipTitle, setClipTitle] = useState("");
  const [clipUrl, setClipUrl] = useState("");
  const [clipDuration, setClipDuration] = useState("30");
  const [referenceNow, setReferenceNow] = useState("");

  const channelsForScope = useMemo(
    () => (scopeServerId ? channelsByServer[scopeServerId] ?? [] : []),
    [channelsByServer, scopeServerId],
  );
  const activeSeason = useMemo(() => {
    const referenceTime = referenceNow ? new Date(referenceNow).getTime() : 0;
    return (
      seasons.find(
        (season) =>
          season.is_active &&
          new Date(season.starts_at).getTime() <= referenceTime &&
          new Date(season.ends_at).getTime() >= referenceTime,
      ) ??
      seasons[0] ??
      null
    );
  }, [referenceNow, seasons]);
  const activeSeasonProgress = useMemo(
    () =>
      activeSeason
        ? seasonProgressRows.find((row) => row.season_id === activeSeason.id) ?? null
        : null,
    [activeSeason, seasonProgressRows],
  );
  const achievementProgressById = useMemo(
    () =>
      Object.fromEntries(achievementProgressRows.map((row) => [row.achievement_id, row])) as Record<
        string,
        OrbitAchievementProgress
      >,
    [achievementProgressRows],
  );
  const installedAppSlugs = useMemo(
    () => new Set(installedApps.map((entry) => entry.app_slug)),
    [installedApps],
  );

  useEffect(() => {
    if (!scopeServerId && servers[0]?.id) {
      setScopeServerId(servers[0].id);
    }
  }, [scopeServerId, servers]);

  useEffect(() => {
    setReferenceNow(new Date().toISOString());
  }, [seasons]);

  useEffect(() => {
    if (!scopeServerId) {
      setScopeChannelId(null);
      return;
    }
    const channelIds = channelsForScope.map((channel) => channel.id);
    if (!channelIds.length) {
      setScopeChannelId(null);
      return;
    }
    if (!scopeChannelId || !channelIds.includes(scopeChannelId)) {
      setScopeChannelId(channelIds[0]);
    }
  }, [channelsForScope, scopeChannelId, scopeServerId]);

  const fetchLabsState = useCallback(
    async (targetServerId: string | null) => {
      setLoading(true);
      setError(null);

      const templatesResult = await supabase
        .from("orbit_server_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (templatesResult.error) {
        setError(templatesResult.error.message);
        setLoading(false);
        return;
      }
      setTemplates((templatesResult.data ?? []) as OrbitServerTemplate[]);

      const seasonsResult = await supabase
        .from("orbit_seasons")
        .select("*")
        .eq("is_active", true)
        .order("starts_at", { ascending: true });
      if (seasonsResult.error) {
        setError(seasonsResult.error.message);
        setLoading(false);
        return;
      }
      setSeasons((seasonsResult.data ?? []) as OrbitSeason[]);

      const achievementsResult = await supabase
        .from("orbit_achievements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (achievementsResult.error) {
        setError(achievementsResult.error.message);
        setLoading(false);
        return;
      }
      setAchievements((achievementsResult.data ?? []) as OrbitAchievement[]);

      const leaderboardResult = await supabase
        .from("profile_competitive_points")
        .select(
          "profile_id, points, wins, streak, created_at, updated_at, profile:profiles(id, username, tag, full_name, avatar_url, active_background_slug, active_background_css, performance_mode, created_at, updated_at)",
        )
        .order("points", { ascending: false })
        .limit(12);
      if (leaderboardResult.error) {
        setError(leaderboardResult.error.message);
        setLoading(false);
        return;
      }
      const normalizedLeaderboard = ((leaderboardResult.data ?? []) as Array<{
        profile_id: string;
        points: number;
        wins: number;
        streak: number;
        created_at: string;
        updated_at: string;
        profile?: OrbitLeaderboardEntry["profile"] | OrbitLeaderboardEntry["profile"][] | null;
      }>).map((row) => ({
        ...row,
        profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile ?? null,
      })) as OrbitLeaderboardEntry[];
      setLeaderboard(normalizedLeaderboard);

      if (profile?.id) {
        const [
          seasonProgressResult,
          achievementProgressResult,
          walletResult,
          payoutAccountResult,
          payoutRequestsResult,
        ] = await Promise.all([
          supabase
            .from("profile_season_progress")
            .select("*")
            .eq("profile_id", profile.id),
          supabase
            .from("profile_achievement_progress")
            .select("*")
            .eq("profile_id", profile.id),
          supabase
            .from("profile_wallets")
            .select("starbits_balance")
            .eq("profile_id", profile.id)
            .maybeSingle(),
          supabase
            .from("creator_payout_accounts")
            .select("*")
            .eq("profile_id", profile.id)
            .maybeSingle(),
          supabase
            .from("creator_payout_requests")
            .select("*")
            .eq("profile_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(25),
        ]);

        if (seasonProgressResult.error) {
          setError(seasonProgressResult.error.message);
          setLoading(false);
          return;
        }
        if (achievementProgressResult.error) {
          setError(achievementProgressResult.error.message);
          setLoading(false);
          return;
        }
        if (walletResult.error) {
          setError(walletResult.error.message);
          setLoading(false);
          return;
        }
        if (payoutAccountResult.error) {
          setError(payoutAccountResult.error.message);
          setLoading(false);
          return;
        }
        if (payoutRequestsResult.error) {
          setError(payoutRequestsResult.error.message);
          setLoading(false);
          return;
        }

        setSeasonProgressRows((seasonProgressResult.data ?? []) as OrbitSeasonProgress[]);
        setAchievementProgressRows(
          (achievementProgressResult.data ?? []) as OrbitAchievementProgress[],
        );
        setWalletBalance(
          typeof walletResult.data?.starbits_balance === "number"
            ? walletResult.data.starbits_balance
            : 0,
        );
        const nextPayoutAccount = (payoutAccountResult.data ?? null) as OrbitCreatorPayoutAccount | null;
        setPayoutAccount(nextPayoutAccount);
        setPayoutRequests((payoutRequestsResult.data ?? []) as OrbitCreatorPayoutRequest[]);
        if (nextPayoutAccount) {
          setPayoutDestinationType(nextPayoutAccount.destination_type);
          setPayoutProvider(nextPayoutAccount.provider);
          setPayoutDestinationLabel(nextPayoutAccount.destination_label);
          setPayoutHandle(nextPayoutAccount.payout_handle);
          setPayoutAccountHolder(nextPayoutAccount.account_holder_name ?? "");
        }
      } else {
        setSeasonProgressRows([]);
        setAchievementProgressRows([]);
        setWalletBalance(0);
        setPayoutAccount(null);
        setPayoutRequests([]);
      }

      if (!targetServerId) {
        setPermissions([]);
        setEvents([]);
        setAiSettings(null);
        setCreatorTiers([]);
        setMarketplaceApps([]);
        setInstalledApps([]);
        setClips([]);
        setLoading(false);
        return;
      }

      const [permissionResult, eventResult, aiResult, tiersResult, appsResult, installedResult, clipsResult] =
        await Promise.all([
          supabase
            .from("channel_role_permissions")
            .select("*")
            .eq("server_id", targetServerId)
            .order("role", { ascending: true }),
          supabase
            .from("server_events")
            .select("*")
            .eq("server_id", targetServerId)
            .order("starts_at", { ascending: true }),
          supabase
            .from("server_ai_settings")
            .select("*")
            .eq("server_id", targetServerId)
            .maybeSingle(),
          supabase
            .from("creator_tiers")
            .select("*")
            .eq("is_active", true)
            .or(`server_id.eq.${targetServerId},server_id.is.null`)
            .order("created_at", { ascending: false }),
          supabase
            .from("marketplace_apps")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("server_installed_apps")
            .select("*")
            .eq("server_id", targetServerId)
            .order("created_at", { ascending: false }),
          supabase
            .from("call_clips")
            .select("*")
            .eq("server_id", targetServerId)
            .order("created_at", { ascending: false }),
        ]);

      if (permissionResult.error) {
        setError(permissionResult.error.message);
        setLoading(false);
        return;
      }
      if (eventResult.error) {
        setError(eventResult.error.message);
        setLoading(false);
        return;
      }
      if (aiResult.error) {
        setError(aiResult.error.message);
        setLoading(false);
        return;
      }
      if (tiersResult.error) {
        setError(tiersResult.error.message);
        setLoading(false);
        return;
      }
      if (appsResult.error) {
        setError(appsResult.error.message);
        setLoading(false);
        return;
      }
      if (installedResult.error) {
        setError(installedResult.error.message);
        setLoading(false);
        return;
      }
      if (clipsResult.error) {
        setError(clipsResult.error.message);
        setLoading(false);
        return;
      }

      setPermissions((permissionResult.data ?? []) as OrbitChannelPermission[]);
      setEvents((eventResult.data ?? []) as OrbitServerEvent[]);
      setAiSettings((aiResult.data ?? null) as OrbitServerAiSettings | null);
      setCreatorTiers((tiersResult.data ?? []) as OrbitCreatorTier[]);
      setMarketplaceApps((appsResult.data ?? []) as OrbitMarketplaceApp[]);
      setInstalledApps((installedResult.data ?? []) as OrbitInstalledApp[]);
      setClips((clipsResult.data ?? []) as OrbitCallClip[]);
      setLoading(false);
    },
    [profile, supabase],
  );

  useEffect(() => {
    void fetchLabsState(scopeServerId);
  }, [fetchLabsState, scopeServerId]);

  async function togglePerformanceMode() {
    if (!profile?.id) {
      return;
    }
    setWorkingKey("performance");
    setError(null);
    setSuccess(null);

    const nextValue = !Boolean(profile.performance_mode);
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ performance_mode: nextValue })
      .eq("id", profile.id)
      .select("*")
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Unable to update performance mode.");
      setWorkingKey(null);
      return;
    }

    setProfile(data);
    setSuccess(nextValue ? "Ultra Performance Mode enabled." : "Ultra Performance Mode disabled.");
    setWorkingKey(null);
  }

  async function togglePermission(row: OrbitChannelPermission, field: PermissionToggleField) {
    setWorkingKey(`perm:${row.id}:${field}`);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from("channel_role_permissions")
      .update({ [field]: !row[field] })
      .eq("id", row.id);

    if (updateError) {
      setError(updateError.message);
      setWorkingKey(null);
      return;
    }

    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function createEvent() {
    if (!scopeServerId || !profile?.id || !eventTitle.trim() || !eventStartsAt) {
      return;
    }
    setWorkingKey("event:create");
    setError(null);
    setSuccess(null);

    const startsAtIso = new Date(eventStartsAt).toISOString();
    const { error: insertError } = await supabase.from("server_events").insert({
      server_id: scopeServerId,
      channel_id: scopeChannelId,
      host_profile_id: profile.id,
      event_type: eventType,
      title: eventTitle.trim(),
      starts_at: startsAtIso,
    });

    if (insertError) {
      setError(insertError.message);
      setWorkingKey(null);
      return;
    }

    setEventTitle("");
    setEventStartsAt("");
    setSuccess("Event scheduled.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function saveAiSettings(patch: Partial<OrbitServerAiSettings>) {
    if (!scopeServerId) {
      return;
    }
    setWorkingKey("ai:save");
    setError(null);
    setSuccess(null);

    const payload: Partial<OrbitServerAiSettings> & { server_id: string } = {
      server_id: scopeServerId,
      auto_moderation_enabled: aiSettings?.auto_moderation_enabled ?? true,
      auto_summary_enabled: aiSettings?.auto_summary_enabled ?? true,
      ai_assistant_enabled: aiSettings?.ai_assistant_enabled ?? true,
      smart_reply_enabled: aiSettings?.smart_reply_enabled ?? false,
      summarize_interval_minutes: aiSettings?.summarize_interval_minutes ?? 60,
      ...patch,
    };
    const { error: upsertError } = await supabase
      .from("server_ai_settings")
      .upsert(payload, { onConflict: "server_id" });

    if (upsertError) {
      setError(upsertError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess("AI settings saved.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function recordActivity(metric: string) {
    setWorkingKey(`activity:${metric}`);
    setError(null);
    setSuccess(null);

    const { error: activityError } = await supabase.rpc("orbit_record_activity", {
      metric,
      base_points: 12,
      amount: 1,
    });

    if (activityError) {
      setError(activityError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess("Activity recorded for progression.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function claimSeasonLevels() {
    if (!activeSeasonProgress) {
      return;
    }
    setWorkingKey("season:claim");
    setError(null);
    setSuccess(null);

    const { error: claimError } = await supabase.rpc("orbit_claim_season_levels", {
      target_level: activeSeasonProgress.level,
    });
    if (claimError) {
      setError(claimError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess("Season rewards claimed.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function claimAchievement(slug: string) {
    setWorkingKey(`achievement:${slug}`);
    setError(null);
    setSuccess(null);

    const { error: claimError } = await supabase.rpc("orbit_claim_achievement_reward", {
      target_slug: slug,
    });
    if (claimError) {
      setError(claimError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess(`Achievement claimed: ${slug}`);
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function createCreatorTier() {
    if (!profile?.id || !creatorSlug.trim() || !creatorTitle.trim()) {
      return;
    }
    setWorkingKey("creator:tier");
    setError(null);
    setSuccess(null);

    const parsedPrice = Number.parseInt(creatorPrice, 10);
    const { error: tierError } = await supabase.from("creator_tiers").insert({
      creator_profile_id: profile.id,
      server_id: scopeServerId,
      slug: creatorSlug.trim().toLowerCase(),
      title: creatorTitle.trim(),
      monthly_price_starbits: Number.isFinite(parsedPrice) ? parsedPrice : 250,
      benefits: creatorBenefits.trim(),
    });

    if (tierError) {
      setError(tierError.message);
      setWorkingKey(null);
      return;
    }

    setCreatorSlug("");
    setCreatorTitle("");
    setCreatorBenefits("");
    setSuccess("Creator tier published.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function sendTip() {
    if (!tipCreatorId.trim()) {
      return;
    }
    setWorkingKey("creator:tip");
    setError(null);
    setSuccess(null);

    const parsedAmount = Number.parseInt(tipAmount, 10);
    const { error: tipError } = await supabase.rpc("orbit_send_creator_tip", {
      creator_profile: tipCreatorId.trim(),
      tip_amount: Number.isFinite(parsedAmount) ? parsedAmount : 100,
      note: tipNote.trim() || null,
    });

    if (tipError) {
      setError(tipError.message);
      setWorkingKey(null);
      return;
    }

    setTipNote("");
    setSuccess("Tip sent.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function savePayoutAccount() {
    if (!profile?.id) {
      return;
    }
    if (!payoutDestinationLabel.trim() || !payoutHandle.trim()) {
      setError("Destination label and payout handle are required.");
      return;
    }

    setWorkingKey("payout:account");
    setError(null);
    setSuccess(null);

    const { data, error: payoutError } = await supabase.rpc("orbit_upsert_payout_account", {
      destination_type: payoutDestinationType,
      provider: payoutProvider.trim() || "MANUAL",
      destination_label: payoutDestinationLabel.trim(),
      payout_handle: payoutHandle.trim(),
      account_holder_name: payoutAccountHolder.trim() || null,
      currency_code: "USD",
    });

    if (payoutError) {
      setError(payoutError.message);
      setWorkingKey(null);
      return;
    }

    const accountRow = (Array.isArray(data) ? data[0] : data) as OrbitCreatorPayoutAccount | null;
    if (accountRow) {
      setPayoutAccount(accountRow);
    }
    setSuccess("Payout destination saved.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function requestPayout() {
    if (!payoutAccount) {
      setError("Set payout destination first.");
      return;
    }

    const parsedAmount = Number.parseInt(payoutRequestAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      setError("Minimum payout request is 100 Starbits.");
      return;
    }

    setWorkingKey("payout:request");
    setError(null);
    setSuccess(null);

    const { data, error: requestError } = await supabase.rpc("orbit_request_payout", {
      request_amount: parsedAmount,
      note: payoutRequestNote.trim() || null,
    });

    if (requestError) {
      setError(requestError.message);
      setWorkingKey(null);
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { amount_usd_cents?: number; amount_starbits?: number }
      | null;
    const cents = typeof row?.amount_usd_cents === "number" ? row.amount_usd_cents : parsedAmount;
    const starbits = typeof row?.amount_starbits === "number" ? row.amount_starbits : parsedAmount;
    setPayoutRequestNote("");
    setSuccess(
      `Payout requested: ${starbits.toLocaleString()} Starbits ($${(cents / 100).toFixed(2)}).`,
    );
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function cancelPayoutRequest(requestId: string) {
    setWorkingKey(`payout:cancel:${requestId}`);
    setError(null);
    setSuccess(null);

    const { error: cancelError } = await supabase.rpc("orbit_cancel_payout_request", {
      request_id: requestId,
    });

    if (cancelError) {
      setError(cancelError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess("Payout request canceled and funds returned to wallet.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function installApp(slug: string) {
    if (!scopeServerId || !profile?.id) {
      return;
    }
    setWorkingKey(`app:install:${slug}`);
    setError(null);
    setSuccess(null);

    const { error: installError } = await supabase.from("server_installed_apps").insert({
      server_id: scopeServerId,
      app_slug: slug,
      installed_by: profile.id,
    });

    if (installError) {
      setError(installError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess(`Installed app: ${slug}`);
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function uninstallApp(slug: string) {
    if (!scopeServerId) {
      return;
    }
    setWorkingKey(`app:remove:${slug}`);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from("server_installed_apps")
      .delete()
      .eq("server_id", scopeServerId)
      .eq("app_slug", slug);

    if (deleteError) {
      setError(deleteError.message);
      setWorkingKey(null);
      return;
    }

    setSuccess(`Uninstalled app: ${slug}`);
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  async function createClip() {
    if (!scopeServerId || !profile?.id || !clipTitle.trim() || !clipUrl.trim()) {
      return;
    }
    setWorkingKey("clip:create");
    setError(null);
    setSuccess(null);

    const parsedDuration = Number.parseInt(clipDuration, 10);
    const { error: clipError } = await supabase.from("call_clips").insert({
      server_id: scopeServerId,
      channel_id: scopeChannelId,
      created_by: profile.id,
      title: clipTitle.trim(),
      clip_url: clipUrl.trim(),
      duration_seconds: Number.isFinite(parsedDuration) ? parsedDuration : 30,
    });

    if (clipError) {
      setError(clipError.message);
      setWorkingKey(null);
      return;
    }

    setClipTitle("");
    setClipUrl("");
    setClipDuration("30");
    setSuccess("Clip saved.");
    await fetchLabsState(scopeServerId);
    setWorkingKey(null);
  }

  const scopedPermissions = useMemo(
    () => permissions.filter((row) => row.channel_id === scopeChannelId),
    [permissions, scopeChannelId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Orbit Labs</p>
            <h2 className="text-xl font-semibold text-zinc-100">
              Advanced systems: templates, permissions, events, economy, creator tools.
            </h2>
          </div>
          <Button
            className="rounded-full"
            disabled={loading}
            onClick={() => void fetchLabsState(scopeServerId)}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Sparkles className="h-4 w-4" />
            Refresh Labs
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="h-10 rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-zinc-200 outline-none"
            onChange={(event) => setScopeServerId(event.target.value || null)}
            value={scopeServerId ?? ""}
          >
            <option value="">Select server scope</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-zinc-200 outline-none"
            onChange={(event) => setScopeChannelId(event.target.value || null)}
            value={scopeChannelId ?? ""}
          >
            <option value="">Select channel scope</option>
            {channelsForScope.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name} ({channel.type})
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-100">Ultra Performance Mode</p>
          <Button
            className="rounded-full"
            disabled={!profile || workingKey === "performance"}
            onClick={() => void togglePerformanceMode()}
            size="sm"
            type="button"
            variant={profile?.performance_mode ? "default" : "secondary"}
          >
            <Gauge className="h-4 w-4" />
            {profile?.performance_mode ? "Enabled" : "Enable"}
          </Button>
        </div>
        <p className="text-xs text-zinc-400">
          Reduces blur and animation load for lower-end devices and larger servers.
        </p>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 overflow-auto pr-1 xl:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-violet-300" />
            <p className="text-sm font-semibold text-zinc-100">Server Templates</p>
          </div>
          {templates.map((template) => (
            <article className="rounded-xl border border-white/10 bg-black/30 p-3" key={template.key}>
              <p className="text-sm font-semibold text-zinc-100">{template.name}</p>
              <p className="text-xs text-zinc-300">{template.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {template.channels.map((entry) => (
                  <span
                    className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-zinc-300"
                    key={`${template.key}-${entry.name}-${entry.type}`}
                  >
                    {entry.name} · {entry.type}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-semibold text-zinc-100">Permission Matrix</p>
          </div>
          {!scopeChannelId ? (
            <p className="text-xs text-zinc-400">Pick a channel to edit role-based permissions.</p>
          ) : (
            scopedPermissions.map((row) => (
              <article className="rounded-xl border border-white/10 bg-black/30 p-3" key={row.id}>
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-300">{row.role}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: "can_view", label: "View" },
                      { key: "can_post", label: "Post" },
                      { key: "can_connect", label: "Connect" },
                      { key: "can_manage", label: "Manage" },
                    ] as Array<{ key: PermissionToggleField; label: string }>
                  ).map((item) => (
                    <Button
                      className="h-8 rounded-lg"
                      key={item.key}
                      onClick={() => void togglePermission(row, item.key)}
                      size="sm"
                      type="button"
                      variant={row[item.key] ? "default" : "secondary"}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-300" />
            <p className="text-sm font-semibold text-zinc-100">Stage / Live Events</p>
          </div>
          <div className="grid gap-2">
            <Input
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="Event title"
              value={eventTitle}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-zinc-200 outline-none"
                onChange={(event) => setEventType(event.target.value as OrbitServerEvent["event_type"])}
                value={eventType}
              >
                <option value="STAGE">STAGE</option>
                <option value="LIVE">LIVE</option>
                <option value="COMMUNITY">COMMUNITY</option>
              </select>
              <Input
                onChange={(event) => setEventStartsAt(event.target.value)}
                type="datetime-local"
                value={eventStartsAt}
              />
            </div>
            <Button
              className="rounded-lg"
              disabled={!scopeServerId || workingKey === "event:create"}
              onClick={() => void createEvent()}
              type="button"
            >
              Schedule Event
            </Button>
          </div>
          <div className="space-y-2">
            {events.map((event) => (
              <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-xs" key={event.id}>
                <p className="font-semibold text-zinc-100">{event.title}</p>
                <p className="text-zinc-300">
                  {event.event_type} · {new Date(event.starts_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-fuchsia-300" />
            <p className="text-sm font-semibold text-zinc-100">AI Mod + AI Assist</p>
          </div>
          {aiSettings ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "auto_moderation_enabled", label: "Auto Moderation" },
                    { key: "auto_summary_enabled", label: "Auto Summary" },
                    { key: "ai_assistant_enabled", label: "AI Assistant" },
                    { key: "smart_reply_enabled", label: "Smart Reply" },
                  ] as Array<{
                    key:
                      | "auto_moderation_enabled"
                      | "auto_summary_enabled"
                      | "ai_assistant_enabled"
                      | "smart_reply_enabled";
                    label: string;
                  }>
                ).map((item) => (
                  <Button
                    className="h-8 rounded-lg"
                    key={item.key}
                    onClick={() =>
                      void saveAiSettings({
                        [item.key]: !aiSettings[item.key],
                      })
                    }
                    size="sm"
                    type="button"
                    variant={aiSettings[item.key] ? "default" : "secondary"}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  min={5}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(parsed)) {
                      void saveAiSettings({
                        summarize_interval_minutes: parsed,
                      });
                    }
                  }}
                  type="number"
                  value={aiSettings.summarize_interval_minutes}
                />
                <span className="text-xs text-zinc-400">minutes</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-400">No AI settings found for this server scope.</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-semibold text-zinc-100">Season Pass + Achievements + Leaderboard</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-zinc-300">
            <p>
              Active season: <span className="font-semibold text-zinc-100">{activeSeason?.name ?? "None"}</span>
            </p>
            <p>
              Level {activeSeasonProgress?.level ?? 1} · XP {activeSeasonProgress?.xp ?? 0} · Claimed{" "}
              {activeSeasonProgress?.claimed_level ?? 0}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                className="h-8 rounded-lg"
                onClick={() => void recordActivity("SOCIAL")}
                size="sm"
                type="button"
                variant="secondary"
              >
                Log Activity
              </Button>
              <Button
                className="h-8 rounded-lg"
                disabled={!activeSeasonProgress || workingKey === "season:claim"}
                onClick={() => void claimSeasonLevels()}
                size="sm"
                type="button"
              >
                Claim Unlocked Levels
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {achievements.map((achievement) => {
              const progress = achievementProgressById[achievement.id];
              const value = progress?.progress_value ?? 0;
              const unlocked = Boolean(progress?.unlocked_at);
              const claimed = Boolean(progress?.claimed_at);
              return (
                <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-xs" key={achievement.id}>
                  <p className="font-semibold text-zinc-100">{achievement.title}</p>
                  <p className="text-zinc-300">
                    {value}/{achievement.target_value} · +{achievement.reward_starbits} Starbits
                  </p>
                  <Button
                    className="mt-1 h-7 rounded-lg"
                    disabled={!unlocked || claimed || workingKey === `achievement:${achievement.slug}`}
                    onClick={() => void claimAchievement(achievement.slug)}
                    size="sm"
                    type="button"
                    variant={claimed ? "secondary" : "default"}
                  >
                    {claimed ? "Claimed" : "Claim"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Leaderboard</p>
            <div className="space-y-1 text-xs">
              {leaderboard.map((entry, index) => {
                const profileName =
                  entry.profile?.full_name ?? entry.profile?.username ?? entry.profile_id.slice(0, 6);
                return (
                  <p className="flex items-center justify-between text-zinc-300" key={entry.profile_id}>
                    <span>
                      #{index + 1} {profileName}
                    </span>
                    <span className="font-semibold text-zinc-100">{entry.points}</span>
                  </p>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-300" />
            <p className="text-sm font-semibold text-zinc-100">Creator Monetization</p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Create support tier</p>
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                onChange={(event) => setCreatorSlug(event.target.value)}
                placeholder="tier slug"
                value={creatorSlug}
              />
              <Input
                onChange={(event) => setCreatorTitle(event.target.value)}
                placeholder="tier title"
                value={creatorTitle}
              />
            </div>
            <Input
              onChange={(event) => setCreatorPrice(event.target.value)}
              placeholder="monthly price starbits"
              type="number"
              value={creatorPrice}
            />
            <Textarea
              className="min-h-20 rounded-xl border-white/15 bg-black/35"
              onChange={(event) => setCreatorBenefits(event.target.value)}
              placeholder="benefits list"
              value={creatorBenefits}
            />
            <Button
              className="rounded-lg"
              disabled={!profile || workingKey === "creator:tier"}
              onClick={() => void createCreatorTier()}
              type="button"
            >
              Publish Tier
            </Button>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Send creator tip</p>
            <Input
              onChange={(event) => setTipCreatorId(event.target.value)}
              placeholder="creator profile id"
              value={tipCreatorId}
            />
            <Input
              onChange={(event) => setTipAmount(event.target.value)}
              placeholder="tip amount starbits"
              type="number"
              value={tipAmount}
            />
            <Textarea
              className="min-h-16 rounded-xl border-white/15 bg-black/35"
              onChange={(event) => setTipNote(event.target.value)}
              placeholder="tip note"
              value={tipNote}
            />
            <Button
              className="rounded-lg"
              disabled={workingKey === "creator:tip"}
              onClick={() => void sendTip()}
              type="button"
              variant="secondary"
            >
              Send Tip
            </Button>
          </div>

          <div className="space-y-1">
            {creatorTiers.map((tier) => (
              <div className="rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-zinc-300" key={tier.id}>
                <p className="font-semibold text-zinc-100">{tier.title}</p>
                <p>
                  {tier.monthly_price_starbits} Starbits / month · @{tier.creator_profile_id.slice(0, 6)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Payout destination</p>
              <span className="text-[11px] text-zinc-400">
                Balance: {walletBalance.toLocaleString()} Starbits
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "BANK" as const, label: "Bank", icon: Landmark },
                  { value: "CARD" as const, label: "Card", icon: CreditCard },
                  { value: "WALLET" as const, label: "Wallet", icon: WalletCards },
                ] as const
              ).map((item) => (
                <Button
                  className="h-8 rounded-lg"
                  key={item.value}
                  onClick={() => setPayoutDestinationType(item.value)}
                  size="sm"
                  type="button"
                  variant={payoutDestinationType === item.value ? "default" : "secondary"}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                onChange={(event) => setPayoutProvider(event.target.value)}
                placeholder="provider (BANK/WISE/PAYPAL)"
                value={payoutProvider}
              />
              <Input
                onChange={(event) => setPayoutAccountHolder(event.target.value)}
                placeholder="account holder name"
                value={payoutAccountHolder}
              />
            </div>
            <Input
              onChange={(event) => setPayoutDestinationLabel(event.target.value)}
              placeholder="destination label (My Bank Account)"
              value={payoutDestinationLabel}
            />
            <Input
              onChange={(event) => setPayoutHandle(event.target.value)}
              placeholder="IBAN / card token / wallet handle"
              value={payoutHandle}
            />
            <Button
              className="rounded-lg"
              disabled={!profile || workingKey === "payout:account"}
              onClick={() => void savePayoutAccount()}
              type="button"
            >
              Save Payout Destination
            </Button>
            <p className="text-[11px] text-zinc-500">
              Current status: {payoutAccount?.is_verified ? "Verified" : "Pending verification"}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Withdraw earnings</p>
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                min={100}
                onChange={(event) => setPayoutRequestAmount(event.target.value)}
                placeholder="withdraw starbits"
                type="number"
                value={payoutRequestAmount}
              />
              <Input disabled readOnly value="USD (1 Starbit = $0.01)" />
            </div>
            <Textarea
              className="min-h-16 rounded-xl border-white/15 bg-black/35"
              onChange={(event) => setPayoutRequestNote(event.target.value)}
              placeholder="optional note for payout team"
              value={payoutRequestNote}
            />
            <Button
              className="rounded-lg"
              disabled={!payoutAccount || workingKey === "payout:request"}
              onClick={() => void requestPayout()}
              type="button"
              variant="secondary"
            >
              <HandCoins className="h-4 w-4" />
              Request Payout
            </Button>
            <div className="space-y-1">
              {payoutRequests.map((request) => (
                <div
                  className="rounded-lg border border-white/10 bg-black/35 p-2 text-xs text-zinc-300"
                  key={request.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-100">
                      {request.amount_starbits.toLocaleString()} Starbits · $
                      {(request.amount_usd_cents / 100).toFixed(2)}
                    </p>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px]">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-400">
                    {request.destination_type} · {request.destination_label}
                  </p>
                  <p className="text-zinc-500">{new Date(request.created_at).toLocaleString()}</p>
                  {request.status === "PENDING" ? (
                    <Button
                      className="mt-2 h-7 rounded-lg"
                      disabled={workingKey === `payout:cancel:${request.id}`}
                      onClick={() => void cancelPayoutRequest(request.id)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Cancel Request
                    </Button>
                  ) : null}
                </div>
              ))}
              {!payoutRequests.length ? (
                <p className="text-[11px] text-zinc-500">No payout requests yet.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <AppWindow className="h-4 w-4 text-violet-300" />
            <p className="text-sm font-semibold text-zinc-100">App / Bot Marketplace</p>
          </div>
          <div className="space-y-2">
            {marketplaceApps.map((app) => {
              const installed = installedAppSlugs.has(app.slug);
              return (
                <article className="rounded-xl border border-white/10 bg-black/30 p-3" key={app.slug}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {app.name} <span className="text-xs text-zinc-400">({app.category})</span>
                      </p>
                      <p className="text-xs text-zinc-300">{app.description}</p>
                    </div>
                    <Button
                      className="rounded-lg"
                      disabled={!scopeServerId || workingKey?.startsWith(`app:`)}
                      onClick={() =>
                        installed ? void uninstallApp(app.slug) : void installApp(app.slug)
                      }
                      size="sm"
                      type="button"
                      variant={installed ? "secondary" : "default"}
                    >
                      <Bot className="h-4 w-4" />
                      {installed ? "Uninstall" : "Install"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-semibold text-zinc-100">Clips / Highlights</p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
            <Input
              onChange={(event) => setClipTitle(event.target.value)}
              placeholder="clip title"
              value={clipTitle}
            />
            <Input
              onChange={(event) => setClipUrl(event.target.value)}
              placeholder="clip URL"
              value={clipUrl}
            />
            <Input
              onChange={(event) => setClipDuration(event.target.value)}
              placeholder="duration seconds"
              type="number"
              value={clipDuration}
            />
            <Button
              className="rounded-lg"
              disabled={!scopeServerId || !profile || workingKey === "clip:create"}
              onClick={() => void createClip()}
              type="button"
            >
              Save Clip
            </Button>
          </div>
          <div className="space-y-1">
            {clips.map((clip) => (
              <a
                className="block rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-zinc-300 hover:bg-white/[0.03]"
                href={clip.clip_url}
                key={clip.id}
                rel="noreferrer"
                target="_blank"
              >
                <p className="font-semibold text-zinc-100">{clip.title}</p>
                <p>{clip.duration_seconds}s</p>
              </a>
            ))}
          </div>
        </section>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {success}
        </p>
      ) : null}
    </div>
  );
}
