"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { TeamPicker } from "@/components/team-picker";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import {
  DIFFICULTY_LABELS,
  fetchFormations,
  fetchInstanceDefinitions,
  fetchOwnedInstances,
  startBotMatch,
  type Formation,
} from "@/lib/match";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard"];

// /squadra/?difficulty=easy|medium|hard
export default function TeamPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TeamPageContent />
    </Suspense>
  );
}

type Loaded = {
  catalog: CatalogCard[];
  owned: Map<string, string>;
  instanceDefinitions: Map<string, string>;
  formations: Formation[];
};

function TeamPageContent() {
  const router = useRouter();
  const requested = useSearchParams().get("difficulty") as BotDifficulty | null;
  const difficulty = requested && DIFFICULTIES.includes(requested) ? requested : "easy";
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchCatalog(), fetchOwnedInstances(), fetchInstanceDefinitions(), fetchFormations()])
      .then(([catalog, owned, instanceDefinitions, formations]) => {
        if (!cancelled) setLoaded({ catalog, owned, instanceDefinitions, formations });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function start(cardInstanceIds: string[]) {
    setStarting(true);
    setError(null);
    try {
      const view = await startBotMatch(difficulty, cardInstanceIds);
      router.push(`/partita/?id=${view.id}`);
    } catch (cause) {
      setError(describeServerError(cause));
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/gioca" className="text-sm text-zinc-300">
          ← Gioca
        </Link>
        <div className="text-center">
          <h1 className="text-base font-semibold">La tua squadra</h1>
          <p className="text-xs text-zinc-400">Contro il bot {DIFFICULTY_LABELS[difficulty]}</p>
        </div>
        <span className="w-12" />
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5">
        <p className="text-sm text-zinc-400">
          Scegli 5 personaggi diversi. Ognuno gioca un solo round: tieni gli specialisti per le Minacce di livello
          basso e i generalisti per quelle alte.
        </p>
        {error && (
          <p className="text-sm text-red-400">
            {error}{" "}
            {error.includes("partita in corso") && (
              <Link href="/gioca" className="underline">
                Vai alla partita
              </Link>
            )}
          </p>
        )}
        {loaded ? (
          <TeamPicker
            catalog={loaded.catalog}
            owned={loaded.owned}
            instanceDefinitions={loaded.instanceDefinitions}
            formations={loaded.formations}
            onFormationsChanged={(formations) => setLoaded({ ...loaded, formations })}
            startLabel={`Sfida il bot ${DIFFICULTY_LABELS[difficulty]}`}
            starting={starting}
            onStart={start}
          />
        ) : (
          !error && <LoadingScreen label="Caricamento della collezione…" />
        )}
      </main>
    </div>
  );
}
