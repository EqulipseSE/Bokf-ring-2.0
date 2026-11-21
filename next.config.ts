import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tillfällig Cloudflare-tunnel, så någon utanför nätverket kan öppna dev-servern.
  allowedDevOrigins: ["*.trycloudflare.com"],
  serverExternalPackages: ["tesseract.js", "pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
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
