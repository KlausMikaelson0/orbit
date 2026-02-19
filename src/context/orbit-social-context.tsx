"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { UseOrbitSocialResult } from "@/src/hooks/use-orbit-social";

const OrbitSocialContext = createContext<UseOrbitSocialResult | null>(null);

export function OrbitSocialProvider({
  value,
  children,
}: {
  value: UseOrbitSocialResult;
  children: ReactNode;
}) {
  return (
    <OrbitSocialContext.Provider value={value}>
      {children}
    </OrbitSocialContext.Provider>
  );
}

export function useOrbitSocialContext() {
  const context = useContext(OrbitSocialContext);
  if (!context) {
    throw new Error("useOrbitSocialContext must be used within OrbitSocialProvider");
  }
  return context;
}
