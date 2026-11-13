"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { EventBanner } from "@/components/event-banner";
import { useMatchRewards } from "@/components/match-reward";
import { LoadingScreen } from "@/components/loading-screen";
import { TutorialButton } from "@/components/tutorial";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import { rewardRule } from "@/lib/match-rewards";
import {
  DIFFICULTY_LABELS,
  fetchActiveMatch,
  fetchConquestStatus,
  forfeitMatch,
  type ActiveMatch,
  type ConquestStatus,
} from "@/lib/match";
import { useRememberedState } from "@/lib/place-memory";
import { isQuadrantFormat, QUADRANT_FORMATS, QUADRANT_GRID_LABELS, type QuadrantFormat } from "@/lib/quadrant";
import { chapterUnlocked, fetchStory, seenStory, unlockHint, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";

const DIFFICULTIES = ["easy", "medium", "hard", "super_pro"] as const;

const MODES = [
  { key: "classic", label: "Partita classica", detail: "Contro un bot, online o in Conquista", color: "bg-comic-magenta", group: "versus" },
  { key: "story", label: "Storia", detail: "Missioni a Nuova Megara, con carte in premio", color: "rays-gold", group: "solo" },
  { key: "emergency", label: "Emergenza", detail: "La sfida del giorno, con la classifica", color: "bg-foreground", group: "solo" },
  { key: "boss", label: "Grande Minaccia", detail: "Un Boss, cinque fronti", color: "bg-comic-orange", group: "other" },
  { key: "triple", label: "Allarme Triplo", detail: "Tre Minacce, nove carte, tre round", color: "bg-comic-yellow", group: "other" },
  { key: "quadrant", label: "Quadrante", detail: "Una griglia 4×4, quattro abilità sui lati", color: "bg-comic-cyan", group: "other" },
] as const;

/** The headings the menu groups its modes under, in order. */
const GROUPS = [
  { key: "versus", label: "5 contro 5" },
  { key: "solo", label: "Da solo" },
  { key: "other", label: "Altre modalità" },
] as const;

/** Modes the menu used to have, now inside another: a remembered one reopens its new home. */
const MOVED_MODES: Record<string, ModeKey> = { friendly: "classic", conquest: "classic" };

type Mode = (typeof MODES)[number];
type ModeKey = Mode["key"];

/** One choice inside an open mode. */
function OptionRow({ href, title, detail, disabled = false }: { href: string; title: string; detail: string; disabled?: boolean }) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-disabled={disabled}
      className={`row-link py-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div>
        <p className="font-display text-xl uppercase leading-6">{title}</p>
        <p className="text-[13px] font-medium leading-4 text-muted">{detail}</p>
      </div>
      <span className="font-display text-2xl text-comic-yellow" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** A chapter the player cannot open yet: shown, so they know what comes next. */
function LockedRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="row-link py-2 opacity-60">
      <div>
        <p className="font-display text-xl uppercase leading-6">{title}</p>
        <p className="text-[13px] font-medium leading-4 text-muted">{detail}</p>
      </div>
      <span className="shrink-0 text-xl" aria-label="Da sbloccare">
        🔒
      </span>
    </div>
  );
}

/** Every chapter, the locked ones too, under the title of its season: each opens the Story on itself. */
function StorySection({ disabled }: { disabled: boolean }) {
  const [chapters, setChapters] = useState<StoryChapter[] | null>(() => seenStory());

  useEffect(() => {
    let cancelled = false;
    fetchStory()
      .then((next) => {
        if (!cancelled) setChapters(next);
      })
      .catch((cause: unknown) => console.error("Story failed", cause));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        Missioni contro gli avversari di Nuova Megara, con squadre e Minacce preparate. La prima vittoria di ogni
        missione dà monete, e il boss di fine capitolo una carta.
      </p>
      {chapters && chapters.length > 0 ? (
        chapters.map((chapter, index) => {
          const previous = chapters[index - 1];
          // The chapters come in story order, so a season starts where the one before changes.
          const season = previous?.season !== chapter.season && (
            <GroupTitle>{`Stagione ${chapter.season} · ${chapter.season_title}`}</GroupTitle>
          );
          const title = `Capitolo ${chapter.number}: ${chapter.title}`;
          if (!chapterUnlocked(chapter)) {
            return (
              <Fragment key={chapter.chapter}>
                {season}
                <LockedRow title={title} detail={unlockHint(previous, chapter)} />
              </Fragment>
            );
          }
          const done = chapter.missions.filter((m) => m.completed).length;
          return (
            <Fragment key={chapter.chapter}>
              {season}
              <OptionRow
                href={`/storia/?capitolo=${chapter.chapter}`}
                title={title}
                detail={
                  done === chapter.missions.length
                    ? "Completato: rileggi com'è finita."
                    : `${done}/${chapter.missions.length} missioni completate`
                }
                disabled={disabled}
              />
            </Fragment>
          );
        })
      ) : (
        <OptionRow href="/storia" title="Apri la Storia" detail="Carico i capitoli…" disabled={disabled} />
      )}
    </div>
  );
}

type Difficulty = (typeof DIFFICULTIES)[number];
/** How a bot plays in one mode: in full for screen readers, short on its tile. */
type BotTexts = Record<Difficulty, { detail: string; short: string }>;

const CLASSIC_BOTS: BotTexts = {
  easy: { detail: "Sceglie quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
  medium: { detail: "Gioca sempre il personaggio migliore per la Minaccia del momento.", short: "Il migliore del round" },
  hard: { detail: "Pianifica: tiene da parte specialisti e generalisti per i round giusti.", short: "Pianifica i round" },
  super_pro: { detail: "Simula mille partite possibili prima di ogni mossa.", short: "Simula mille partite" },
};

/** The four bots of a mode, two by two: a tap opens the team screen against that bot. */
function BotGrid({ query, texts, color }: { query: string; texts: BotTexts; color: string }) {
  return (
    <>
      <GroupTitle>Contro bot · amichevole</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        {DIFFICULTIES.map((difficulty) => (
          <Link
            key={difficulty}
            href={`/squadra/?${query}difficulty=${difficulty}`}
            aria-label={`Contro il bot ${DIFFICULTY_LABELS[difficulty]}: ${texts[difficulty].detail}`}
            className={`flex min-h-14 flex-col justify-center px-3 py-1.5 text-black ${color}`}
          >
            <span className="font-display text-xl uppercase leading-6">{DIFFICULTY_LABELS[difficulty]}</span>
            <span className="text-xs font-bold leading-4">{texts[difficulty].short}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

/** Friendly online play in a mode: a random player, a code for a friend, or a friend's code. */
function OnlineGroup({ query, randomDetail }: { query: string; randomDetail: string }) {
  return (
    <>
      <GroupTitle>Online · amichevole</GroupTitle>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/squadra/?mode=queue${query}`}
          className="flex min-h-14 flex-col justify-center bg-comic-yellow px-3 py-1.5 text-black"
        >
          <span className="font-display text-xl uppercase leading-6">Avversario casuale</span>
          <span className="text-xs font-bold leading-4">{randomDetail}</span>
        </Link>
        <Link
          href={`/squadra/?mode=lobby${query}`}
          className="flex min-h-14 flex-col justify-center bg-panel px-3 py-1.5 text-foreground"
        >
          <span className="font-display text-xl uppercase leading-6">Crea un codice</span>
          <span className="text-xs font-bold leading-4 text-muted">Mandalo a un amico</span>
        </Link>
      </div>
      <JoinCodeForm />
    </>
  );
}

