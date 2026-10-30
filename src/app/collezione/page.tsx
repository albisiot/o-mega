"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Album } from "@/components/album";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { fetchCatalog, fetchCollection, type CatalogCard, type OwnedSummary } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";

export default function CollectionPage() {
  const { session } = useRequireSignedIn();
  const [catalog, setCatalog] = useState<CatalogCard[] | null>(null);
  const [owned, setOwned] = useState<Map<string, OwnedSummary> | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchCollection(), fetchAbilities()])
      .then(([cards, collection, abilityList]) => {
        if (cancelled) return;
        setCatalog(cards);
        setOwned(collection);
        setAbilities(abilityList);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, reloadKey]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <Link href="/" className="text-sm text-zinc-300 underline">
          Torna alla home
        </Link>
      </main>
    );
  }
  if (!catalog || !owned) return <LoadingScreen label="Caricamento della collezione…" />;
  return (
    <Album catalog={catalog} owned={owned} abilities={abilities} onChanged={() => setReloadKey((k) => k + 1)} />
  );
}
