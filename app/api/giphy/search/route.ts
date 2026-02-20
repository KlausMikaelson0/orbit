import { NextResponse } from "next/server";

import { getOrbitRequestIp } from "@/src/lib/orbit-developer-api";
import { checkOrbitRateLimit } from "@/src/lib/rate-limit";

export const runtime = "nodejs";

interface GiphyImageVariant {
  url?: string;
  width?: string;
  height?: string;
}

interface GiphyItem {
  id: string;
  title?: string;
  images?: {
    original?: GiphyImageVariant;
    downsized_medium?: GiphyImageVariant;
    fixed_width_small?: GiphyImageVariant;
  };
}

function getGiphyApiKey() {
  return process.env.GIPHY_API_KEY ?? process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? null;
}

function normalizeSearchQuery(value: string | null) {
  return (value ?? "").trim().slice(0, 80);
}

export async function GET(request: Request) {
  const ip = getOrbitRequestIp(request);
  const rate = checkOrbitRateLimit({
    key: `orbit-giphy:${ip}`,
    limit: 40,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { items: [], error: "Rate limit exceeded." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const apiKey = getGiphyApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { items: [], error: "GIPHY API key is not configured." },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const query = normalizeSearchQuery(requestUrl.searchParams.get("q"));
  const limit = Math.min(
    24,
    Math.max(1, Number.parseInt(requestUrl.searchParams.get("limit") ?? "18", 10) || 18),
  );

  const endpoint = query
    ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg-13&lang=en`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=pg-13`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ items: [], error: "Unable to fetch GIFs." }, { status: 502 });
    }

    const data = (await response.json()) as { data?: GiphyItem[] };
    const items = (data.data ?? [])
      .map((item) => {
        const original = item.images?.original;
        const medium = item.images?.downsized_medium ?? item.images?.fixed_width_small;
        const url = original?.url ?? medium?.url ?? null;
        if (!url) {
          return null;
        }
        return {
          id: item.id,
          title: item.title?.trim() || "GIF",
          url,
          preview_url: medium?.url ?? url,
          width: Number.parseInt(original?.width ?? medium?.width ?? "0", 10) || null,
          height: Number.parseInt(original?.height ?? medium?.height ?? "0", 10) || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: "Unable to fetch GIFs." }, { status: 502 });
  }
}
