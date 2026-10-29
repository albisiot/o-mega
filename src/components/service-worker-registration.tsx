"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/base-path";

/**
 * Registers public/sw.js in production builds only: in `next dev` a service
 * worker would serve stale assets and get in the way of hot reload.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(withBasePath("/sw.js"), { scope: withBasePath("/") })
      .catch((error) => console.error("Service worker registration failed", error));
  }, []);

  return null;
}
