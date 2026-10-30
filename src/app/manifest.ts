import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";

// Prerendered at build time into manifest.webmanifest. URLs inside the
// manifest are not rewritten by Next, so they carry the basePath explicitly.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBasePath("/"),
    name: "O-MEGA",
    short_name: "O-MEGA",
    description: "Apri, colleziona, gioca, conquista.",
    lang: "it",
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0f",
    theme_color: "#0b0b0f",
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      {
        src: withBasePath("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
