import type { MetadataRoute } from "next";

export const dynamic = "force-static";

function resolveSiteUrl() {
  const rawValue =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  const fallback = "http://localhost:3000";
  const value = rawValue?.trim();
  if (!value) {
    return fallback;
  }

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/auth`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
