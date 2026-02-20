"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useOrbitSocialContext } from "@/src/context/orbit-social-context";
import {
  playOrbitIncomingRingtoneLoop,
  setOrbitIncomingRingtoneMuted,
  stopOrbitIncomingRingtone,
} from "@/src/lib/orbit-notifications";

export function OrbitIncomingCallModal() {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useOrbitSocialContext();
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!incomingCall) {
      setMuted(false);
      stopOrbitIncomingRingtone();
      return;
    }

    setOrbitIncomingRingtoneMuted(muted);
    if (!muted) {
      void playOrbitIncomingRingtoneLoop();
    } else {
      stopOrbitIncomingRingtone();
    }

    return () => {
      stopOrbitIncomingRingtone();
    };
  }, [incomingCall, muted]);

  if (!incomingCall) {
    return null;
  }

  const callerDisplayName = incomingCall.caller_name || "Orbit User";

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-5 right-5 z-[120] w-[min(92vw,360px)] rounded-3xl border border-violet-400/35 bg-[#0b0d17]/95 p-4 shadow-[0_20px_60px_rgba(76,29,149,0.45)] backdrop-blur"
        exit={{ opacity: 0, y: 12 }}
        initial={{ opacity: 0, y: 12 }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-violet-200">Incoming Call</p>
            <p className="text-sm text-zinc-300">
              {incomingCall.mode === "VIDEO" ? "Video call" : "Voice call"}
            </p>
          </div>
          <Button
            className="rounded-full"
            disabled={busy}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setOrbitIncomingRingtoneMuted(next);
              if (next) {
                stopOrbitIncomingRingtone();
              } else {
                void playOrbitIncomingRingtoneLoop();
              }
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative">
            <motion.div
              animate={{ opacity: [0.2, 0.65, 0.2], scale: [1, 1.16, 1] }}
              className="absolute -inset-2 rounded-full bg-emerald-400/25"
              transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY }}
            />
            <Avatar className="relative h-14 w-14 rounded-full border border-white/20">
              <AvatarImage alt={callerDisplayName} src={incomingCall.caller_avatar_url ?? undefined} />
              <AvatarFallback className="bg-violet-500/30 text-violet-100">
                {callerDisplayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-100">{callerDisplayName}</p>
            <p className="truncate text-sm text-zinc-400">
              wants to connect on Orbit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="rounded-full border border-emerald-300/35 bg-emerald-500/20 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:bg-emerald-500/25"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              stopOrbitIncomingRingtone();
              await acceptIncomingCall();
              setBusy(false);
            }}
            type="button"
          >
            <Phone className="h-4 w-4" />
            Accept
          </Button>
          <Button
            className="rounded-full border border-rose-300/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              stopOrbitIncomingRingtone();
              await declineIncomingCall();
              setBusy(false);
            }}
            type="button"
            variant="secondary"
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
