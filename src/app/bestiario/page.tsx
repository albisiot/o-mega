"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BestiaryList } from "@/components/bestiary-list";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { fetchBestiary, type Bestiary } from "@/lib/threat-catalog";
import { useLockedScreen } from "@/lib/use-locked-screen";

/**
 * The Bestiario (SPEC §5.15): every threat of the game, those already met in full,
 * the others as silhouettes. The rare tiers say how often they turn up; a threat met
 * opens its diorama.
 */
export default function BestiaryPage() {
  const { session } = useRequireSignedIn();
  const [bestiary, setBestiary] = useState<Bestiary | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>(() => seenAbilities() ?? []);
  const [error, setError] = useState<string | null>(null);
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchBestiary(), fetchAbilities()])
      .then(([next, abilityList]) => {
        if (cancelled) return;
        setBestiary(next);
        setAbilities(abilityList);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!bestiary && !error) return <LoadingScreen label="Caricamento del Bestiario…" />;
  const seen = bestiary?.threats.filter((t) => t.seen).length ?? 0;
  const nameOf = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;

  return (
    // The page fits the screen (see .game-shell): the title stays, only the threats scroll.
    <div className="game-shell">
      <PageHeader backHref="/collezione" title="Bestiario" subtitle={bestiary ? `${seen}/${bestiary.threats.length} Minacce incontrate` : undefined} />
      <main
        data-keep-scroll="main"
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        {bestiary && <BestiaryList bestiary={bestiary} nameOf={nameOf} />}
      </main>
    </div>
  );
}

