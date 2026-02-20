"use client";

import { useEffect, useState } from "react";

interface OrbitRuntimeState {
  isElectron: boolean;
  platformLabel: string;
}

function labelForPlatform(platform: string) {
  const lower = platform.toLowerCase();
  if (lower.includes("win")) {
    return "Windows";
  }
  if (lower.includes("mac") || lower.includes("darwin")) {
    return "macOS";
  }
  if (lower.includes("linux")) {
    return "Linux";
  }
  return "Unknown";
}

export function useOrbitRuntime() {
  const [runtime, setRuntime] = useState<OrbitRuntimeState>({
    isElectron: false,
    platformLabel: "Web",
  });

  useEffect(() => {
    const bridge = window.orbitDesktop;
    const ua = navigator.userAgent.toLowerCase();
    const isElectron = Boolean(bridge?.isElectron) || ua.includes("electron");
    const userAgentData = (navigator as Navigator & {
      userAgentData?: { platform?: string };
    }).userAgentData;
    const platformRaw =
      bridge?.platform ?? userAgentData?.platform ?? navigator.platform ?? "";

    setRuntime({
      isElectron,
      platformLabel: labelForPlatform(platformRaw),
    });
  }, []);

  return runtime;
}
