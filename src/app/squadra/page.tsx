"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CardDetailProvider } from "@/components/card-detail";
import { CardLooksProvider } from "@/components/card-looks";
import { BackLink } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";
import { SuppliedTeam } from "@/components/challenge-parts";
import { TeamPicker } from "@/components/team-picker";
import { fetchCatalog, type CatalogCard } from "@/lib/collection";
import { startBossBotMatch } from "@/lib/boss";
import { balance } from "@/config/balance";
import { isQuadrantFormat, QUADRANT_GRID_LABELS, startQuadrantBotMatch } from "@/lib/quadrant";
import { startTripleBotMatch } from "@/lib/triple";
import { coopRoomHref, coopStarCondition, fetchCoopRoom, setCoopReady, setCoopSquad } from "@/lib/coop";
import { createChallengeLobby, fetchChallenges, fetchLobbyChallenge, hasSuppliedTeam, seenChallenges, type Challenge } from "@/lib/challenges";
import { describeServerError } from "@/lib/errors";
import { challengeBlock, conquestBlock, describePlayBlock, rememberLastPlay, type PlayBlock } from "@/lib/last-play";
import { fetchStory, seenStory, startStoryMission, storyMatchHref, type StoryMission } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";
import {
  asMatchFormat,
  createLobby,
  DIFFICULTY_LABELS,
  fetchConquestInstances,
  fetchConquestStatus,
  fetchFormations,
  fetchInstanceDefinitions,
  fetchLobbyFormat,
  fetchOwnedInstances,
  joinLobby,
  startBotMatch,
  storePendingTeam,
  withoutStarters,
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
// /squadra/?operazione=<room id>                (the squad of 6 for an operation's room, SPEC §5.17)
// /squadra/?sfida=<id>&difficulty=medium        (a Sfida a tema against a bot; &format=… for its mode)
// /squadra/?sfida=<id>&mode=queue|lobby         (a Sfida a tema online; a join learns it from the code)
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
  /** Outside Conquest: for a Sfida a tema without starters, the copies that are not starter ones. */
  nonStarterBase: Map<string, string> | null;
  starterIds: Set<string> | null;
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
  | { kind: "story"; mission: string }
  | { kind: "coop"; room: string };

function readMode(params: URLSearchParams): Mode {
  const story = params.get("story");
  if (story) return { kind: "story", mission: story };
  const room = params.get("operazione");
  if (room) return { kind: "coop", room };
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

const TRIPLE_INTRO = `Scegli ${TRIPLE_DECK} personaggi diversi: le Minacce le scopri dopo. Ogni round ne peschi ${balance.triple.threats} a caso e li metti uno per Minaccia, quindi conviene un mazzo vario, con specialisti di più abilità. Con una pressione lunga su una carta dell'elenco la vedi intera; su una della squadra la togli.`;

const QUADRANT_DECK = balance.quadrant.deckSize;

const QUADRANT_INTRO = `Scegli ${QUADRANT_DECK} personaggi diversi: le 4 abilità che fanno da lati le scopri dopo. Hai sempre ${balance.quadrant.handSize} carte in mano e ne giochi ${balance.quadrant.cardsPerSide}: conviene un mazzo con picchi alti in abilità diverse. Con una pressione lunga su una carta dell'elenco la vedi intera; su una della squadra la togli.`;

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

const COOP_INTRO = `Scegli ${balance.coop.squadSize} personaggi diversi: delle Minacce conosci solo i livelli, nella stanza. Ogni round in città ne giochi uno, gli ultimi ${balance.coop.bossCards} contro il Boss; i compagni vedono le tue carte e tu le loro. Con una pressione lunga su una carta dell'elenco la vedi intera; su una della squadra la togli.`;

const BOSS_INTRO =
  "Scegli 5 personaggi diversi: il Boss lo scopri dopo. Ogni turno uno di loro entra su un fronte e ci resta fino alla fine, uno per fronte: servono specialisti per i fronti piccoli e generalisti per quelli grandi. Con una pressione lunga su una carta dell'elenco la vedi intera; su una della squadra la togli.";

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
  coop: { subtitle: () => "Operazione in squadra", start: () => "Porta questa squadra" },
};

function TeamPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = readMode(params);
  // A Sfida a tema (SPEC §8.8): against a bot or online in its own mode; a join learns it from the code.
  const [joinChallenge, setJoinChallenge] = useState<string | null>(null);
  const challengeId = ["bot", "queue", "lobby"].includes(mode.kind) ? params.get("sfida") : mode.kind === "join" ? joinChallenge : null;
  const findChallenge = (list: { challenges: Challenge[] } | null) =>
    list?.challenges.find((challenge) => challenge.id === challengeId) ?? null;
  const [challenge, setChallenge] = useState<Challenge | null>(() => (challengeId ? findChallenge(seenChallenges()) : null));
  // Why this very play cannot start now (a challenge over or done for today, a Conquista
  // closed): said here, never swapped for another play (SPEC §11.2).
  const [challengeBlocked, setChallengeBlocked] = useState<PlayBlock | null>(null);
  // A join learns its format from the code; until then the picker waits.
  const [joinFormat, setJoinFormat] = useState<MatchFormat | null>(null);
  const format = mode.kind === "join" ? (joinFormat ?? "classic") : readFormat(params, mode);
  const joinCode = mode.kind === "join" ? mode.code : null;
  const isConquest = mode.kind === "conquest";
  // Conquista: whether it is open, before the picker shows (undefined: not known yet; null: open or unknown).
  const [conquestBlocked, setConquestBlocked] = useState<PlayBlock | null | undefined>(isConquest ? undefined : null);
  const block = challengeBlocked ?? conquestBlocked ?? null;
  const { session } = useRequireSignedIn();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const storyCode = mode.kind === "story" ? mode.mission : null;
  // A story mission: its star rules and the stars earned, from the Storia page just left, then fresh.
  const [mission, setMission] = useState<StoryMission | null>(() => (storyCode ? findMission(seenStory(), storyCode) : null));
  // An operation: its squad star, told under the intro (SPEC §5.17).
  const coopRoom = mode.kind === "coop" ? mode.room : null;
  const [coopStar, setCoopStar] = useState<string | null>(null);
  useEffect(() => {
    if (!session || !coopRoom) return;
    let cancelled = false;
    fetchCoopRoom(coopRoom)
      .then((room) => {
        if (!cancelled) setCoopStar(coopStarCondition("squad", room.operation));
      })
      .catch(() => {
        // The intro stays without the star.
      });
    return () => {
      cancelled = true;
    };
  }, [session, coopRoom]);
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
        setChallengeBlocked(challengeBlock(challengeId, list.challenges, Date.parse(list.now)));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, challengeId]);

  useEffect(() => {
    if (!session || !isConquest) return;
    let cancelled = false;
    fetchConquestStatus()
      .then((status) => {
        if (!cancelled) setConquestBlocked(conquestBlock(status));
      })
      .catch(() => {
        // Unknown: the server refuses a closed Conquista when the queue starts, with its own message.
        if (!cancelled) setConquestBlocked(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session, isConquest]);

  useEffect(() => {
    if (!session || joinCode === null) return;
    let cancelled = false;
    // The challenge first: the picker opens once the format is known.
    Promise.all([fetchLobbyFormat(joinCode), fetchLobbyChallenge(joinCode).catch(() => null)])
      .then(([found, lobbyChallenge]) => {
        if (cancelled) return;
        setJoinChallenge(lobbyChallenge);
        setJoinFormat(found ?? "classic");
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
      .then(([catalog, found, instanceDefinitions, formations]) => {
        const { owned, conquerable, atRiskCopies, variantCopies } = found;
        const nonStarterBase = "nonStarterBase" in found ? found.nonStarterBase : null;
        const starterIds = "starterIds" in found ? found.starterIds : null;
        if (!cancelled) {
          setLoaded({ catalog, owned, conquerable, atRiskCopies, variantCopies, instanceDefinitions, formations, nonStarterBase, starterIds });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session, isConquest]);

  // A challenge without starters: the copies to field are never starter ones.
  const owned = useMemo(() => {
    if (!loaded) return null;
    if (!challenge?.rules.no_starters || !loaded.nonStarterBase || !loaded.starterIds) return loaded.owned;
    return withoutStarters(loaded.owned, loaded.variantCopies, loaded.nonStarterBase, loaded.starterIds);
  }, [loaded, challenge]);

  // A match that starts at once takes the place of the team picker in the history: going back
  // from it never reopens the picker of a match already under way. The waiting page is put on
  // top of it instead, and steps over it once the match starts (see src/app/attesa).
  async function start(cardInstanceIds: string[]) {
    // The Sfida a tema goes with the play remembered for «Gioca ancora» and «Rivincita».
    const remembered = challenge ? { challenge: { id: challenge.id, title: challenge.title } } : {};
    setStarting(true);
    setError(null);
    try {
      switch (mode.kind) {
        case "bot": {
          const sfida = challengeId ?? undefined;
          const view =
            format === "boss"
              ? await startBossBotMatch(mode.difficulty, cardInstanceIds, sfida)
              : format === "triple"
                ? await startTripleBotMatch(mode.difficulty, cardInstanceIds, sfida)
                : isQuadrantFormat(format)
                  ? await startQuadrantBotMatch(mode.difficulty, format, cardInstanceIds, sfida)
                  : await startBotMatch(mode.difficulty, cardInstanceIds, sfida);
          rememberLastPlay({ mode: "bot", format, difficulty: mode.difficulty, ...remembered });
          router.replace(`/partita/?id=${view.id}`);
          break;
        }
        case "story": {
          const view = await startStoryMission(mode.mission, cardInstanceIds);
          router.replace(storyMatchHref(view.id));
          break;
        }
        case "coop": {
          // Choosing the squad says Pronto too: one tap less, and Pronto can be taken back in the room.
          await setCoopSquad(mode.room, cardInstanceIds);
          await setCoopReady(mode.room, true);
          router.replace(coopRoomHref(mode.room));
          break;
        }
        case "join": {
          const view = await joinLobby(mode.code, cardInstanceIds);
          // Played again, a friend code of the same kind: a new one, made by this player.
          rememberLastPlay({ mode: "lobby", format, ...remembered });
          router.replace(`/partita/?id=${view.id}`);
          break;
        }
        case "lobby":
          if (challengeId) await createChallengeLobby(challengeId, cardInstanceIds);
          else await createLobby(cardInstanceIds, format);
          rememberLastPlay({ mode: "lobby", format, ...remembered });
          router.push("/attesa/?mode=lobby");
          break;
        case "queue":
          storePendingTeam(cardInstanceIds);
          rememberLastPlay({ mode: "queue", format, ...remembered });
          router.push(
            `/attesa/?mode=queue${challengeId ? `&sfida=${challengeId}` : ""}${format === "classic" ? "" : `&format=${format}`}`,
          );
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
          href={mode.kind === "story" ? "/storia" : mode.kind === "ranked" ? "/classificata" : mode.kind === "coop" ? coopRoomHref(mode.room) : "/gioca"}
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
              <ReturnLink href="/gioca" onward className="underline">
                Vai alla partita
              </ReturnLink>
            )}
          </p>
        )}
        {block && (
          <p className="text-sm font-semibold text-comic-magenta">
            {describePlayBlock(block).long}{" "}
            <ReturnLink href="/gioca" className="underline">
              Torna a Gioca
            </ReturnLink>
          </p>
        )}
        {block !== null ? null : challenge && mode.kind === "bot" && hasSuppliedTeam(challenge) ? (
          // A squad given by the challenge: nothing to choose, nothing of the player's at stake.
          <CardDetailProvider>
            <SuppliedTeam challenge={challenge} startLabel={COPY[mode.kind].start(mode)} starting={starting} onStart={() => void start([])} />
          </CardDetailProvider>
        ) : loaded && owned && conquestBlocked !== undefined && (mode.kind !== "join" || joinFormat !== null) && (!challengeId || challenge) ? (
          // A long press on a card shows it whole (CardDetailProvider), with the player's frames and effects.
          <CardLooksProvider>
            <CardDetailProvider>
              <TeamPicker
                catalog={loaded.catalog}
                owned={owned}
                conquerable={loaded.conquerable}
                atRiskCopies={loaded.atRiskCopies}
                variantCopies={loaded.variantCopies}
                instanceDefinitions={loaded.instanceDefinitions}
                formations={loaded.formations}
                onFormationsChanged={(formations) => setLoaded({ ...loaded, formations })}
                startLabel={COPY[mode.kind].start(mode)}
                starting={starting}
                onStart={start}
                key={`${format}-${challenge?.id ?? ""}`}
                squadSize={mode.kind === "coop" ? balance.coop.squadSize : squadSizeOf(format)}
                storyStars={mission && mission.star_rarities.length > 0 ? { rules: mission, earned: mission.stars } : null}
                challenge={challenge}
                intro={
                  mode.kind === "coop"
                    ? `${COOP_INTRO}${coopStar ? ` Per la stella della squadra: ${coopStar.charAt(0).toLowerCase()}${coopStar.slice(1)}.` : ""}`
                    : format === "boss"
                    ? BOSS_INTRO
                    : format === "triple"
                      ? TRIPLE_INTRO
                      : isQuadrantFormat(format)
                        ? QUADRANT_INTRO
                        : "Scegli 5 personaggi diversi. Ognuno gioca un solo round: tieni gli specialisti per le Minacce di livello basso e i generalisti per quelle alte. Con una pressione lunga su una carta dell'elenco la vedi intera; su una della squadra la togli."
                }
              />
            </CardDetailProvider>
          </CardLooksProvider>
        ) : (
          !error && !block && <LoadingScreen label="Caricamento della collezione…" />
        )}
      </main>
    </div>
  );
}
