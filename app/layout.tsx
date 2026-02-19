import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { OrbitPwaRegister } from "@/src/components/pwa/orbit-pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orbit — The Evolution of Communication",
  description:
    "Orbit is a cosmic-grade collaboration platform with Unified Spaces and AI-ready architecture.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orbit",
  },
  icons: {
    icon: "/orbit-icon.svg",
    apple: "/orbit-icon.svg",
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
