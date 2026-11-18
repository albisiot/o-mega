"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CardDetailProvider } from "@/components/card-detail";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { TeamPicker } from "@/components/team-picker";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { startBossBotMatch } from "@/lib/boss";
import { balance } from "@/config/balance";
import { isQuadrantFormat, QUADRANT_GRID_LABELS, startQuadrantBotMatch } from "@/lib/quadrant";
import { startTripleBotMatch } from "@/lib/triple";
import { fetchChallenges, seenChallenges, type Challenge } from "@/lib/challenges";
import { describeServerError } from "@/lib/errors";
import { rememberLastPlay } from "@/lib/last-play";
import { fetchStory, seenStory, startStoryMission, storyMatchHref, type StoryMission } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";
import {
  asMatchFormat,
  createLobby,
  DIFFICULTY_LABELS,
  fetchConquestInstances,
  fetchFormations,
  fetchInstanceDefinitions,
  fetchLobbyFormat,
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
// /squadra/?mode=ranked&format=boss             (Classificata, in any format)
// /squadra/?mode=lobby                          (create a friend code)
// /squadra/?mode=join&code=ABC234               (join a friend)
// /squadra/?story=C1M1                          (a story mission)
// /squadra/?sfida=<id>&difficulty=medium        (a Sfida a tema against a bot; &format=triple for its mode)
// &format=boss with difficulty, queue or lobby  (a Grande Minaccia)
// &format=triple with difficulty, queue or lobby (an Allarme Triplo)
// &format=quadrant|quadrant_shifting with difficulty, queue or lobby (a Quadrante)
// A join reads the format of its code from the server, so the team has the right size.
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

/** The mission of a story team: its stars. */
function findMission(chapters: { missions: StoryMission[] }[] | null | undefined, code: string): StoryMission | null {
  return chapters?.flatMap((chapter) => chapter.missions).find((mission) => mission.code === code) ?? null;
}

type Mode =
  | { kind: "bot"; difficulty: BotDifficulty }
  | { kind: "queue" }
  | { kind: "ranked" }
  | { kind: "conquest" }
  | { kind: "lobby" }
  | { kind: "join"; code: string }
  | { kind: "story"; mission: string };

function readMode(params: URLSearchParams): Mode {
  const story = params.get("story");
  if (story) return { kind: "story", mission: story };
  const mode = params.get("mode");
  if (mode === "queue" || mode === "lobby" || mode === "conquest" || mode === "ranked") return { kind: mode };
  if (mode === "join") return { kind: "join", code: (params.get("code") ?? "").toUpperCase() };
  const difficulty = params.get("difficulty") as BotDifficulty | null;
  return { kind: "bot", difficulty: difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : "easy" };
}

/** A Grande Minaccia, an Allarme Triplo or a Quadrante: against a bot, or friendly between players (never Conquest or Story). */
function readFormat(params: URLSearchParams, mode: Mode): MatchFormat {
  const format = asMatchFormat(params.get("format"));
  return ["bot", "queue", "lobby", "ranked"].includes(mode.kind) ? format : "classic";
}

const TRIPLE_DECK = balance.triple.rounds * balance.triple.threats;

const TRIPLE_INTRO = `Scegli ${TRIPLE_DECK} personaggi diversi: le Minacce le scopri dopo. Ogni round ne peschi ${balance.triple.threats} a caso e li metti uno per Minaccia, quindi conviene un mazzo vario, con specialisti di più abilità. Con una pressione lunga su una carta la vedi intera.`;

const QUADRANT_DECK = balance.quadrant.deckSize;

const QUADRANT_INTRO = `Scegli ${QUADRANT_DECK} personaggi diversi: le 4 abilità che fanno da lati le scopri dopo. Hai sempre ${balance.quadrant.handSize} carte in mano e ne giochi ${balance.quadrant.cardsPerSide}: conviene un mazzo con picchi alti in abilità diverse. Con una pressione lunga su una carta la vedi intera.`;

const FORMAT_LABELS: Record<MatchFormat, string> = {
  classic: "",
  boss: "Grande Minaccia · ",
  triple: "Allarme Triplo · ",
  quadrant: `Quadrante, ${QUADRANT_GRID_LABELS.quadrant.toLowerCase()} · `,
  quadrant_shifting: `Quadrante, ${QUADRANT_GRID_LABELS.quadrant_shifting.toLowerCase()} · `,
};

/** Characters a team of a format has. */
function squadSizeOf(format: MatchFormat): number | undefined {
  return format === "triple" ? TRIPLE_DECK : isQuadrantFormat(format) ? QUADRANT_DECK : undefined;
}

const BOSS_INTRO =
  "Scegli 5 personaggi diversi: il Boss lo scopri dopo. Ogni turno uno di loro entra su un fronte e ci resta fino alla fine, uno per fronte: servono specialisti per i fronti piccoli e generalisti per quelli grandi. Con una pressione lunga su una carta la vedi intera.";

const COPY: Record<Mode["kind"], { subtitle: (mode: Mode) => string; start: (mode: Mode) => string }> = {
  bot: {
    subtitle: (mode) => `Contro il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
    start: (mode) => `Sfida il bot ${DIFFICULTY_LABELS[(mode as { difficulty: BotDifficulty }).difficulty]}`,
  },
  queue: { subtitle: () => "Amichevole contro un avversario casuale", start: () => "Cerca un avversario" },
  ranked: { subtitle: () => "Classificata: in gioco c'è la Fama", start: () => "Cerca un avversario" },
  conquest: { subtitle: () => "Conquista: le carte in palio si possono perdere", start: () => "Cerca un avversario" },
  lobby: { subtitle: () => "Amichevole con un amico", start: () => "Crea il codice" },
  join: { subtitle: (mode) => `Entri con il codice ${(mode as { code: string }).code}`, start: () => "Entra nella partita" },
  story: { subtitle: () => "Missione della Storia", start: () => "Inizia la missione" },
};

function TeamPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = readMode(params);
  // A Sfida a tema (SPEC §8.8): only against a bot, in its own mode.
  const challengeId = mode.kind === "bot" ? params.get("sfida") : null;
  const findChallenge = (list: { challenges: Challenge[] } | null) =>
    list?.challenges.find((challenge) => challenge.id === challengeId) ?? null;
  const [challenge, setChallenge] = useState<Challenge | null>(() => (challengeId ? findChallenge(seenChallenges()) : null));
  const [challengeGone, setChallengeGone] = useState(false);
  // A join learns its format from the code; until then the picker waits.
  const [joinFormat, setJoinFormat] = useState<MatchFormat | null>(null);
  const format = mode.kind === "join" ? (joinFormat ?? "classic") : readFormat(params, mode);
  const joinCode = mode.kind === "join" ? mode.code : null;
  const isConquest = mode.kind === "conquest";
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const storyCode = mode.kind === "story" ? mode.mission : null;
  // A story mission: its star rules and the stars earned, from the Storia page just left, then fresh.
  const [mission, setMission] = useState<StoryMission | null>(() => (storyCode ? findMission(seenStory(), storyCode) : null));
  // The page fits the screen: only the card grid scrolls, inside the team picker.
  useLockedScreen(true);

  useEffect(() => {
    if (!session || !storyCode) return;
    let cancelled = false;
    fetchStory()
      .then((chapters) => {
        if (!cancelled) setMission(findMission(chapters, storyCode));
      })
      .catch((cause: unknown) => console.error("Story failed", cause));
    return () => {
      cancelled = true;
    };
  }, [session, storyCode]);

  // The challenge as Gioca left it, then fresh: its rules may have changed, it may be over.
  useEffect(() => {
    if (!session || !challengeId) return;
    let cancelled = false;
    fetchChallenges()
      .then((list) => {
        if (cancelled) return;
        const found = list.challenges.find((item) => item.id === challengeId) ?? null;
        setChallenge(found);
        setChallengeGone(found === null || Date.parse(found.ends_at) <= Date.parse(list.now));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, challengeId]);

  useEffect(() => {
    if (!session || joinCode === null) return;
    let cancelled = false;
    fetchLobbyFormat(joinCode)
      .then((found) => {
        if (!cancelled) setJoinFormat(found ?? "classic");
      })
      .catch(() => {
        // An unknown code is refused when joining, with its own message.
        if (!cancelled) setJoinFormat("classic");
      });
    return () => {
      cancelled = true;
    };
  }, [session, joinCode]);

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
          const sfida = challengeId ?? undefined;
          const view =
            format === "boss"
              ? await startBossBotMatch(mode.difficulty, cardInstanceIds)
              : format === "triple"
                ? await startTripleBotMatch(mode.difficulty, cardInstanceIds, sfida)
                : isQuadrantFormat(format)
                  ? await startQuadrantBotMatch(mode.difficulty, format, cardInstanceIds)
                  : await startBotMatch(mode.difficulty, cardInstanceIds, sfida);
          rememberLastPlay(
            challenge
              ? { mode: "bot", format, difficulty: mode.difficulty, challenge: { id: challenge.id, title: challenge.title } }
              : { mode: "bot", format, difficulty: mode.difficulty },
          );
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
          rememberLastPlay({ mode: "lobby", format });
          router.push("/attesa/?mode=lobby");
          break;
        case "queue":
          storePendingTeam(cardInstanceIds);
          rememberLastPlay({ mode: "queue", format });
          router.push(format === "classic" ? "/attesa/?mode=queue" : `/attesa/?mode=queue&format=${format}`);
          break;
        case "ranked":
          storePendingTeam(cardInstanceIds);
          rememberLastPlay({ mode: "ranked", format });
          router.push(format === "classic" ? "/attesa/?mode=queue&type=ranked" : `/attesa/?mode=queue&type=ranked&format=${format}`);
          break;
        case "conquest":
          storePendingTeam(cardInstanceIds);
          rememberLastPlay({ mode: "conquest", format: "classic" });
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
        <BackLink
          href={mode.kind === "story" ? "/storia" : mode.kind === "ranked" ? "/classificata" : "/gioca"}
          label={`Torna a ${mode.kind === "story" ? "Storia" : mode.kind === "ranked" ? "Classificata" : "Gioca"}`}
        />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">
            {format === "triple" || isQuadrantFormat(format) ? "Il tuo mazzo" : "La tua squadra"}
          </h1>
          <p className="truncate text-[11px] font-bold text-muted">
            {challengeId && <span style={{ color: challenge?.color }}>★ {challenge?.title ?? "Sfida a tema"} · </span>}
            {FORMAT_LABELS[format]}
            {COPY[mode.kind].subtitle(mode)}
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
        {challengeGone && (
          <p className="text-sm font-semibold text-comic-magenta">
            Questa Sfida a tema non è più aperta.{" "}
            <Link href="/gioca" className="underline">
              Torna a Gioca
            </Link>
          </p>
        )}
        {loaded && (mode.kind !== "join" || joinFormat !== null) && (!challengeId || challenge) ? (
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
              key={format}
              squadSize={squadSizeOf(format)}
              storyStars={mission && mission.star_rarities.length > 0 ? { rules: mission, earned: mission.stars } : null}
              challenge={challengeGone ? null : challenge}
              intro={
                format === "boss"
                  ? BOSS_INTRO
                  : format === "triple"
                    ? TRIPLE_INTRO
                    : isQuadrantFormat(format)
                      ? QUADRANT_INTRO
                      : "Scegli 5 personaggi diversi. Ognuno gioca un solo round: tieni gli specialisti per le Minacce di livello basso e i generalisti per quelle alte. Con una pressione lunga su una carta la vedi intera."
              }
            />
          </CardDetailProvider>
        ) : (
          !error && !challengeGone && <LoadingScreen label="Caricamento della collezione…" />
        )}
      </main>
    </div>
  );
}
