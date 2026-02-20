"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Rocket, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SwipeDismissable } from "@/components/ui/swipe-dismissable";

interface OrbitWelcomeTutorialProps {
  serverCount: number;
  onCreateSpace: () => void;
  onJoinSpace: () => void;
}

const DISMISS_KEY = "orbit.onboarding.dismissed.v1";

const tutorialSteps = [
  {
    title: "Welcome to Orbit",
    description:
      "Orbit blends community chat and team productivity into one realtime workspace.",
    icon: Rocket,
  },
  {
    title: "Create your first Space",
    description:
      "Start with one server, add channels for chat/tasks, and set your collaboration rhythm.",
    icon: CheckCircle2,
  },
  {
    title: "Invite your crew",
    description:
      "Share your invite code so friends and teammates can join instantly and collaborate.",
    icon: Users2,
  },
];

export function OrbitWelcomeTutorial({
  serverCount,
  onCreateSpace,
  onJoinSpace,
}: OrbitWelcomeTutorialProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (serverCount > 0) {
      setOpen(false);
      return;
    }
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    setOpen(!dismissed);
  }, [serverCount]);

  const step = useMemo(() => tutorialSteps[stepIndex], [stepIndex]);
  const StepIcon = step.icon;
  const isLast = stepIndex >= tutorialSteps.length - 1;

  function closeTutorial() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setOpen(false);
    setStepIndex(0);
  }

  return (
    <Dialog onOpenChange={(next) => (!next ? closeTutorial() : setOpen(next))} open={open}>
      <DialogContent className="max-w-xl">
        <SwipeDismissable direction="down" onDismiss={closeTutorial}>
          <DialogHeader>
            <DialogTitle>Orbit Welcome Tutorial</DialogTitle>
            <DialogDescription>
              Step {stepIndex + 1} of {tutorialSteps.length}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 inline-flex rounded-xl bg-violet-500/15 p-2.5 text-violet-200">
              <StepIcon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-zinc-100">{step.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-300">{step.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button className="rounded-full" onClick={onCreateSpace} size="sm" type="button">
                Create Space
              </Button>
              <Button
                className="rounded-full"
                onClick={onJoinSpace}
                size="sm"
                type="button"
                variant="secondary"
              >
                Join with Invite
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {!isLast ? (
                <Button
                  className="rounded-full"
                  onClick={() => setStepIndex((current) => current + 1)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="rounded-full"
                  onClick={closeTutorial}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Finish
                </Button>
              )}
            </div>
          </div>
        </SwipeDismissable>
      </DialogContent>
    </Dialog>
  );
}
