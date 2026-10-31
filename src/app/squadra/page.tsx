"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { TeamPicker } from "@/components/team-picker";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { describeServerError } from "@/lib/errors";
import {
  createLobby,
  DIFFICULTY_LABELS,
  fetchConquestInstances,
  fetchFormations,
  fetchInstanceDefinitions,
  fetchOwnedInstances,
  joinLobby,
  startBotMatch,
  storePendingTeam,
  type Formation,
} from "@/lib/match";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

// /squadra/?difficulty=easy|medium|hard|super_pro  (against a bot, default)
// /squadra/?mode=queue                          (random opponent)
// /squadra/?mode=conquest                       (Conquest, random opponent)
// /squadra/?mode=lobby                          (create a friend code)
// /squadra/?mode=join&code=ABC234               (join a friend)
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
  /** Conquest only: characters whose fielded copy can be taken. */
  conquerable: Set<string> | null;
  /** Conquest only: pack copies of characters also owned as starter. */
  atRiskCopies: Map<string, string> | null;
  instanceDefinitions: Map<string, string>;
  formations: Formation[];
};

type Mode =
  | { kind: "bot"; difficulty: BotDifficulty }
  | { kind: "queue" }
  | { kind: "conquest" }
  | { kind: "lobby" }
  | { kind: "join"; code: string };

function readMode(params: URLSearchParams): Mode {
  const mode = params.get("mode");
  if (mode === "queue" || mode === "lobby" || mode === "conquest") return { kind: mode };
  if (mode === "join") return { kind: "join", code: (params.get("code") ?? "").toUpperCase() };
  const difficulty = params.get("difficulty") as BotDifficulty | null;
  return { kind: "bot", difficulty: difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : "easy" };
}

const COPY: Record<Mode["kind"], { subtitle: (mode: Mode) => string; start: (mode: Mode) => string }> = {
  bot: {
    subtitle: (mode) => `Contro il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
    start: (mode) => `Sfida il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
  },
  queue: { subtitle: () => "Amichevole contro un avversario casuale", start: () => "Cerca un avversario" },
  conquest: { subtitle: () => "Conquista: le carte in palio si possono perdere", start: () => "Cerca un avversario" },
  lobby: { subtitle: () => "Amichevole con un amico", start: () => "Crea il codice" },
  join: { subtitle: (mode) => `Entri con il codice ${(mode as { code: string }).code}`, start: () => "Entra nella partita" },
};

function TeamPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = readMode(params);
  const isConquest = mode.kind === "conquest";
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const copies = isConquest
      ? fetchConquestInstances()
      : fetchOwnedInstances().then((owned) => ({ owned, conquerable: null, atRiskCopies: null }));
    Promise.all([fetchCatalog(), copies, fetchInstanceDefinitions(), fetchFormations()])
      .then(([catalog, { owned, conquerable, atRiskCopies }, instanceDefinitions, formations]) => {
        if (!cancelled) setLoaded({ catalog, owned, conquerable, atRiskCopies, instanceDefinitions, formations });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, isConquest]);

  async function start(cardInstanceIds: string[]) {
    setStarting(true);
    setError(null);
    try {
      switch (mode.kind) {
        case "bot": {
          const view = await startBotMatch(mode.difficulty, cardInstanceIds);
          router.push(`/partita/?id=${view.id}`);
          break;
        }
        case "join": {
          const view = await joinLobby(mode.code, cardInstanceIds);
          router.push(`/partita/?id=${view.id}`);
          break;
        }
        case "lobby":
          await createLobby(cardInstanceIds);
          router.push("/attesa/?mode=lobby");
          break;
        case "queue":
          storePendingTeam(cardInstanceIds);
          router.push("/attesa/?mode=queue");
          break;
        case "conquest":
          storePendingTeam(cardInstanceIds);
          router.push("/attesa/?mode=queue&type=conquest");
          break;
      }
    } catch (cause) {
      setError(describeServerError(cause));
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader backHref="/gioca" backLabel="Gioca" title="La tua squadra" subtitle={COPY[mode.kind].subtitle(mode)} />

      <main className="flex flex-1 flex-col gap-3 px-3">
        <p className="text-sm font-medium text-muted">
          Scegli 5 personaggi diversi. Ognuno gioca un solo round: tieni gli specialisti per le Minacce di livello
          basso e i generalisti per quelle alte.
        </p>
        {error && (
          <p className="text-sm font-semibold text-comic-magenta">
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
            conquerable={loaded.conquerable}
            atRiskCopies={loaded.atRiskCopies}
            instanceDefinitions={loaded.instanceDefinitions}
            formations={loaded.formations}
            onFormationsChanged={(formations) => setLoaded({ ...loaded, formations })}
            startLabel={COPY[mode.kind].start(mode)}
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
