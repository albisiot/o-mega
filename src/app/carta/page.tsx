"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { ArtViewerButton } from "@/components/art-viewer";
import { CopiesPanel, MissingCard, VariantsPanel } from "@/components/card-details";
import { CardModelButton } from "@/components/card-model";
import { CardView } from "@/components/card-view";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import {
  fetchCatalog,
  fetchCollection,
  ownedArt,
  seenCatalog,
  seenCollection,
  type CatalogCard,
  type OwnedSummary,
} from "@/lib/collection";
import { savedAlbumScroll } from "@/lib/album-scroll";
import { describeServerError } from "@/lib/errors";

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
  return (
    <div className="flex flex-1 flex-col" onClick={closeOnBackground}>
      <header className="flex min-h-15 items-center justify-end px-4 py-2" onClick={closeOnBackground}>
        <span className="text-sm font-bold text-muted">N. {card.code.replace(/^\D+/, "")}</span>
      </header>

      <main className="flex flex-1 flex-col items-center gap-5 px-4 pb-6" onClick={closeOnBackground}>
        {owned ? (
          <>
            <div className="rounded-xl shadow-[6px_6px_0_var(--comic-magenta)]">
              <CardView card={{ ...card, ...ownedArt(card, owned) }} abilities={abilities} />
            </div>
            {ownedArt(card, owned).art_url && (
              <ArtViewerButton artUrl={ownedArt(card, owned).art_url!} name={card.name} />
            )}
            <CardModelButton code={card.code} name={card.name} />
            {card.flavor && (
              <p className="w-full max-w-sm -rotate-1 bg-comic-yellow px-3 py-2 text-sm font-semibold italic text-black shadow-[3px_3px_0_var(--foreground)]">
                {card.flavor}
              </p>
            )}
            <CopiesPanel card={card} owned={owned} onConverted={() => setReloadKey((k) => k + 1)} />
            <VariantsPanel card={card} owned={owned} />
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
