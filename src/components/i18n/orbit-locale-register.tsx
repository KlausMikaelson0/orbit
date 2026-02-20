"use client";

import { useOrbitLocale } from "@/src/hooks/use-orbit-locale";

export function OrbitLocaleRegister() {
  useOrbitLocale({ sync: true });
  return null;
}
