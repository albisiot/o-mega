"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CardDetailProvider } from "@/components/card-detail";
import { LoadingScreen } from "@/components/loading-screen";
import { TeamPicker } from "@/components/team-picker";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { startBossBotMatch } from "@/lib/boss";
import { describeServerError } from "@/lib/errors";
import { startStoryMission, storyMatchHref } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";
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
  type MatchFormat,
  type VariantCopy,
} from "@/lib/match";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

// /squadra/?difficulty=easy|medium|hard|super_pro  (against a bot, default)
// /squadra/?mode=queue                          (random opponent)
// /squadra/?mode=conquest                       (Conquest, random opponent)
// /squadra/?mode=lobby                          (create a friend code)
// /squadra/?mode=join&code=ABC234               (join a friend)
// /squadra/?story=C1M1                          (a story mission)
// &format=boss with difficulty, queue or lobby  (a Grande Minaccia)
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
  /** Copies with an artwork variant that can be fielded instead of the default one. */
  variantCopies: Map<string, VariantCopy[]>;
  instanceDefinitions: Map<string, string>;
  formations: Formation[];
};

type Mode =
  | { kind: "bot"; difficulty: BotDifficulty }
  | { kind: "queue" }
  | { kind: "conquest" }
  | { kind: "lobby" }
  | { kind: "join"; code: string }
  | { kind: "story"; mission: string };

function readMode(params: URLSearchParams): Mode {
  const story = params.get("story");
  if (story) return { kind: "story", mission: story };
  const mode = params.get("mode");
  if (mode === "queue" || mode === "lobby" || mode === "conquest") return { kind: mode };
  if (mode === "join") return { kind: "join", code: (params.get("code") ?? "").toUpperCase() };
  const difficulty = params.get("difficulty") as BotDifficulty | null;
  return { kind: "bot", difficulty: difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : "easy" };
}

/** A Grande Minaccia: against a bot, or friendly between players (never Conquest or Story). */
function readFormat(params: URLSearchParams, mode: Mode): MatchFormat {
  return params.get("format") === "boss" && ["bot", "queue", "lobby"].includes(mode.kind) ? "boss" : "classic";
}

const BOSS_INTRO =
  "Scegli 5 personaggi diversi: il Boss lo scopri dopo. Ogni personaggio gioca un turno su un fronte a tua scelta: servono specialisti per i fronti piccoli e generalisti per quelli grandi. Con una pressione lunga su una carta la vedi intera.";

const COPY: Record<Mode["kind"], { subtitle: (mode: Mode) => string; start: (mode: Mode) => string }> = {
  bot: {
    subtitle: (mode) => `Contro il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
    start: (mode) => `Sfida il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
  },
  queue: { subtitle: () => "Amichevole contro un avversario casuale", start: () => "Cerca un avversario" },
  conquest: { subtitle: () => "Conquista: le carte in palio si possono perdere", start: () => "Cerca un avversario" },
  lobby: { subtitle: () => "Amichevole con un amico", start: () => "Crea il codice" },
  join: { subtitle: (mode) => `Entri con il codice ${(mode as { code: string }).code}`, start: () => "Entra nella partita" },
  story: { subtitle: () => "Missione della Storia", start: () => "Inizia la missione" },
};

function TeamPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = readMode(params);
  const format = readFormat(params, mode);
  const isConquest = mode.kind === "conquest";
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // The page fits the screen: only the card grid scrolls, inside the team picker.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const copies = isConquest
      ? fetchConquestInstances()
      : fetchOwnedInstances().then((free) => ({ ...free, conquerable: null, atRiskCopies: null }));
    Promise.all([fetchCatalog(), copies, fetchInstanceDefinitions(), fetchFormations()])
      .then(([catalog, { owned, conquerable, atRiskCopies, variantCopies }, instanceDefinitions, formations]) => {
        if (!cancelled) setLoaded({ catalog, owned, conquerable, atRiskCopies, variantCopies, instanceDefinitions, formations });
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
          const view =
            format === "boss" ? await startBossBotMatch(mode.difficulty, cardInstanceIds) : await startBotMatch(mode.difficulty, cardInstanceIds);
          router.push(`/partita/?id=${view.id}`);
          break;
        }
        case "story": {
          const view = await startStoryMission(mode.mission, cardInstanceIds);
          router.push(storyMatchHref(view.id));
          break;
        }
        case "join": {
          const view = await joinLobby(mode.code, cardInstanceIds);
          router.push(`/partita/?id=${view.id}`);
          break;
        }
        case "lobby":
          await createLobby(cardInstanceIds, format);
          router.push("/attesa/?mode=lobby");
          break;
        case "queue":
          storePendingTeam(cardInstanceIds);
          router.push(format === "boss" ? "/attesa/?mode=queue&format=boss" : "/attesa/?mode=queue");
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
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <Link
          href={mode.kind === "story" ? "/storia" : "/gioca"}
          aria-label={`Torna a ${mode.kind === "story" ? "Storia" : "Gioca"}`}
          className="btn btn-ghost h-11 w-11 shrink-0 px-0"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden>
            <path d="M12 3 5 10l7 7M5 10h13" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">La tua squadra</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            {format === "boss" ? `Grande Minaccia · ${COPY[mode.kind].subtitle(mode)}` : COPY[mode.kind].subtitle(mode)}
          </p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-3 pt-1.5">
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
          // A long press on a card shows it whole (CardDetailProvider).
          <CardDetailProvider>
            <TeamPicker
              catalog={loaded.catalog}
              owned={loaded.owned}
              conquerable={loaded.conquerable}
              atRiskCopies={loaded.atRiskCopies}
              variantCopies={loaded.variantCopies}
              instanceDefinitions={loaded.instanceDefinitions}
              formations={loaded.formations}
              onFormationsChanged={(formations) => setLoaded({ ...loaded, formations })}
              startLabel={COPY[mode.kind].start(mode)}
              starting={starting}
              onStart={start}
              intro={
                format === "boss"
                  ? BOSS_INTRO
                  : "Scegli 5 personaggi diversi. Ognuno gioca un solo round: tieni gli specialisti per le Minacce di livello basso e i generalisti per quelle alte. Con una pressione lunga su una carta la vedi intera."
              }
            />
          </CardDetailProvider>
        ) : (
          !error && <LoadingScreen label="Caricamento della collezione…" />
        )}
      </main>
    </div>
  );
}
