"use client";

import { useEffect, useRef } from "react";

import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";
import type { OrbitThemePreset } from "@/src/types/orbit";

const PRESET_STORAGE_KEY = "orbit.theme.preset.v1";
const CUSTOM_CSS_STORAGE_KEY = "orbit.theme.custom-css.v1";
const CUSTOM_CSS_STYLE_ID = "orbit-custom-theme-style";

const validPresets: OrbitThemePreset[] = [
  "MIDNIGHT",
  "ONYX",
  "CYBERPUNK",
  "CUSTOM",
];

function isThemePreset(value: string): value is OrbitThemePreset {
  return validPresets.includes(value as OrbitThemePreset);
}

export function useOrbitThemeEngine() {
  const profile = useOrbitNavStore((state) => state.profile);
  const themePreset = useOrbitNavStore((state) => state.themePreset);
  const customThemeCss = useOrbitNavStore((state) => state.customThemeCss);
  const setThemePreset = useOrbitNavStore((state) => state.setThemePreset);
  const setCustomThemeCss = useOrbitNavStore((state) => state.setCustomThemeCss);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current || typeof window === "undefined") {
      return;
    }

    hydratedRef.current = true;
    const storedPreset = window.localStorage.getItem(PRESET_STORAGE_KEY);
    const storedCss = window.localStorage.getItem(CUSTOM_CSS_STORAGE_KEY);

    if (storedPreset && isThemePreset(storedPreset)) {
      setThemePreset(storedPreset);
    }
    if (typeof storedCss === "string") {
      setCustomThemeCss(storedCss);
    }
  }, [setCustomThemeCss, setThemePreset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.dataset.orbitTheme = themePreset.toLowerCase();
    window.localStorage.setItem(PRESET_STORAGE_KEY, themePreset);
  }, [themePreset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CUSTOM_CSS_STORAGE_KEY, customThemeCss);
    const existingNode = document.getElementById(CUSTOM_CSS_STYLE_ID);

    if (themePreset !== "CUSTOM" || !customThemeCss.trim()) {
      existingNode?.remove();
      return;
    }

    const styleNode = existingNode ?? document.createElement("style");
    styleNode.id = CUSTOM_CSS_STYLE_ID;
    styleNode.textContent = customThemeCss;
    if (!existingNode) {
      document.head.appendChild(styleNode);
    }
  }, [customThemeCss, themePreset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.dataset.orbitPerformance = profile?.performance_mode
      ? "on"
      : "off";
  }, [profile?.performance_mode]);
}
