import type { NextConfig } from "next";

// Sub-path the site is served from: empty locally, "/o-mega" on GitHub Pages
// (set by the deploy workflow). Must be "" or start with "/" and not end with "/".
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Static export only: all server-side logic lives in Supabase (see CLAUDE.md).
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
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
