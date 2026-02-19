const isDesktopExport = process.env.ORBIT_DESKTOP_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  output: isDesktopExport ? "export" : undefined,
  trailingSlash: isDesktopExport,
  images: {
    unoptimized: isDesktopExport,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
