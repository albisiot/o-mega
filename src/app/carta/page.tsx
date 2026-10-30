"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CopiesPanel, MissingCard } from "@/components/card-details";
import { CardView } from "@/components/card-view";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, fetchCollection, type CatalogCard, type OwnedSummary } from "@/lib/collection";
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

function CardPageContent() {
  const id = useSearchParams().get("id");
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
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

  if (error) return <Message text={error} />;
  if (!loaded) return <LoadingScreen />;
  if (!loaded.card) return <Message text="Carta non trovata." />;

  const { card, owned, abilities } = loaded;
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/collezione" className="text-sm text-zinc-300">
          ← Collezione
        </Link>
        <span className="text-xs text-zinc-500">N. {card.code.replace(/^\D+/, "")}</span>
      </header>

      <main className="flex flex-1 flex-col items-center gap-5 px-5 pb-10">
        {owned ? (
          <>
            <CardView card={card} abilities={abilities} />
            <CopiesPanel card={card} owned={owned} onConverted={() => setReloadKey((k) => k + 1)} />
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
      <p className="text-sm text-red-400">{text}</p>
      <Link href="/collezione" className="text-sm text-zinc-300 underline">
        Torna alla collezione
      </Link>
    </main>
  );
}
