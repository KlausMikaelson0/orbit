import type { MetadataRoute } from "next";

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

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
