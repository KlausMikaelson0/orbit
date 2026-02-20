"use client";

import type { OrbitLinkPreview } from "@/src/types/orbit";

const orbitLinkPreviewCache = new Map<string, OrbitLinkPreview | null>();
const orbitLinkPreviewInflight = new Map<string, Promise<OrbitLinkPreview | null>>();

const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;

function normalizeOrbitUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractOrbitUrls(content: string | null | undefined) {
  if (!content) {
    return [];
  }
  const matches = content.match(URL_REGEX) ?? [];
  const normalized = matches
    .map((item) => normalizeOrbitUrl(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(normalized));
}

export async function fetchOrbitLinkPreview(url: string) {
  const normalizedUrl = normalizeOrbitUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  if (orbitLinkPreviewCache.has(normalizedUrl)) {
    return orbitLinkPreviewCache.get(normalizedUrl) ?? null;
  }

  if (!orbitLinkPreviewInflight.has(normalizedUrl)) {
    orbitLinkPreviewInflight.set(
      normalizedUrl,
      fetch("/api/link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalizedUrl }),
      })
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }
          const payload = (await response.json()) as {
            preview?: OrbitLinkPreview | null;
          };
          return payload.preview ?? null;
        })
        .catch(() => null)
        .then((preview) => {
          orbitLinkPreviewCache.set(normalizedUrl, preview);
          orbitLinkPreviewInflight.delete(normalizedUrl);
          return preview;
        }),
    );
  }

  return orbitLinkPreviewInflight.get(normalizedUrl) ?? null;
}

export function primeOrbitLinkPreview(url: string) {
  void fetchOrbitLinkPreview(url);
}
