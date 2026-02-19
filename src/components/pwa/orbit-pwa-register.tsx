"use client";

import { useEffect } from "react";

export function OrbitPwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is non-blocking; ignore errors.
    });
  }, []);

  return null;
}
