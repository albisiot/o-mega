"use client";

import { useEffect, useState } from "react";
import { canReloadForNewBuild, isStaleBuildError, reloadForNewBuild } from "@/lib/stale-build";

// Shown when the root layout itself crashes (app/error.tsx only covers the pages).
// It replaces the whole document, global styles included: hence the inline styles.
export default function GlobalError({ error }: { error: unknown }) {
  const [reloading] = useState(() => isStaleBuildError(error) && canReloadForNewBuild());

  useEffect(() => {
    console.error("App crashed", error);
    if (reloading) reloadForNewBuild();
  }, [error, reloading]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: "0 24px",
          textAlign: "center",
          background: "#0b0b0f",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>O-MEGA</title>
        {reloading ? (
          <p style={{ fontWeight: 600 }}>Carico la nuova versione…</p>
        ) : (
          <>
            <p style={{ fontWeight: 600 }}>Qualcosa è andato storto.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ padding: "12px 24px", borderRadius: 12, border: 0, fontWeight: 700, fontSize: 16 }}
            >
              Riprova
            </button>
          </>
        )}
      </body>
    </html>
  );
}