/** Grande Minaccia (SPEC §5.12): against a bot, or friendly between players. */
function BossSection({ disabled }: { disabled: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Il Boss ha cinque fronti, tutti visibili: ogni turno due sono caldi e valgono di più, sempre diversi. Ogni turno metti un personaggio su un tuo
        fronte libero e resta lì fino alla fine: ogni fronte occupato paga a ogni turno, a chi è da solo o a chi fa più
        punti. Nessuna carta in gioco e nessuna moneta.
      </p>
      <BotGrid query="format=boss&" texts={BOSS_BOTS} color="bg-comic-orange" />
      <OnlineGroup query="&format=boss" randomDetail="Il primo giocatore libero" />
    </div>
  );
}

const BOSS_BOTS: BotTexts = {
  easy: { detail: "Sceglie quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
  medium: { detail: "Mette ogni turno la carta dove rende di più fino alla fine.", short: "Il fronte che rende di più" },
  hard: { detail: "Simula le partite possibili prima di ogni mossa.", short: "Simula le partite" },
  super_pro: { detail: "Simula molte più partite, con mani avversarie plausibili.", short: "Simula molte più partite" },
};

/** Allarme Triplo (SPEC §5.13): against a bot, or friendly between players. */
function TripleSection({ disabled }: { disabled: boolean }) {
  const { rounds, threats } = balance.triple;
  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Porti un mazzo di {rounds * threats} personaggi. Escono {threats} Minacce a caso, sempre le stesse per tutta la
        partita. Ogni round peschi {threats} carte e ne metti una per Minaccia: ogni Minaccia vinta vale un punto. Dopo{" "}
        {rounds} round vince chi ha più punti. Nessuna carta in gioco e nessuna moneta.
      </p>
      <BotGrid query="format=triple&" texts={TRIPLE_BOTS} color="bg-comic-yellow" />
      <OnlineGroup query="&format=triple" randomDetail="Il primo giocatore libero" />
    </div>
  );
}

