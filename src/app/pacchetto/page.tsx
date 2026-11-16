"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { PackReveal } from "@/components/pack-reveal";
import { ReturnLink } from "@/components/return-link";
import { describeServerError } from "@/lib/errors";
import { placeHref, returnLabel, safeReturnPath } from "@/lib/pack-return";
import { cachedPackOpening, fetchPackOpening, type PackOpening } from "@/lib/packs";

// /pacchetto/?id=<opening id>: query string instead of a dynamic route,
// because the static export cannot know opening ids at build time.
// &next=<ids>: the packs that follow; &from=<page>: where the reveal returns (the home if none).
export default function PackPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PackPageContent />
    </Suspense>
  );
}

function PackPageContent() {
  const params = useSearchParams();
  const id = params.get("id");
  // Only a page of the app, never another site: the home otherwise.
  const returnTo = safeReturnPath(params.get("from")) ?? "/";
  // A bonus code can open several packs: each one starts its own reveal.
  return <PackOpeningView key={id} id={id} nextIds={params.get("next")?.split(",") ?? []} returnTo={returnTo} />;
}

function PackOpeningView({ id, nextIds, returnTo }: { id: string | null; nextIds: string[]; returnTo: string }) {
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
        <p className="text-sm font-semibold text-comic-magenta">{error ?? "Pacchetto non trovato."}</p>
        <ReturnLink href={placeHref(returnTo)} className="flex min-h-11 items-center text-sm font-bold underline">
          {returnLabel(returnTo)}
        </ReturnLink>
      </main>
    );
  }
  if (!opening) return <LoadingScreen label="Preparazione del pacchetto…" />;
  return <PackReveal opening={opening} nextIds={nextIds} returnTo={returnTo} />;
}
