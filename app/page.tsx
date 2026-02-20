import type { Metadata } from "next";

import { OrbitLandingPage } from "@/src/components/marketing/orbit-landing-page";

const title = "Orbit | Download for Desktop or Use in Browser";
const description =
  "Orbit is a high-performance communication platform with realtime chat, voice/video, desktop + web parity, and built-in AI features. Download for Windows, macOS, Linux, or continue in your browser.";
const ogImage = "/orbit-icon-512.png";
const DOWNLOAD_URLS = {
  windows:
    "https://github.com/KlausMikaelson0/orbit/releases/download/v1.0.2/orbit-desktop-windows-latest.zip",
  mac: "https://github.com/KlausMikaelson0/orbit/releases/download/v1.0.2/orbit-desktop-macos-latest.zip",
  linux:
    "https://github.com/KlausMikaelson0/orbit/releases/download/v1.0.2/orbit-desktop-ubuntu-latest.zip",
} as const;

function resolveAppUrl(rawUrl: string | undefined) {
  const fallback = "http://localhost:3000";
  const value = rawUrl?.trim();
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

const appUrl = resolveAppUrl(
  process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL,
);

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Orbit",
    "Discord alternative",
    "realtime chat",
    "community platform",
    "voice and video chat",
    "AI moderation",
    "Supabase chat app",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Orbit",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 512,
        height: 512,
        alt: "Orbit logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Orbit",
  url: appUrl,
  inLanguage: "en",
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Orbit",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Windows, macOS, Linux, iOS, Android, Web",
  description,
  url: appUrl,
  installUrl: `${appUrl}/dashboard`,
  downloadUrl: [DOWNLOAD_URLS.windows, DOWNLOAD_URLS.mac, DOWNLOAD_URLS.linux],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <script suppressHydrationWarning type="application/ld+json">
        {JSON.stringify([websiteSchema, softwareSchema])}
      </script>
      <OrbitLandingPage />
    </>
  );
}