const TRIPLE_BOTS: BotTexts = {
  easy: { detail: "Piazza quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
  medium: { detail: "Mette ogni carta sulla Minaccia dove rende di più.", short: "Dove rende di più" },
  hard: { detail: "Prova le mani avversarie possibili prima di piazzare. Mazzo forte.", short: "Prova le mani · mazzo forte" },
  super_pro: { detail: "Ne prova molte di più. Mazzo fortissimo.", short: "Ne prova di più · mazzo fortissimo" },
};

/** Quadrante (SPEC §5.14): two grids, each against a bot or friendly between players. */
function QuadrantSection({ disabled }: { disabled: boolean }) {
  const [grid, setGrid] = useRememberedState<QuadrantFormat>("quadrant-grid", "quadrant");
  const { deckSize, handSize, cardsPerSide } = balance.quadrant;
  return (
    <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-sm font-medium text-muted">
        Porti un mazzo di {deckSize} personaggi e ne hai sempre {handSize} in mano. Escono 4 abilità, una per lato della carta:
        a turno metti una carta accanto alle altre e ogni lato che supera quello vicino vale Sigilli. Dopo {cardsPerSide} carte a
        testa vince chi ha più Sigilli. Nessuna carta in gioco e nessuna moneta.
      </p>
      <div role="radiogroup" aria-label="La griglia" className="grid grid-cols-2 gap-1.5">
        {QUADRANT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            role="radio"
            aria-checked={grid === format}
            onClick={() => setGrid(format)}
            className={`flex min-h-11 flex-col items-start justify-center px-2.5 py-1 text-left ${
              grid === format ? "bg-foreground text-black" : "bg-panel text-foreground"
            }`}
          >
            <span className="font-display text-lg uppercase leading-5">{QUADRANT_GRID_LABELS[format]}</span>
            <span className="text-[11px] font-semibold leading-4 opacity-80">{QUADRANT_GRID_DETAILS[format]}</span>
          </button>
        ))}
      </div>
      <BotGrid query={`format=${grid}&`} texts={QUADRANT_BOTS} color="bg-comic-cyan" />
      <OnlineGroup query={`&format=${grid}`} randomDetail="Sulla stessa griglia" />
    </div>
  );
}

