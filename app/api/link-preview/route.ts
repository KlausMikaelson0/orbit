import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { getOrbitRequestIp } from "@/src/lib/orbit-developer-api";
import { checkOrbitRateLimit } from "@/src/lib/rate-limit";
import type { OrbitLinkPreview } from "@/src/types/orbit";

export const runtime = "nodejs";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_HTML_LENGTH = 220_000;

function sanitizeText(value: string | null | undefined, limit = 320) {
  if (!value) {
    return null;
  }
  const collapsed = value
    .replace(/<[^>]+>/g, " ")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) {
    return null;
  }
  return collapsed.slice(0, limit);
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".lan")
  );
}

function isPrivateIp(ipAddress: string) {
  if (ipAddress === "::1") {
    return true;
  }
  if (ipAddress.startsWith("fc") || ipAddress.startsWith("fd") || ipAddress.startsWith("fe80:")) {
    return true;
  }

  const ipv4 = ipAddress.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!ipv4) {
    return false;
  }

  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}

async function assertSafeTarget(url: URL) {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error("Only HTTP(S) URLs are supported.");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error("Private hostnames are not allowed.");
  }

  if (isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) {
      throw new Error("Private IP addresses are not allowed.");
    }
    return;
  }

  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (!addresses.length) {
    throw new Error("Unable to resolve target hostname.");
  }
  if (addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Resolved IP is private and blocked.");
  }
}

function extractMetaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  return propertyFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? null;
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const ogTitle = extractMetaContent(html, "og:title");
  const twitterTitle = extractMetaContent(html, "twitter:title");
  return sanitizeText(ogTitle ?? twitterTitle ?? titleMatch, 180);
}

function buildPreview(url: URL, html: string): OrbitLinkPreview | null {
  const title = extractTitle(html);
  const description = sanitizeText(
    extractMetaContent(html, "og:description") ??
      extractMetaContent(html, "twitter:description") ??
      extractMetaContent(html, "description"),
    260,
  );
  const rawImage =
    extractMetaContent(html, "og:image") ??
    extractMetaContent(html, "twitter:image") ??
    null;
  const image = rawImage ? new URL(rawImage, url.toString()).toString() : null;
  const siteName = sanitizeText(extractMetaContent(html, "og:site_name"), 80);

  if (!title && !description && !image) {
    return null;
  }

  return {
    url: url.toString(),
    title: title ?? url.hostname,
    description,
    image,
    site_name: siteName,
  };
}

export async function POST(request: Request) {
  const ip = getOrbitRequestIp(request);
  const rate = checkOrbitRateLimit({
    key: `orbit-link-preview:${ip}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { preview: null, error: "Rate limit exceeded." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const payload = (await request.json()) as { url?: string };
    const rawUrl = payload.url?.trim();
    if (!rawUrl) {
      return NextResponse.json({ preview: null }, { status: 400 });
    }

    const parsedUrl = new URL(rawUrl);
    await assertSafeTarget(parsedUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "OrbitLinkPreviewBot/1.0 (+https://orbit)",
      },
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json({ preview: null }, { status: 200 });
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ preview: null }, { status: 200 });
    }

    const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
    const preview = buildPreview(parsedUrl, html);
    return NextResponse.json({ preview });
  } catch {
    return NextResponse.json({ preview: null }, { status: 200 });
  }
}
