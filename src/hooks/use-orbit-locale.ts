"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  isOrbitLocale,
  ORBIT_LOCALE_STORAGE_KEY,
  ORBIT_RTL_LOCALES,
  translateOrbit,
  type OrbitTranslationKey,
} from "@/src/lib/orbit-i18n";
import { useOrbitNavStore } from "@/src/stores/use-orbit-nav-store";

interface UseOrbitLocaleOptions {
  sync?: boolean;
}

export function useOrbitLocale(options: UseOrbitLocaleOptions = {}) {
  const { sync = false } = options;
  const locale = useOrbitNavStore((state) => state.locale);
  const setLocale = useOrbitNavStore((state) => state.setLocale);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!sync || hydratedRef.current || typeof window === "undefined") {
      return;
    }
    hydratedRef.current = true;

    const stored = window.localStorage.getItem(ORBIT_LOCALE_STORAGE_KEY);
    if (stored && isOrbitLocale(stored)) {
      setLocale(stored);
    }
  }, [setLocale, sync]);

  useEffect(() => {
    if (!sync || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ORBIT_LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = ORBIT_RTL_LOCALES.has(locale) ? "rtl" : "ltr";
  }, [locale, sync]);

  const t = useCallback(
    (key: OrbitTranslationKey, params?: Record<string, string | number>) =>
      translateOrbit(locale, key, params),
    [locale],
  );

  return {
    locale,
    setLocale,
    t,
    isRtl: ORBIT_RTL_LOCALES.has(locale),
  };
}
