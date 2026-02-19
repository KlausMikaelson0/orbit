import type { Metadata } from "next";

import { OrbitLandingPage } from "@/src/components/marketing/orbit-landing-page";

const title = "Orbit: The Evolution of Communication";
const description =
  "Orbit is a high-performance communication platform with realtime chat, voice/video, desktop + web parity, and built-in AI summaries and moderation.";
const ogImage = "/orbit-icon-512.png";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  "@type": "SoftwareApplication",
  name: "Orbit",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Windows, macOS, Linux, iOS, Android, Web",
  description,
  url: appUrl,
};

export default function Home() {
  return (
    <>
      <script suppressHydrationWarning type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <OrbitLandingPage />
    </>
  );
}
