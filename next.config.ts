import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare quick tunnel (trycloudflare.com) så Chrome kan hydrera
  // klientkomponenter och klicka meny/Arkiv mot dev-servern.
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
