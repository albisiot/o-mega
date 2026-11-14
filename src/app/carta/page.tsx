"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CardScreen } from "@/components/card-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import {
  fetchCatalog,
  fetchCollection,
  seenCatalog,
  seenCollection,
  type CatalogCard,
  type OwnedSummary,
} from "@/lib/collection";
import { savedAlbumOrder, savedAlbumScroll } from "@/lib/album-scroll";
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

type Loaded = { catalog: CatalogCard[]; collection: Map<string, OwnedSummary>; abilities: AbilityInfo[] };

function seenData(): Loaded | null {
  const catalog = seenCatalog();
  const collection = seenCollection();
  const abilities = seenAbilities();
  return catalog && collection && abilities ? { catalog, collection, abilities } : null;
}

function CardPageContent() {
  const urlId = useSearchParams().get("id");
  const router = useRouter();
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(seenData);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // The card shown: swiping changes it at once, and the address follows (see browse).
  const [id, setId] = useState(urlId);
  const [lastUrlId, setLastUrlId] = useState(urlId);
  if (urlId !== lastUrlId) {
    setLastUrlId(urlId);
    setId(urlId);
  }
  // Read once: the album's list as it was when the card was opened.
  const [albumOrder] = useState(savedAlbumOrder);
  // Only owned characters the album showed: a card opened some other way stands alone.
  const browseIds = useMemo(
    () => (loaded ? albumOrder.filter((entry) => loaded.collection.has(entry)) : []),
    [albumOrder, loaded],
  );
  // The page fits the screen and never scrolls (see .game-shell): the art gives up height to
  // the rest, and the copies open in full in a sheet.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchCollection(), fetchAbilities()])
      .then(([catalog, collection, abilities]) => {
        if (!cancelled) setLoaded({ catalog, collection, abilities });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  const close = useCallback(() => {
    // Opened from the album: going back returns to the same place in it.
    if (savedAlbumScroll() !== null && window.history.length > 1) router.back();
    else router.push("/collezione");
  }, [router]);

  // The address names the card shown, replaced rather than pushed: the phone's back button
  // still returns to the album, not through every card swiped.
  const browse = useCallback((next: string) => {
    setId(next);
    const params = new URLSearchParams(window.location.search);
    params.set("id", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  const converted = useCallback(() => setReloadKey((k) => k + 1), []);

  if (error) return <Message text={error} />;
  if (!loaded) return <LoadingScreen />;
  const card = loaded.catalog.find((entry) => entry.id === id);
  if (!card) return <Message text="Carta non trovata." />;

  return (
    <CardScreen
      card={card}
      owned={loaded.collection.get(card.id) ?? null}
      abilities={loaded.abilities}
      browseIds={browseIds}
      onBrowse={browse}
      onClose={close}
      onConverted={converted}
    />
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
