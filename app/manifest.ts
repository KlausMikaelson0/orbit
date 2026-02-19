import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Orbit",
    short_name: "Orbit",
    description:
      "Orbit is a productivity-social collaboration platform with realtime messaging, channels, voice, and AI workflows.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#06070b",
    theme_color: "#06070b",
    orientation: "portrait",
    icons: [
      {
        src: "/orbit-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/orbit-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Dashboard",
        url: "/dashboard",
      },
      {
        name: "Open Auth",
        url: "/auth",
      },
    ],
  };
}
