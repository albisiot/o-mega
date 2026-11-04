"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { ArtViewerButton } from "@/components/art-viewer";
import { CopiesSheet, MissingCard } from "@/components/card-details";
import { CardModelButton } from "@/components/card-model";
import { CardView } from "@/components/card-view";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import {
  fetchCatalog,
  fetchCollection,
  ownedLooks,
  seenCatalog,
  seenCollection,
  type CatalogCard,
  type OwnedSummary,
} from "@/lib/collection";
import { savedAlbumScroll } from "@/lib/album-scroll";
import { describeServerError } from "@/lib/errors";
import { useLockedScreen } from "@/lib/use-locked-screen";

// /carta/?id=<definition id>: query string, see CLAUDE.md (static export).
export default function CardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CardPageContent />
    </Suspense>
  );
}

type Loaded = { card: CatalogCard | null; owned: OwnedSummary | null; abilities: AbilityInfo[] };

function seenCard(id: string | null): Loaded | null {
  const catalog = seenCatalog();
  const collection = seenCollection();
  const abilities = seenAbilities();
  const card = catalog?.find((entry) => entry.id === id);
  if (!card || !collection || !abilities) return null;
  return { card, owned: collection.get(card.id) ?? null, abilities };
}

function CardPageContent() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(() => seenCard(id));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lookKey, setLookKey] = useState<string | null>(null);
  // The page fits the screen and never scrolls (see .game-shell): the art gives up height to
  // the rest, and the copies open in full in a sheet.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchCollection(), fetchAbilities()])
      .then(([catalog, collection, abilities]) => {
        if (cancelled) return;
        const card = catalog.find((entry) => entry.id === id) ?? null;
        setLoaded({ card, owned: card ? (collection.get(card.id) ?? null) : null, abilities });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [id, session, reloadKey]);

  const close = useCallback(() => {
    // Opened from the album: going back returns to the same place in it.
    if (savedAlbumScroll() !== null && window.history.length > 1) router.back();
    else router.push("/collezione");
  }, [router]);

  // Escape closes the card too, unless a dialog (drawing, 3D) is open: Escape closes that first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // A tap on the empty page around the card closes it; the card, buttons and panels do not.
  const closeOnBackground = (event: MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };

  if (error) return <Message text={error} />;
  if (!loaded) return <LoadingScreen />;
  if (!loaded.card) return <Message text="Carta non trovata." />;

  const { card, owned, abilities } = loaded;
  const looks = owned ? ownedLooks(card, owned) : [];
  const look = looks.find((l) => l.key === lookKey) ?? looks[0];
  return (
    <div className="game-shell" onClick={closeOnBackground}>
      <header className="flex min-h-13 shrink-0 items-center gap-1.5 px-4 py-1" onClick={closeOnBackground}>
        {/* The variants found show on the card in place of the base drawing. */}
        {looks.length > 1 && (
          <div className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1" role="group" aria-label="Disegno">
            {looks.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={l.key === look.key}
                onClick={() => setLookKey(l.key)}
                className={`min-h-11 shrink-0 -skew-x-8 px-3 font-display text-base uppercase ${
                  l.key === look.key ? "bg-comic-magenta text-black" : "bg-panel text-muted"
                }`}
              >
                {l.variant ? `★ ${l.label}` : l.label}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto shrink-0 text-sm font-bold text-muted">N. {card.code.replace(/^\D+/, "")}</span>
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main
        className="flex min-h-0 flex-1 flex-col items-center gap-2.5 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
        onClick={closeOnBackground}
      >
        {owned && look ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col justify-center py-1" onClick={closeOnBackground}>
              <div className="flex min-h-0 flex-col rounded-xl shadow-[6px_6px_0_var(--comic-magenta)]">
                <CardView card={{ ...card, art_url: look.art_url, variant: look.variant }} abilities={abilities} fit />
              </div>
            </div>
            {card.flavor && (
              <p className="w-full max-w-sm shrink-0 -rotate-1 bg-comic-yellow px-3 py-2 text-sm font-semibold italic text-black shadow-[3px_3px_0_var(--foreground)]">
                {card.flavor}
              </p>
            )}
            <div className="flex w-full max-w-sm shrink-0 gap-2 empty:hidden">
              {look.art_url && (
                <ArtViewerButton
                  key={look.key}
                  artUrl={look.art_url}
                  name={look.variant ? `${card.name} · ${look.label}` : card.name}
                  label={look.variant ? `Guarda il disegno ${look.label}` : "Guarda il disegno"}
                  className="min-h-12 flex-1"
                />
              )}
              <CardModelButton code={card.code} name={card.name} className="min-h-12 flex-1" />
            </div>
            <CopiesSheet card={card} owned={owned} onConverted={() => setReloadKey((k) => k + 1)} />
          </>
        ) : (
          <MissingCard card={card} />
        )}
      </main>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-semibold text-comic-magenta">{text}</p>
      <Link href="/collezione" className="flex min-h-11 items-center text-sm font-bold underline">
        Torna alla collezione
      </Link>
    </main>
  );
}
