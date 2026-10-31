"use client";

import Link from "next/link";
import { useEffect } from "react";

// Replaces Next's default crash page, which knows nothing of the game's style.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Page crashed", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sfx text-8xl text-comic-magenta">OPS!</p>
      <p className="text-base font-semibold">Qualcosa è andato storto.</p>
      <button type="button" onClick={reset} className="btn btn-primary">
        Riprova
      </button>
      <Link href="/" className="btn btn-ghost">
        Torna alla home
      </Link>
    </main>
  );
}
