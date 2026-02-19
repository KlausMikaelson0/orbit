"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SwipeDismissable } from "@/components/ui/swipe-dismissable";
import { Textarea } from "@/components/ui/textarea";
import { OrbitLanguagePicker } from "@/src/components/i18n/orbit-language-picker";
import { useModal } from "@/src/hooks/use-modal";
import { useOrbitLocale } from "@/src/hooks/use-orbit-locale";
import { useOrbitRuntime } from "@/src/hooks/use-orbit-runtime";
import { getOrbitSupabaseClient } from "@/src/lib/supabase-browser";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { ChannelType } from "@/src/types/orbit";

interface ActionResult {
  error?: string;
}

interface OrbitModalsProps {
  createServer: (values: {
    name: string;
    imageUrl?: string;
  }) => Promise<ActionResult>;
  createChannel: (values: {
    serverId: string;
    name: string;
    type: ChannelType;
  }) => Promise<ActionResult>;
  joinServerByInvite: (inviteCode: string) => Promise<ActionResult>;
}

export function OrbitModals({
  createServer,
  createChannel,
  joinServerByInvite,
}: OrbitModalsProps) {
  const supabase = useMemo(() => getOrbitSupabaseClient(), []);
  const { isOpen, type, data, onClose } = useModal();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverName, setServerName] = useState("");
  const [serverImage, setServerImage] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("TEXT");
  const [inviteCode, setInviteCode] = useState("");
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [aalLevel, setAalLevel] = useState<string | null>(null);
  const [totpFactors, setTotpFactors] = useState<
    Array<{ id: string; status?: string; friendly_name?: string }>
  >([]);
  const [pendingTotp, setPendingTotp] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const { t } = useOrbitLocale();
  const { isElectron, platformLabel } = useOrbitRuntime();
  const { themePreset, customThemeCss, setThemePreset, setCustomThemeCss } =
    useOrbitNavStore(
      useShallow((state) => ({
        themePreset: state.themePreset,
        customThemeCss: state.customThemeCss,
        setThemePreset: state.setThemePreset,
        setCustomThemeCss: state.setCustomThemeCss,
      })),
    );

  const createServerOpen = isOpen && type === "createServer";
  const createChannelOpen = isOpen && type === "createChannel";
  const joinServerOpen = isOpen && type === "joinServer";
  const settingsOpen = isOpen && type === "settings";

  const modalServerId = useMemo(() => data.serverId ?? null, [data.serverId]);

  function resetAndClose() {
    setError(null);
    setSubmitting(false);
    setServerName("");
    setServerImage("");
    setChannelName("");
    setChannelType("TEXT");
    setInviteCode("");
    setMfaError(null);
    setMfaSuccess(null);
    setPendingTotp(null);
    setMfaCode("");
    onClose();
  }

  const fetchMfaState = useCallback(async () => {
    setLoadingMfa(true);
    setMfaError(null);

    const [factorsResult, aalResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsResult.error) {
      setMfaError(factorsResult.error.message);
      setLoadingMfa(false);
      return;
    }

    if (aalResult.error) {
      setMfaError(aalResult.error.message);
      setLoadingMfa(false);
      return;
    }

    const allFactors =
      ((factorsResult.data?.all ?? []) as Array<{
        id: string;
        factor_type?: string;
        status?: string;
        friendly_name?: string;
      }>) ?? [];
    setTotpFactors(
      allFactors.filter((factor) => factor.factor_type === "totp"),
    );
    setAalLevel(aalResult.data?.currentLevel ?? null);
    setLoadingMfa(false);
  }, [supabase]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    void fetchMfaState();
  }, [fetchMfaState, settingsOpen]);

  async function enrollTotp() {
    setMfaError(null);
    setMfaSuccess(null);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Orbit Authenticator",
    });

    if (error || !data) {
      setMfaError(error?.message ?? "Unable to start 2FA enrollment.");
      return;
    }

    setPendingTotp({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setMfaSuccess("Scan the QR code and verify to complete setup.");
  }

  async function verifyTotp() {
    if (!pendingTotp || !mfaCode.trim()) {
      setMfaError("Enter a valid 6-digit authenticator code.");
      return;
    }

    setMfaError(null);
    setMfaSuccess(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingTotp.factorId,
      code: mfaCode.trim(),
    });

    if (error) {
      setMfaError(error.message);
      return;
    }

    setPendingTotp(null);
    setMfaCode("");
    setMfaSuccess("Two-factor authentication enabled.");
    await fetchMfaState();
  }

  async function removeTotpFactor(factorId: string) {
    setMfaError(null);
    setMfaSuccess(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setMfaError(error.message);
      return;
    }
    setMfaSuccess("Authenticator removed.");
    await fetchMfaState();
  }

  const pendingQrDataUri = pendingTotp
    ? `data:image/svg+xml;utf8,${encodeURIComponent(pendingTotp.qrCode)}`
    : null;

  async function submitCreateServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createServer({
      name: serverName,
      imageUrl: serverImage,
    });
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  async function submitCreateChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalServerId) {
      setError("No server selected.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createChannel({
      serverId: modalServerId,
      name: channelName,
      type: channelType,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  async function submitJoinServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await joinServerByInvite(inviteCode);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    resetAndClose();
  }

  return (
    <>
      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={createServerOpen}>
        <DialogContent>
          <SwipeDismissable direction="down" onDismiss={resetAndClose}>
            <DialogHeader>
              <DialogTitle>Create a new Orbit server</DialogTitle>
              <DialogDescription>
                Start a collaboration hub with instant invite sharing.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={submitCreateServer}>
              <Input
                onChange={(event) => setServerName(event.target.value)}
                placeholder="Server name"
                value={serverName}
              />
              <Input
                onChange={(event) => setServerImage(event.target.value)}
                placeholder="Image URL (optional)"
                value={serverImage}
              />
              {error ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button onClick={resetAndClose} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </SwipeDismissable>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={createChannelOpen}>
        <DialogContent>
          <SwipeDismissable direction="down" onDismiss={resetAndClose}>
            <DialogHeader>
              <DialogTitle>Create channel</DialogTitle>
              <DialogDescription>
                Add text, audio, or video channels to your server.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={submitCreateChannel}>
              <Input
                onChange={(event) => setChannelName(event.target.value)}
                placeholder="Channel name"
                value={channelName}
              />
              <div className="grid grid-cols-3 gap-2">
                {(["TEXT", "AUDIO", "VIDEO"] as ChannelType[]).map((typeOption) => (
                  <Button
                    className="rounded-lg"
                    key={typeOption}
                    onClick={() => setChannelType(typeOption)}
                    type="button"
                    variant={channelType === typeOption ? "default" : "secondary"}
                  >
                    {typeOption}
                  </Button>
                ))}
              </div>
              {error ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button onClick={resetAndClose} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </SwipeDismissable>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={joinServerOpen}>
        <DialogContent>
          <SwipeDismissable direction="down" onDismiss={resetAndClose}>
            <DialogHeader>
              <DialogTitle>Join a server</DialogTitle>
              <DialogDescription>
                Enter an invite code to join an Orbit workspace.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-3" onSubmit={submitJoinServer}>
              <Input
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="INVITE CODE"
                value={inviteCode}
              />
              {error ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button onClick={resetAndClose} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Join
                </Button>
              </DialogFooter>
            </form>
          </SwipeDismissable>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && resetAndClose()} open={settingsOpen}>
        <DialogContent className="max-w-2xl">
          <SwipeDismissable direction="down" onDismiss={resetAndClose}>
            <DialogHeader>
              <DialogTitle>Orbit Settings</DialogTitle>
              <DialogDescription>
                Theme engine, security controls, and power tools.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
              <section className="space-y-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                  Theme selector
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "MIDNIGHT", label: "Midnight" },
                    { value: "ONYX", label: "Onyx (True Black)" },
                    { value: "CYBERPUNK", label: "Cyberpunk (Neon)" },
                    { value: "CUSTOM", label: "Custom CSS" },
                  ].map((item) => (
                    <Button
                      className="justify-start rounded-xl"
                      key={item.value}
                      onClick={() =>
                        setThemePreset(
                          item.value as "MIDNIGHT" | "ONYX" | "CYBERPUNK" | "CUSTOM",
                        )
                      }
                      type="button"
                      variant={themePreset === item.value ? "default" : "secondary"}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                      Custom CSS
                    </p>
                    <Button
                      className="rounded-full"
                      onClick={() => setThemePreset("CUSTOM")}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Use custom
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-32 rounded-xl border-white/15 bg-black/35 font-mono text-xs"
                    onChange={(event) => setCustomThemeCss(event.target.value)}
                    placeholder=":root { --orbit-accent: #7c3aed; --orbit-panel: #12131c; }"
                    value={customThemeCss}
                  />
                  <p className="text-[11px] text-zinc-500">
                    Custom CSS is injected only when the Custom CSS theme is active.
                  </p>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                  {t("settings.languageTitle")}
                </p>
                <p className="text-sm text-zinc-300">{t("settings.languageHelp")}</p>
                <OrbitLanguagePicker showLabel={false} />
              </section>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Runtime
                  </p>
                  {isElectron ? (
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-[10px] uppercase tracking-wide text-cyan-100">
                      Desktop App
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-300">
                      Browser
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-200">
                  Running on: {platformLabel}
                </p>
                <p className="text-xs text-zinc-400">
                  {isElectron
                    ? "Orbit desktop mode is active with tray persistence."
                    : "Install Orbit from the landing page to unlock desktop runtime."}
                </p>
              </section>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                    Two-Factor Authentication
                  </p>
                  <span className="text-xs text-zinc-400">
                    Session AAL: {aalLevel ?? "unknown"}
                  </span>
                </div>

                {loadingMfa ? (
                  <p className="text-sm text-zinc-300">Loading 2FA status...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-200">
                      {totpFactors.length
                        ? `${totpFactors.length} authenticator factor(s) connected.`
                        : "No authenticator configured yet."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="rounded-full"
                        onClick={() => void enrollTotp()}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Enable TOTP
                      </Button>
                      {totpFactors.map((factor) => (
                        <Button
                          className="rounded-full"
                          key={factor.id}
                          onClick={() => void removeTotpFactor(factor.id)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Remove {factor.friendly_name ?? "factor"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {pendingTotp && pendingQrDataUri ? (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="mb-2 text-xs text-zinc-400">
                      Scan QR in your authenticator app, then verify.
                    </p>
                    <div className="mb-2 w-fit rounded-lg border border-white/10 bg-white p-2">
                      <Image
                        alt="Orbit 2FA QR code"
                        height={180}
                        src={pendingQrDataUri}
                        unoptimized
                        width={180}
                      />
                    </div>
                    <p className="mb-2 text-[11px] text-zinc-500">
                      Secret: {pendingTotp.secret}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-10"
                        inputMode="numeric"
                        maxLength={8}
                        onChange={(event) => setMfaCode(event.target.value)}
                        placeholder="123456"
                        value={mfaCode}
                      />
                      <Button
                        className="rounded-full"
                        onClick={() => void verifyTotp()}
                        type="button"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                ) : null}

                {mfaError ? (
                  <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {mfaError}
                  </p>
                ) : null}
                {mfaSuccess ? (
                  <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {mfaSuccess}
                  </p>
                ) : null}
              </section>
            </div>

            <DialogFooter>
              <Button onClick={resetAndClose} type="button">
                Close
              </Button>
            </DialogFooter>
          </SwipeDismissable>
        </DialogContent>
      </Dialog>
    </>
  );
}