const QUADRANT_GRID_DETAILS: Record<QuadrantFormat, string> = {
  quadrant: "I bordi ci sono dall'inizio",
  quadrant_shifting: "Si sposta finché non arriva a 4",
};

const QUADRANT_BOTS: BotTexts = {
  easy: { detail: "Gioca quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
  medium: { detail: "Prende più Sigilli che può, senza scoprirsi troppo.", short: "Più Sigilli, senza scoprirsi" },
  hard: { detail: "Prova le risposte possibili prima di giocare. Mazzo forte.", short: "Prova le risposte · mazzo forte" },
  super_pro: { detail: "Ne prova molte di più. Mazzo fortissimo.", short: "Ne prova di più · mazzo fortissimo" },
};

/** Conquista (SPEC §6), inside the classic match: the winner takes a card, once unlocked. */
function ConquestGroup({ status, disabled }: { status: ConquestStatus | null; disabled: boolean }) {
  const { maxCardsLostPerDay, unlockAfterMatches, unlockAtLevel, minConquerableCards } = balance.conquest;
  const rewards = useMatchRewards();
  const loserCoins = rewards ? (rewardRule(rewards.rules, "conquest", "person", "loss")?.coins ?? 0) : 0;
  const limitReached = status !== null && status.cards_lost_today >= maxCardsLostPerDay;
  const available = status?.unlocked && !limitReached && !disabled;

  return (
    <div className="flex flex-col gap-2">
      <GroupTitle>Conquista · con le carte in palio</GroupTitle>
      <p className="text-[13px] font-medium leading-4 text-muted">
        Chi vince prende una carta dell&apos;avversario
        {loserCoins > 0 ? `, chi perde guadagna ${loserCoins} monete` : ""}. Si rischia solo ciò
        che si porta in campo: servono almeno {minConquerableCards} carte non starter.
      </p>
      {available ? (
        <Link href="/squadra/?mode=conquest" className="flex min-h-14 items-center justify-between gap-3 bg-comic-magenta px-4 py-2 text-black">
          <div>
            <p className="font-display text-xl uppercase leading-6">Cerca un avversario</p>
            <p className="text-[13px] font-semibold leading-4">
              Un avversario del tuo livello, o un bot dopo {balance.matchmaking.conquestBotAfterSeconds} secondi. Carte
              perse oggi: {status?.cards_lost_today}/{maxCardsLostPerDay}.
            </p>
          </div>
          <span className="font-display text-2xl" aria-hidden>
            →
          </span>
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-panel px-4 py-2">
          <div>
            <p className="font-display text-lg uppercase leading-6 text-faint">Non disponibile</p>
            <p className="text-[13px] font-medium leading-4 text-muted">
              {status && !status.unlocked
                ? `Completa ${unlockAfterMatches} partite (${status.completed_matches}/${unlockAfterMatches}) o raggiungi il livello ${unlockAtLevel} (sei al ${status.level}).`
                : limitReached
                  ? `Hai perso ${maxCardsLostPerDay} carte oggi: la Conquista torna dopo la mezzanotte.`
                  : "Finisci prima la partita in corso."}
            </p>
          </div>
          {status && !status.unlocked && (
            <span className="shrink-0 text-xl" aria-label="Da sbloccare">
              🔒
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EmergencySection() {
  const { threatsPerRun } = balance.emergency;
  const settings = useMatchRewards()?.settings;
  const maxCoins = settings
    ? settings["emergency.rewards.tier1_coins"] + settings["emergency.rewards.tier2_coins"] + settings["emergency.rewards.tier3_coins"]
    : null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        {threatsPerRun} Minacce uguali per tutti e un solo tentativo al giorno, con una classifica. Nessuna carta in
        gioco{maxCoins !== null && `, fino a ${maxCoins} monete`}. Si può giocare anche con una
        partita in corso.
      </p>
      <OptionRow href="/emergenza" title="Apri l'Emergenza di oggi" detail="Guarda i livelli, poi scegli la squadra." />
    </div>
  );
}

/** A small heading inside an open mode. */
function GroupTitle({ children }: { children: string }) {
  return <h3 className="pt-1 font-display text-lg uppercase leading-5 text-comic-yellow">{children}</h3>;
}

/**
 * A friend's code, from any mode: the code knows its own format, so the team screen asks for
 * the right number of cards.
 */
function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (normalized.length === 6) router.push(`/squadra/?mode=join&code=${normalized}`);
      }}
    >
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        maxLength={6}
        placeholder="Codice dell'amico"
        aria-label="Codice dell'amico"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="input-comic min-w-0 flex-1 uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal"
      />
      <button type="submit" disabled={normalized.length !== 6} className="btn btn-outline">
        Entra
      </button>
    </form>
  );
}

/**
 * The classic match (SPEC §5): 5 characters against 5 Threats. Against a bot or online it is a
 * friendly, nothing at stake; in Conquista (SPEC §6) the winner takes a card.
 */
function ClassicSection({ conquest, disabled }: { conquest: ConquestStatus | null; disabled: boolean }) {
  const { teamSize, roundsToWin } = balance.match;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        {teamSize} personaggi contro {teamSize} Minacce: vince chi fa {roundsToWin} round. Contro i bot e online è
        un&apos;amichevole, senza carte in gioco né monete.
      </p>

      <div className={`flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
        <BotGrid query="" texts={CLASSIC_BOTS} color="bg-comic-cyan" />
        <OnlineGroup query="" randomDetail="Il primo giocatore libero" />
      </div>

      <ConquestGroup status={conquest} disabled={disabled} />
    </div>
  );
}

/** A mode on the list: a tap opens its choices in place of the list. Open, it stays on top as the way back. */
function ModeTile({ mode, open, onToggle }: { mode: Mode; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={`cut-both speed-lines flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-black ${mode.color} ${
        open ? "shrink-0" : "flex-[1_1_0]"
      }`}
    >
      <div>
        <h2 className="-skew-x-8 font-display text-3xl uppercase leading-[34px]">{mode.label}</h2>
        <p className="text-sm font-bold leading-[18px]">{mode.detail}</p>
      </div>
      {open ? (
        <svg viewBox="0 0 14 14" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2.6} aria-hidden>
          <path d="M1 1l12 12M13 1 1 13" />
        </svg>
      ) : (
        <span className="font-display text-2xl" aria-hidden>
          →
        </span>
      )}
    </button>
  );
}

/** The match in progress on one row: the row resumes it, the flag abandons it after a confirmation. */
function ActiveMatchBanner({ match, onForfeit }: { match: ActiveMatch; onForfeit: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href={`/partita/?id=${match.id}`}
        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 bg-comic-cyan px-3 py-1.5 text-black"
      >
        <span className="min-w-0">
          <span className="block font-display text-[17px] uppercase leading-5">Hai una partita in corso</span>
          <span className="block text-xs font-bold leading-4">
            {match.format === "boss"
              ? "Grande Minaccia · "
              : match.format === "triple"
                ? "Allarme Triplo · "
                : isQuadrantFormat(match.format)
                  ? "Quadrante · "
                  : ""}
            {match.mode === "bot"
              ? `Contro il bot ${DIFFICULTY_LABELS[match.bot_difficulty ?? "easy"]}`
              : match.mode === "conquest"
                ? match.bot_difficulty
                  ? `Conquista contro il bot ${DIFFICULTY_LABELS[match.bot_difficulty]}`
                  : "Conquista contro un giocatore"
                : "Amichevole contro un giocatore"}{" "}
            · {match.format === "boss" ? "turno" : isQuadrantFormat(match.format) ? "mossa" : "round"}{" "}
            {match.format === "triple" ? Math.floor((match.current_round - 1) / balance.triple.threats) + 1 : match.current_round}
          </span>
        </span>
        <span className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-yellow">
          Riprendi
        </span>
      </Link>
      <button type="button" onClick={onForfeit} aria-label="Abbandona" className="btn btn-ghost min-h-14 w-12 shrink-0 px-0">
        <svg viewBox="0 0 18 20" className="h-5 w-[18px]" aria-hidden>
          <path d="M2 1v18" stroke="currentColor" strokeWidth={2.5} />
          <path d="M3 2h12l-3 4 3 4H3z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

export default function PlayPage() {
  const { session } = useRequireSignedIn();
  const [active, setActive] = useState<ActiveMatch | null | undefined>(undefined);
  const [conquest, setConquest] = useState<ConquestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // Back from a match setup or the Story, the same mode is open where it was.
  const [openMode, setOpenMode] = useRememberedState<ModeKey | null>("mode", null);
  // The page fits the screen above the bottom bar and never scrolls (see .home-shell): the
  // modes share the room, and an open mode takes it over with its choices.
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchActiveMatch(), fetchConquestStatus()])
      .then(([match, status]) => {
        if (cancelled) return;
        setActive(match);
        setConquest(status);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function forfeit(matchId: string) {
    try {
      await forfeitMatch(matchId);
      setActive(null);
      setConfirmForfeit(false);
    } catch (cause) {
      setError(describeServerError(cause));
      setConfirmForfeit(false);
    }
  }

  if (!session) return <LoadingScreen />;

  // The modes wait for the answer: a match in progress would block them anyway.
  const blocked = Boolean(active) || (active === undefined && !error);
  const openKey = (openMode && MOVED_MODES[openMode]) ?? openMode;
  const opened = MODES.find((mode) => mode.key === openKey) ?? null;

  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Gioca</h1>
        <TutorialButton compact />
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && <ActiveMatchBanner match={active} onForfeit={() => setConfirmForfeit(true)} />}
        {!opened && <EventBanner />}

        {opened ? (
          <section className="flex flex-col gap-2">
            <ModeTile mode={opened} open onToggle={() => setOpenMode(null)} />
            {opened.key === "classic" && <ClassicSection conquest={conquest} disabled={blocked} />}
            {opened.key === "story" && <StorySection disabled={blocked} />}
            {opened.key === "emergency" && <EmergencySection />}
            {opened.key === "boss" && <BossSection disabled={blocked} />}
            {opened.key === "triple" && <TripleSection disabled={blocked} />}
            {opened.key === "quadrant" && <QuadrantSection disabled={blocked} />}
          </section>
        ) : (
          GROUPS.map((group) => (
            <Fragment key={group.key}>
              <h2 className="shrink-0 font-display text-base uppercase leading-4 tracking-wide text-faint">{group.label}</h2>
              {MODES.filter((mode) => mode.group === group.key).map((mode) => (
                <ModeTile key={mode.key} mode={mode} open={false} onToggle={() => setOpenMode(mode.key)} />
              ))}
            </Fragment>
          ))
        )}
      </main>

      {/* Abandoning asks first, from the bottom like during a match. */}
      {confirmForfeit && active && (
        <>
          <button
            type="button"
            aria-label="Annulla"
            onClick={() => setConfirmForfeit(false)}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <div
            role="alertdialog"
            aria-label="Abbandonare la partita?"
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-comic-magenta px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
          >
            <p className="text-sm font-bold">Abbandonare conta come sconfitta, senza monete.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => forfeit(active.id)}
                className="btn flex-1 bg-black font-display text-lg uppercase tracking-wide text-comic-yellow"
              >
                Abbandona
              </button>
              <button type="button" onClick={() => setConfirmForfeit(false)} className="btn btn-ghost">
                Annulla
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
