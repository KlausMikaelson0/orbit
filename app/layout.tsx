import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { OrbitPwaRegister } from "@/src/components/pwa/orbit-pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

function resolveMetadataBase(rawUrl: string | undefined) {
  const fallback = new URL("http://localhost:3000");
  const value = rawUrl?.trim();
  if (!value) {
    return fallback;
  }

  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(normalized);
  } catch {
    return fallback;
  }
}

const metadataBase = resolveMetadataBase(process.env.NEXT_PUBLIC_APP_URL);

export const metadata: Metadata = {
  title: "Orbit — The Evolution of Communication",
  description:
    "Orbit is a cosmic-grade collaboration platform with Unified Spaces and AI-ready architecture.",
  metadataBase,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orbit",
  },
  icons: {
    icon: [
      { url: "/orbit-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/orbit-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06070b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="dark"
      data-orbit-theme="midnight"
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${geistSans.variable} antialiased`}>
        <OrbitPwaRegister />
        {children}
      </body>
    </html>
  );
}
