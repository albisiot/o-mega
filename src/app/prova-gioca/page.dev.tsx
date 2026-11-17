"use client";

// Development-only copy of /gioca with fake data, to photograph the menu without a server.
//   /prova-gioca/?s=lista | partita | classica | storia | quadrante | boss | sbloccata

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { TrophyIcon } from "@/components/leaderboard-places";
import { useMatchRewards } from "@/components/match-reward";
import { TutorialButton } from "@/components/tutorial";
import { balance } from "@/config/balance";
import { leaderboardHref, type LeaderboardBoard } from "@/lib/leaderboards";
import { rewardRule } from "@/lib/match-rewards";
import {
  DIFFICULTY_LABELS,
  type ActiveMatch,
  type ConquestStatus,
} from "@/lib/match";
import { useRememberedState } from "@/lib/place-memory";
import { isQuadrantFormat, QUADRANT_FORMATS, QUADRANT_GRID_LABELS, type QuadrantFormat } from "@/lib/quadrant";
import { chapterUnlocked, unlockHint, type StoryChapter } from "@/lib/story";
import { useLockedScreen } from "@/lib/use-locked-screen";

const DIFFICULTIES = ["easy", "medium", "hard", "super_pro"] as const;

const MODES = [
  { key: "classic", label: "Partita classica", detail: "Contro un bot, online o in Conquista", color: "bg-comic-magenta", group: "versus" },
  { key: "story", label: "Storia", detail: "Missioni con premi", color: "rays-gold", group: "solo" },
  { key: "emergency", label: "Emergenza", detail: "La sfida del giorno", color: "bg-foreground", group: "solo" },
  { key: "boss", label: "Grande Minaccia", detail: "Un Boss, cinque fronti", color: "bg-comic-orange", group: "other" },
  { key: "triple", label: "Allarme Triplo", detail: "Tre Minacce, nove carte, tre round", color: "bg-comic-yellow", group: "other" },
  { key: "quadrant", label: "Quadrante", detail: "Una griglia 4×4, quattro abilità sui lati", color: "bg-comic-cyan", group: "other" },
] as const;

