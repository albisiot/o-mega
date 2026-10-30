"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { PackReveal } from "@/components/pack-reveal";
import { describeServerError } from "@/lib/errors";
import { cachedPackOpening, fetchPackOpening, type PackOpening } from "@/lib/packs";

// /pacchetto/?id=<opening id>: query string instead of a dynamic route,
// because the static export cannot know opening ids at build time.
export default function PackPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PackPageContent />
    </Suspense>
  );
}

function PackPageContent() {
  const id = useSearchParams().get("id");
  const { session } = useRequireSignedIn();
  const [opening, setOpening] = useState<PackOpening | null>(() => (id ? cachedPackOpening(id) : null));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || opening || !session) return;
    let cancelled = false;
    fetchPackOpening(id)
      .then((result) => {
        if (!cancelled) setOpening(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [id, opening, session]);

  if (!id || error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">{error ?? "Pacchetto non trovato."}</p>
        <Link href="/" className="text-sm text-zinc-300 underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!opening) return <LoadingScreen label="Preparazione del pacchetto…" />;
  return <PackReveal opening={opening} />;
}
