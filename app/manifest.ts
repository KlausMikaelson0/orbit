import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit",
    short_name: "Orbit",
    description:
      "Orbit is a productivity-social collaboration platform with realtime messaging, channels, voice, and AI workflows.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#06070b",
    theme_color: "#06070b",
    orientation: "portrait",
    icons: [
      {
        src: "/orbit-icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/orbit-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