/** The headings the menu groups its modes under, in order; `pair`: its modes side by side. */
const GROUPS = [
  { key: "versus", label: "5 contro 5", pair: false },
  { key: "solo", label: "Da solo", pair: true },
  { key: "other", label: "Altre modalità", pair: false },
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
      className={`row-link min-h-12 py-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="min-w-0">
        <p className="truncate font-display text-[19px] uppercase leading-5">{title}</p>
        <p className="truncate text-[13px] font-medium leading-4 text-muted">{detail}</p>
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
    <div className="row-link min-h-12 py-1.5 opacity-60">
      <div className="min-w-0">
        <p className="truncate font-display text-[19px] uppercase leading-5">{title}</p>
        <p className="truncate text-[13px] font-medium leading-4 text-muted">{detail}</p>
      </div>
      <span className="shrink-0 text-xl" aria-label="Da sbloccare">
        🔒
      </span>
    </div>
  );
}

/**
 * The chapters of one season at a time, the locked ones too: each opens the Story on itself.
 * It opens on the season the player is in (its first chapter still to finish); the arrows go
 * to the others. One season fits the screen, the whole Story would not.
 */
function StorySection({ disabled }: { disabled: boolean }) {
  const chapters = FAKE_CHAPTERS;
  const [picked, setPicked] = useState<number | null>(null);

  const seasons = chapters ? [...new Set(chapters.map((chapter) => chapter.season))] : [];
  const playing = chapters?.find((chapter) => chapterUnlocked(chapter) && chapter.missions.some((m) => !m.completed));
  const lastOpen = chapters?.filter((chapter) => chapterUnlocked(chapter)).at(-1);
  const season = picked ?? playing?.season ?? lastOpen?.season ?? seasons[0];
  const index = seasons.indexOf(season);
  const shown = chapters?.filter((chapter) => chapter.season === season) ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      {/* On top and as a button: at the bottom, among the chapters, it read as one more chapter. */}
      <Link href={leaderboardHref("story")} className="btn btn-outline w-full">
        <TrophyIcon />
        {MODE_BOARDS.story.title}
      </Link>
      <p className="text-[13px] font-medium leading-4 text-muted">
        Missioni contro gli avversari di Nuova Megara: la prima vittoria di ogni missione dà monete, il boss di fine
        capitolo una carta.
      </p>
      {shown.length > 0 ? (
        <>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Stagione precedente"
              disabled={index <= 0}
              onClick={() => setPicked(seasons[index - 1])}
              className="btn btn-ghost h-9 w-9 shrink-0 px-0 disabled:opacity-30"
            >
              ‹
            </button>
            <h3 className="min-w-0 flex-1 truncate text-center font-display text-lg uppercase leading-5 text-comic-yellow">
              {`Stagione ${shown[0].season} · ${shown[0].season_title}`}
            </h3>
            <button
              type="button"
              aria-label="Stagione successiva"
              disabled={index >= seasons.length - 1}
              onClick={() => setPicked(seasons[index + 1])}
              className="btn btn-ghost h-9 w-9 shrink-0 px-0 disabled:opacity-30"
            >
              ›
            </button>
          </div>
          {shown.map((chapter) => {
            const previous = chapters?.[chapters.indexOf(chapter) - 1];
            const title = `Capitolo ${chapter.number}: ${chapter.title}`;
            if (!chapterUnlocked(chapter)) {
              return <LockedRow key={chapter.chapter} title={title} detail={unlockHint(previous, chapter)} />;
            }
            const done = chapter.missions.filter((m) => m.completed).length;
            return (
              <OptionRow
                key={chapter.chapter}
                href={`/storia/?capitolo=${chapter.chapter}`}
                title={title}
                detail={
                  done === chapter.missions.length
                    ? "Completato: rileggi com'è finita."
                    : `${done}/${chapter.missions.length} missioni completate`
                }
                disabled={disabled}
              />
            );
          })}
        </>
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
            className={`flex min-h-12 flex-col justify-center px-3 py-1 text-black ${color}`}
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
          className="flex min-h-12 flex-col justify-center bg-comic-yellow px-3 py-1 text-black"
        >
          <span className="font-display text-xl uppercase leading-6">Avversario casuale</span>
          <span className="text-xs font-bold leading-4">{randomDetail}</span>
        </Link>
        <Link
          href={`/squadra/?mode=lobby${query}`}
          className="flex min-h-12 flex-col justify-center bg-panel px-3 py-1 text-foreground"
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
    <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-[13px] font-medium leading-4 text-muted">
        Cinque fronti, due caldi a ogni turno. Ogni turno un tuo personaggio entra su un fronte libero e ci resta: ogni
        fronte paga a ogni turno a chi è da solo o fa più punti.
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
    <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-[13px] font-medium leading-4 text-muted">
        Mazzo di {rounds * threats}, {threats} Minacce fisse. Ogni round peschi {threats} carte e ne metti una per Minaccia: ogni
        Minaccia vinta vale un punto, dopo {rounds} round vince chi ne ha di più.
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
    <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <p className="text-[13px] font-medium leading-4 text-muted">
        Mazzo di {deckSize}, {handSize} in mano, 4 abilità sui lati. A turno metti una carta accanto alle altre: ogni lato
        che batte il vicino vale Sigilli. Dopo {cardsPerSide} carte a testa vince chi ne ha di più.
      </p>
      <div role="radiogroup" aria-label="La griglia" className="grid grid-cols-2 gap-1.5">
        {QUADRANT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            role="radio"
            aria-checked={grid === format}
            onClick={() => setGrid(format)}
            className={`flex min-h-10 flex-col items-start justify-center px-2.5 py-0.5 text-left ${
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
  quadrant: "Bordi fissi, con 4 Minacce",
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
  const { maxCardsLostPerDay, unlockAfterMatches, unlockAtLevel } = balance.conquest;
  const rewards = useMatchRewards();
  const loserCoins = rewards ? (rewardRule(rewards.rules, "conquest", "person", "loss")?.coins ?? 0) : 0;
  const limitReached = status !== null && status.cards_lost_today >= maxCardsLostPerDay;
  const available = status?.unlocked && !limitReached && !disabled;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <GroupTitle>Conquista · con le carte in palio</GroupTitle>
        <Link href={leaderboardHref("conquest")} className="shrink-0 text-[13px] font-extrabold text-comic-yellow underline">
          Classifica
        </Link>
      </div>
      {available ? (
        <Link href="/squadra/?mode=conquest" className="flex min-h-12 items-center justify-between gap-3 bg-comic-magenta px-4 py-1.5 text-black">
          <div>
            <p className="font-display text-xl uppercase leading-6">Cerca un avversario</p>
            <p className="text-[13px] font-semibold leading-4">
              Chi vince prende una carta in campo dell&apos;altro{loserCoins > 0 ? `, chi perde ${loserCoins} monete` : ""}. Perse
              oggi: {status?.cards_lost_today}/{maxCardsLostPerDay}.
            </p>
          </div>
          <span className="font-display text-2xl" aria-hidden>
            →
          </span>
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-panel px-4 py-1.5">
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
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-medium leading-4 text-muted">
        {threatsPerRun} Minacce uguali per tutti e un solo tentativo al giorno, con una classifica. Nessuna carta in
        gioco{maxCoins !== null && `, fino a ${maxCoins} monete`}. Si può giocare anche con una
        partita in corso.
      </p>
      <OptionRow href="/emergenza" title="Apri l'Emergenza di oggi" detail="Guarda i livelli, poi scegli la squadra." />
    </div>
  );
}

/** Where an open mode shows its board in the Classifiche (SPEC §8.6). */
const MODE_BOARDS: Record<ModeKey, { board: LeaderboardBoard; title: string }> = {
  classic: { board: "classic", title: "Classifica della Classica" },
  story: { board: "story", title: "Classifica della Storia" },
  emergency: { board: "emergency", title: "Classifica dell'Emergenza" },
  boss: { board: "boss", title: "Classifica di Grande Minaccia" },
  triple: { board: "triple", title: "Classifica di Allarme Triplo" },
  quadrant: { board: "quadrant", title: "Classifica di Quadrante" },
};

/**
 * The way from an open mode to its leaderboard, below its choices: always there, also with a
 * match in progress. The Story has its own on top (StorySection).
 */
function LeaderboardRow({ mode }: { mode: ModeKey }) {
  const { board, title } = MODE_BOARDS[mode];
  return (
    <Link href={leaderboardHref(board)} className="flex min-h-10 shrink-0 items-center justify-between gap-2 bg-panel px-3 text-black">
      <span className="flex min-w-0 items-center gap-2 text-comic-yellow">
        <TrophyIcon className="h-4 w-4 shrink-0" />
        <span className="truncate font-display text-[17px] uppercase leading-5 text-foreground">{title}</span>
      </span>
      <span className="font-display text-xl text-comic-yellow" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** A small heading inside an open mode. */
function GroupTitle({ children }: { children: string }) {
  return <h3 className="pt-0.5 font-display text-lg uppercase leading-5 text-comic-yellow">{children}</h3>;
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
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-medium leading-4 text-muted">
        {teamSize} personaggi contro {teamSize} Minacce: vince chi fa {roundsToWin} round.
      </p>

      <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
        <BotGrid query="" texts={CLASSIC_BOTS} color="bg-comic-cyan" />
        <OnlineGroup query="" randomDetail="Il primo giocatore libero" />
      </div>

      <ConquestGroup status={conquest} disabled={disabled} />
    </div>
  );
}

/** A mode on the list: a tap opens its choices in place of the list. Open, it stays on top as the way back. */
function ModeTile({ mode, open, onToggle, half = false }: { mode: Mode; open: boolean; onToggle: () => void; half?: boolean }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={open ? `${mode.label}: chiudi` : `${mode.label}: ${mode.detail}`}
      onClick={onToggle}
      className={`cut-both speed-lines flex w-full min-w-0 items-center justify-between gap-3 text-left text-black ${mode.color} ${
        open ? "shrink-0 px-4 py-1.5" : half ? "h-full px-3 py-1.5" : "flex-[1_1_0] px-4 py-1.5"
      }`}
    >
      <div className="min-w-0">
        <h2
          className={`-skew-x-8 truncate font-display uppercase ${open ? "text-2xl leading-7" : half ? "text-[22px] leading-6" : "text-[28px] leading-7"}`}
        >
          {mode.label}
        </h2>
        {!open && <p className="truncate text-[13px] font-bold leading-4">{mode.detail}</p>}
      </div>
      {open ? (
        <svg viewBox="0 0 14 14" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2.6} aria-hidden>
          <path d="M1 1l12 12M13 1 1 13" />
        </svg>
      ) : (
        !half && (
          <span className="font-display text-2xl" aria-hidden>
            →
          </span>
        )
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
                : match.mode === "ranked"
                  ? "Classificata"
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

export default function Page() {
  return (
    <Suspense>
      <PlayPage />
      <FakeNav />
    </Suspense>
  );
}

function PlayPage() {
  const scene = useSearchParams().get("s") ?? "lista";
  const active: ActiveMatch | null = scene === "partita" ? { id: "x", mode: "bot", format: "classic", bot_difficulty: "medium", current_round: 3 } : null;
  const conquest: ConquestStatus = scene === "sbloccata" ? { unlocked: true, completed_matches: 12, level: 4, cards_lost_today: 2 } : { unlocked: false, completed_matches: 2, level: 1, cards_lost_today: 0 };
  const error: string | null = null;
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // Back from a match setup or the Story, the same mode is open where it was.
  const [openMode, setOpenMode] = useRememberedState<ModeKey | null>("mode", null);
  // The page fits the screen above the bottom bar and never scrolls (see .home-shell): the
  // modes share the room, and an open mode takes it over with its choices.
  useLockedScreen(true);

  const initial: Record<string, ModeKey | null> = { classica: "classic", sbloccata: "classic", storia: "story", quadrante: "quadrant", boss: "boss" };
  useEffect(() => setOpenMode(initial[scene] ?? null), [scene]); // eslint-disable-line react-hooks/exhaustive-deps
  function forfeit(matchId: string) { void matchId; setConfirmForfeit(false); }

  // The modes wait for the answer: a match in progress would block them anyway.
  const blocked = Boolean(active) || (active === undefined && !error);
  const openKey = (openMode && MOVED_MODES[openMode]) ?? openMode;
  const opened = MODES.find((mode) => mode.key === openKey) ?? null;

  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Gioca</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* The Classificata of every mode (SPEC §8.7), in the header: it takes no height from the
              modes. A medal, gold like the home's button: its name would not fit beside the others. */}
          <Link
            href="/classificata"
            aria-label="Classificata"
            title="Classificata"
            className="rays-gold flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black text-black"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 2l5 8 5-8M12 22a6 6 0 100-12 6 6 0 000 12zM12 14v4" />
            </svg>
          </Link>
          <Link href="/classifiche/" aria-label="Classifiche" className="btn btn-outline h-11 w-11 shrink-0 px-0">
            <TrophyIcon />
          </Link>
          <TutorialButton compact />
        </div>
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && <ActiveMatchBanner match={active} onForfeit={() => setConfirmForfeit(true)} />}
        {!opened && <EventBanner />}

        {opened ? (
          <section className="flex flex-col gap-1.5">
            <ModeTile mode={opened} open onToggle={() => setOpenMode(null)} />
            {opened.key === "classic" && <ClassicSection conquest={conquest} disabled={blocked} />}
            {opened.key === "story" && <StorySection disabled={blocked} />}
            {opened.key === "emergency" && <EmergencySection />}
            {opened.key === "boss" && <BossSection disabled={blocked} />}
            {opened.key === "triple" && <TripleSection disabled={blocked} />}
            {opened.key === "quadrant" && <QuadrantSection disabled={blocked} />}
            {opened.key !== "story" && <LeaderboardRow mode={opened.key} />}
          </section>
        ) : (
          GROUPS.map((group) => (
            <Fragment key={group.key}>
              <h2 className="shrink-0 font-display text-base uppercase leading-4 tracking-wide text-faint">{group.label}</h2>
              {group.pair ? (
                <div className="grid min-h-14 flex-[1_1_0] grid-cols-2 gap-1.5">
                  {MODES.filter((mode) => mode.group === group.key).map((mode) => (
                    <ModeTile key={mode.key} mode={mode} open={false} half onToggle={() => setOpenMode(mode.key)} />
                  ))}
                </div>
              ) : (
                MODES.filter((mode) => mode.group === group.key).map((mode) => (
                  <ModeTile key={mode.key} mode={mode} open={false} onToggle={() => setOpenMode(mode.key)} />
                ))
              )}
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

/** The full event banner of Gioca, with fixed numbers. */
function EventBanner() {
  return (
    <Link href="/evento" className="flex shrink-0 flex-col gap-1 bg-comic-yellow px-3.5 py-1.5 text-black">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-display text-[17px] uppercase leading-5">Notte dei Cattivi</span>
        <span className="shrink-0 text-[12px] font-extrabold leading-4">finisce tra 2g 5h</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2.5 min-w-0 flex-1 bg-black/25" aria-hidden>
          <span className="block h-full bg-black" style={{ width: "45%" }} />
        </span>
        <span className="shrink-0 text-[12px] font-extrabold leading-4">90/200 punti</span>
      </span>
      <span className="truncate text-[12px] font-bold leading-4">Solo Cattivi</span>
    </Link>
  );
}

function mission(chapter: number, ord: number, completed: boolean, unlocked: boolean) {
  return { code: `m${chapter}-${ord}`, ord, title: "Missione", intro: "", opponent: "Bot", bot_difficulty: "easy" as const, threat_levels: [], reward_coins: 20, reward_card: null, completed, unlocked };
}

const FAKE_CHAPTERS: StoryChapter[] = [1, 2, 3, 4].map((n) => ({
  chapter: n,
  season: 1,
  season_title: "Il risveglio",
  number: n,
  title: ["Le prime luci", "Il porto", "La torre", "Il patto"][n - 1],
  intro: "",
  outro: null,
  season_ending: null,
  missions: [1, 2, 3].map((ord) => mission(n, ord, n === 1 || (n === 2 && ord === 1), n <= 2)),
}));

/** The bottom bar as BottomNav draws it on /gioca (it hides itself on this page). */
function FakeNav() {
  const tabs = ["Home", "Gioca", "Collezione", "Negozio", "Profilo"];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-foreground bg-black">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <li key={tab} className={`flex h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${tab === "Gioca" ? "bg-comic-yellow font-extrabold text-black" : "font-bold text-muted"}`}>
            <span className="h-[22px] w-[22px] border-2 border-current" />
            {tab}
          </li>
        ))}
      </ul>
    </nav>
  );
}
