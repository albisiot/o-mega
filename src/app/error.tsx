"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canReloadForNewBuild, isStaleBuildError, reloadForNewBuild } from "@/lib/stale-build";

// Replaces Next's default crash page, which knows nothing of the game's style.
export default function ErrorPage({ error, reset }: { error: unknown; reset: () => void }) {
  // A page of the previous build asking for a file the deploy removed: the new build is a reload away.
  const stale = isStaleBuildError(error);
  const [reloading] = useState(() => stale && canReloadForNewBuild());

  useEffect(() => {
    console.error("Page crashed", error);
    if (reloading) reloadForNewBuild();
  }, [error, reloading]);

  if (reloading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-semibold">Carico la nuova versione…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sfx text-8xl text-comic-magenta">OPS!</p>
      <p className="text-base font-semibold">Qualcosa è andato storto.</p>
      {/* Re-rendering cannot bring back a missing file: only a reload can. */}
      <button type="button" onClick={stale ? () => window.location.reload() : reset} className="btn btn-primary">
        Riprova
      </button>
      <Link href="/" className="btn btn-ghost">
        Torna alla home
      </Link>
    </main>
  );
}
