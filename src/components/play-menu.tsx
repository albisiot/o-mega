"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChallengeCard, ChallengeRibbon } from "@/components/challenge-parts";
import { TrophyIcon } from "@/components/leaderboard-places";
import { StarCount } from "@/components/story-stars";
import { TutorialButton } from "@/components/tutorial";
import { balance } from "@/config/balance";
import { challengeEmergencyHref, runningChallenge, type Challenge } from "@/lib/challenges";
import { coopRoomHref, type CoopCatalog } from "@/lib/coop";
import { daysLeft, daysLeftText, emergencyHref } from "@/lib/emergency";
import { describeLastPlay, describePlayBlock, FIRST_PLAY, lastPlayHref, playBlock, type LastPlay, type PlayBlock } from "@/lib/last-play";
import { leaderboardHref, type LeaderboardBoard } from "@/lib/leaderboards";
import { DIFFICULTY_LABELS, type ActiveMatch, type ConquestStatus, type MatchFormat } from "@/lib/match";
import { useRememberedState } from "@/lib/place-memory";
import { isQuadrantFormat, QUADRANT_FORMATS, QUADRANT_GRID_LABELS, type QuadrantFormat } from "@/lib/quadrant";
import { leagueInfo, type MyRanked } from "@/lib/ranked";
import { chapterUnlocked, type StoryChapter } from "@/lib/story";
import { storyStarCount } from "@/lib/story-stars";

const DIFFICULTIES = ["easy", "medium", "hard", "super_pro"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const { teamSize, threatsPerMatch, roundsToWin } = balance.match;

/**
 * The modes: the rules of a match, each against a bot or friendly online. What is at stake
 * (Classificata, Conquista) has its own row, and the day's challenges theirs.
 * `newUntil`: the day its «Nuovo» badge goes away.
 */
const MODES = [
  {
    key: "classic",
    label: "Classica",
    color: "bg-comic-magenta",
    needs: [`Squadra da ${teamSize}`, `${roundsToWin} round su ${threatsPerMatch}`],
    rules: `${teamSize} personaggi contro ${threatsPerMatch} Minacce: vince chi fa ${roundsToWin} round.`,
  },
  {
    key: "boss",
    label: "Grande Minaccia",
    color: "bg-comic-orange",
    needs: [`Squadra da ${teamSize}`, `${balance.boss.turns} turni`],
    rules: `Un Boss, ${balance.boss.fronts} fronti, due caldi a ogni turno. Ogni turno un tuo personaggio entra su un fronte libero e ci resta: ogni fronte paga a chi è da solo o fa più punti.`,
  },
  {
    key: "triple",
    label: "Allarme Triplo",
    color: "bg-comic-yellow",
    needs: [`Mazzo da ${balance.triple.rounds * balance.triple.threats}`, `${balance.triple.rounds} round`],
    rules: `${balance.triple.threats} Minacce fisse. Ogni round peschi ${balance.triple.threats} carte e ne metti una per Minaccia: ogni Minaccia vinta vale un punto.`,
  },
  {
    key: "quadrant",
    label: "Quadrante",
    color: "bg-comic-cyan",
    needs: [`Mazzo da ${balance.quadrant.deckSize}`, `${balance.quadrant.cardsPerSide} mosse`],
    rules: `${balance.quadrant.handSize} carte in mano, 4 abilità sui lati. A turno metti una carta accanto alle altre: ogni lato che batte il vicino vale Sigilli.`,
    newUntil: "2026-11-26",
  },
] as const;

type Mode = (typeof MODES)[number];
export type ModeKey = Mode["key"];

/** Modes the menu used to have, now inside another: a remembered one reopens its new home. */
const MOVED_MODES: Record<string, ModeKey> = { friendly: "classic" };

const MODE_COLORS: Record<MatchFormat, string> = {
  classic: "bg-comic-magenta",
  boss: "bg-comic-orange",
  triple: "bg-comic-yellow",
  quadrant: "bg-comic-cyan",
  quadrant_shifting: "bg-comic-cyan",
};

/** Where an open mode shows its board in the Classifiche (SPEC §8.6). */
const MODE_BOARDS: Record<ModeKey, { board: LeaderboardBoard; title: string }> = {
  classic: { board: "classic", title: "Classifica della Classica" },
  boss: { board: "boss", title: "Classifica di Grande Minaccia" },
  triple: { board: "triple", title: "Classifica di Allarme Triplo" },
  quadrant: { board: "quadrant", title: "Classifica di Quadrante" },
};

/** How a bot plays in one mode: in full for screen readers, short on its tile. */
type BotTexts = Record<Difficulty, { detail: string; short: string }>;

const BOTS: Record<ModeKey, BotTexts> = {
  classic: {
    easy: { detail: "Sceglie quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
    medium: { detail: "Gioca sempre il personaggio migliore per la Minaccia del momento.", short: "Il migliore del round" },
    hard: { detail: "Pianifica: tiene da parte specialisti e generalisti per i round giusti.", short: "Pianifica i round" },
    super_pro: { detail: "Simula mille partite possibili prima di ogni mossa.", short: "Simula mille partite" },
  },
  boss: {
    easy: { detail: "Sceglie quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
    medium: { detail: "Mette ogni turno la carta dove rende di più fino alla fine.", short: "Il fronte che rende di più" },
    hard: { detail: "Simula le partite possibili prima di ogni mossa.", short: "Simula le partite" },
    super_pro: { detail: "Simula molte più partite, con mani avversarie plausibili.", short: "Simula molte più partite" },
  },
  triple: {
    easy: { detail: "Piazza quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
    medium: { detail: "Mette ogni carta sulla Minaccia dove rende di più.", short: "Dove rende di più" },
    hard: { detail: "Prova le mani avversarie possibili prima di piazzare. Mazzo forte.", short: "Prova le mani · mazzo forte" },
    super_pro: { detail: "Ne prova molte di più. Mazzo fortissimo.", short: "Ne prova di più · mazzo fortissimo" },
  },
  quadrant: {
    easy: { detail: "Gioca quasi a caso. Ideale per imparare.", short: "Ideale per imparare" },
    medium: { detail: "Prende più Sigilli che può, senza scoprirsi troppo.", short: "Più Sigilli, senza scoprirsi" },
    hard: { detail: "Prova le risposte possibili prima di giocare. Mazzo forte.", short: "Prova le risposte · mazzo forte" },
    super_pro: { detail: "Ne prova molte di più. Mazzo fortissimo.", short: "Ne prova di più · mazzo fortissimo" },
  },
};

const QUADRANT_GRID_DETAILS: Record<QuadrantFormat, string> = {
  quadrant: "Bordi fissi, con 4 Minacce",
  quadrant_shifting: "Si sposta finché non arriva a 4",
};

/** What the player did in today's Emergenza: null while it is still to play, undefined while loading. */
export type EmergencyToday = { passed: number; rank: number } | null | undefined;

/**
 * This week's Emergenza (SPEC §5.16): when it ends, how many threats, and the player's run (null
 * before the squad) with its place once finished. null when it cannot be loaded, undefined while loading.
 */
export type EmergencyThisWeek =
  | {
      endsAt: string;
      threats: number;
      run: { status: "active" | "finished"; passed: number; current_round: number } | null;
      rank: number | null;
    }
  | null
  | undefined;

/** The black chips under a mode's name: what it needs and how long it lasts. */
function Needs({ items, extra = null }: { items: readonly string[]; extra?: ReactNode }) {
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <span key={item} className="bg-black/80 px-1.5 text-[11px] font-extrabold leading-4 text-foreground">
          {item}
        </span>
      ))}
      {extra}
    </span>
  );
}

/** A heading of the list. */
function ListTitle({ children }: { children: string }) {
  return <h2 className="shrink-0 font-display text-base uppercase leading-4 tracking-wide text-faint">{children}</h2>;
}

/** The four bots of a mode, two by two: a tap opens the team screen against that bot. */
function BotGrid({ query, texts }: { query: string; texts: BotTexts }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {DIFFICULTIES.map((difficulty) => (
        <Link
          key={difficulty}
          href={`/squadra/?${query}difficulty=${difficulty}`}
          aria-label={`Contro il bot ${DIFFICULTY_LABELS[difficulty]}: ${texts[difficulty].detail}`}
          className="tile flex min-h-12 flex-col justify-center bg-comic-cyan px-3 py-1 text-black"
        >
          <span className="font-display text-xl uppercase leading-6">{DIFFICULTY_LABELS[difficulty]}</span>
          <span className="text-xs font-bold leading-4">{texts[difficulty].short}</span>
        </Link>
      ))}
    </div>
  );
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

/** Friendly online play in a mode: a random player, a code for a friend, or a friend's code. */
function OnlineGroup({ query, randomDetail }: { query: string; randomDetail: string }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/squadra/?mode=queue${query}`}
          className="tile flex min-h-12 flex-col justify-center bg-comic-yellow px-3 py-1 text-black"
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

type Opponent = "bot" | "online" | "challenge";

const OPPONENT_TABS: { key: Opponent; label: string; detail: string }[] = [
  { key: "bot", label: "Allenamento", detail: "Contro un bot" },
  { key: "online", label: "Amichevole", detail: "Online, contro un giocatore" },
];

/**
 * An open mode: its rules, the Quadrante's grid, then Allenamento (the bots) or Amichevole
 * (online), one at a time, and the mode's leaderboard at the bottom. While a Sfida a tema
 * runs on the mode (SPEC §8.8) a third tab, «★ A tema», shows it, and the sheet opens on it.
 */
function ModeSheet({ mode, disabled, challenge, now }: { mode: Mode; disabled: boolean; challenge: Challenge | null; now: number }) {
  const [grid, setGrid] = useRememberedState<QuadrantFormat>("quadrant-grid", "quadrant");
  const [chosen, setOpponent] = useRememberedState<Opponent>("opponent", challenge ? "challenge" : "bot");
  const opponent: Opponent = chosen === "challenge" && !challenge ? "bot" : chosen;
  // Three tabs leave room for a short line under each name.
  const tabs: { key: Opponent; label: string; detail: string }[] = challenge
    ? [
        { key: "bot", label: "Allenamento", detail: "Bot" },
        { key: "online", label: "Amichevole", detail: "Online" },
        { key: "challenge", label: "★ A tema", detail: "Per poco" },
      ]
    : OPPONENT_TABS;
  const format: MatchFormat = mode.key === "quadrant" ? grid : mode.key;
  const query = format === "classic" ? "" : `format=${format}&`;
  const { board, title } = MODE_BOARDS[mode.key];

  return (
    <>
      {/* On the challenge's tab its card says what matters: the mode's rules make room for it. */}
      {opponent !== "challenge" && <p className="text-[13px] font-medium leading-4 text-muted">{mode.rules}</p>}
      <Needs items={mode.needs} />
      {mode.key === "quadrant" && (
        <div role="radiogroup" aria-label="La griglia" className="grid grid-cols-2 gap-1.5">
          {QUADRANT_FORMATS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={grid === option}
              onClick={() => setGrid(option)}
              className={`flex min-h-10 flex-col items-start justify-center px-2.5 py-0.5 text-left ${
                grid === option ? "bg-foreground text-black" : "bg-panel text-foreground"
              }`}
            >
              <span className="font-display text-lg uppercase leading-5">{QUADRANT_GRID_LABELS[option]}</span>
              <span className="text-[11px] font-semibold leading-4 opacity-80">{QUADRANT_GRID_DETAILS[option]}</span>
            </button>
          ))}
        </div>
      )}
      <div role="tablist" aria-label="Contro chi" className={`grid gap-1.5 pt-0.5 ${tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {tabs.map(({ key, label, detail }) => {
          const selected = opponent === key;
          const challengeTab = key === "challenge" && challenge !== null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setOpponent(key)}
              className={`btn min-h-11 min-w-0 flex-col gap-0 border-2 px-1 py-0.5 ${
                selected ? "border-foreground text-black" : "border-line bg-panel text-foreground"
              } ${selected && !challengeTab ? "bg-foreground" : ""}`}
              style={challengeTab ? (selected ? { background: challenge.color, borderColor: "#000" } : { borderColor: challenge.color }) : undefined}
            >
              <span className="max-w-full truncate font-display text-lg uppercase leading-5">{label}</span>
              <span className={`text-[11px] font-semibold leading-3.5 ${selected ? "text-black/70" : "text-muted"}`}>{detail}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className={`flex flex-col gap-1.5 ${disabled && opponent !== "challenge" ? "pointer-events-none opacity-40" : ""}`}>
        {opponent === "challenge" && challenge ? (
          <ChallengeCard challenge={challenge} now={now} disabled={disabled} />
        ) : opponent === "bot" ? (
          <BotGrid query={query} texts={BOTS[mode.key]} />
        ) : (
          <OnlineGroup
            query={format === "classic" ? "" : `&format=${format}`}
            randomDetail={isQuadrantFormat(format) ? "Sulla stessa griglia" : "Il primo giocatore libero"}
          />
        )}
      </div>
      <Link
        href={leaderboardHref(board)}
        className="mt-auto flex min-h-10 shrink-0 items-center justify-between gap-2 bg-panel px-3 text-black"
      >
        <span className="flex min-w-0 items-center gap-2 text-comic-yellow">
          <TrophyIcon className="h-4 w-4 shrink-0" />
          <span className="truncate font-display text-[17px] uppercase leading-5 text-foreground">{title}</span>
        </span>
        <span className="font-display text-xl text-comic-yellow" aria-hidden>
          →
        </span>
      </Link>
    </>
  );
}

/** A mode on the list: a tap opens its choices in place of the list. Open, it stays on top as the way back. */
function ModeTile({
  mode,
  open,
  onToggle,
  now,
  challenge = null,
}: {
  mode: Mode;
  open: boolean;
  onToggle: () => void;
  now: number;
  /** A Sfida a tema running on the mode: its ribbon takes the place of «Nuovo». */
  challenge?: Challenge | null;
}) {
  const isNew = "newUntil" in mode && now < Date.parse(`${mode.newUntil}T00:00:00+01:00`);
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={
        open
          ? `${mode.label}: chiudi`
          : `${mode.label}: ${mode.needs.join(", ")}${challenge ? `. Sfida a tema: ${challenge.title}` : isNew ? ". Nuova" : ""}`
      }
      onClick={onToggle}
      className={`cut-both speed-lines relative flex w-full min-w-0 items-center justify-between gap-2 text-left text-black ${mode.color} ${
        open ? "shrink-0 px-4 py-1.5" : "h-full px-3 py-1.5"
      }`}
    >
      <div className="min-w-0">
        <h2 className={`-skew-x-8 font-display uppercase ${open ? "truncate text-2xl leading-7" : "text-[22px] leading-6"}`}>
          {mode.label}
        </h2>
        {!open && <Needs items={mode.needs} extra={challenge ? <ChallengeRibbon color={challenge.color} /> : null} />}
      </div>
      {open ? (
        <svg viewBox="0 0 14 14" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth={2.6} aria-hidden>
          <path d="M1 1l12 12M13 1 1 13" />
        </svg>
      ) : (
        isNew &&
        !challenge && (
          <span className="absolute right-2 top-2 rotate-3 bg-black px-1.5 font-sfx text-sm leading-5 tracking-wide text-comic-yellow" aria-hidden>
            Nuovo
          </span>
        )
      )}
    </button>
  );
}

/**
 * «Gioca ancora»: the last match set off on this device, straight to its team screen; before
 * the first one, the suggested start. A shortcut: the team screen and the server check the rest.
 * A `block` (a Conquista closed, a Sfida a tema over) is said in place of the detail, and the
 * button waits: it never opens another play instead.
 */
function PlayAgain({ play, first, disabled, block }: { play: LastPlay; first: boolean; disabled: boolean; block: PlayBlock | null }) {
  const { title, detail: how } = describeLastPlay(play);
  const detail = block ? describePlayBlock(block).short : how;
  const off = disabled || block !== null;
  return (
    <Link
      href={lastPlayHref(play)}
      aria-disabled={off}
      tabIndex={off ? -1 : undefined}
      aria-label={`${first ? "Prima partita" : "Gioca ancora"}: ${title}, ${detail}`}
      className={`cut-both speed-lines-moving flex min-h-[76px] shrink-0 items-center justify-between gap-3 px-4 py-2 text-black short:min-h-16 ${MODE_COLORS[play.format]} ${
        off ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <span className="min-w-0">
        <span className="inline-block -skew-x-8 bg-black px-1.5 font-sfx text-[15px] leading-5 tracking-wide text-comic-yellow">
          {first ? "Prima partita" : "Gioca ancora"}
        </span>
        <span className="block -skew-x-8 truncate font-display text-[34px] uppercase leading-9 short:text-[28px] short:leading-8">{title}</span>
        <span className="block truncate text-[13px] font-bold leading-4">{detail}</span>
      </span>
      <span className="font-display text-3xl" aria-hidden>
        →
      </span>
    </Link>
  );
}

/** One of the day's tiles beside the event: a name, a line and its state. */
function TodayTile({
  href,
  title,
  detail,
  detailTail,
  state,
  stateLabel,
  className,
  disabled = false,
}: {
  href: string;
  title: string;
  detail: string;
  /** Said after the detail only when it fits whole: beside the event the tile is narrow. */
  detailTail?: string;
  /** The black chip under the detail. */
  state?: ReactNode;
  /** What the chip says to a screen reader, when it is not plain text. */
  stateLabel?: string;
  className: string;
  disabled?: boolean;
}) {
  const said = stateLabel ?? (typeof state === "string" ? state : undefined);
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      aria-label={`${title}: ${detail}${said ? `, ${said}` : ""}`}
      className={`tile flex min-h-12 min-w-0 flex-[1_1_0] flex-col justify-center px-2.5 py-1 text-black short:min-h-11 ${className} ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <span className="block truncate font-display text-[15px] uppercase leading-5">{title}</span>
      {detailTail ? (
        // A tail that does not fit wraps onto a second line, which the fixed height hides.
        <span className="flex h-4 flex-wrap overflow-hidden text-[12px] font-bold leading-4">
          <span className="truncate">{detail}</span>
          <span className="whitespace-nowrap">&nbsp;· {detailTail}</span>
        </span>
      ) : (
        <span className="block truncate text-[12px] font-bold leading-4">{detail}</span>
      )}
      {state && (
        <span className="mt-0.5 max-w-full self-start truncate whitespace-nowrap bg-black px-1 text-[10px] font-extrabold uppercase leading-[14px] text-comic-yellow">
          {state}
        </span>
      )}
    </Link>
  );
}

function EmergencyTile({ today }: { today: EmergencyToday }) {
  const { threatsPerRun } = balance.emergency;
  return (
    <TodayTile
      href="/emergenza"
      title="Emergenza"
      detail={today ? `${today.passed}/${threatsPerRun} · ${today.rank}° oggi` : "1 tentativo"}
      state={today === undefined ? undefined : today ? "✓ Fatta" : "Da fare"}
      className="bg-foreground"
    />
  );
}

/**
 * This week's Emergenza on one slim row under the day's tiles, drawn like the Emergenza tile:
 * the days left and where the player is (to play, in progress, done with the threats passed).
 */
function EmergencyWeekRow({ week, now, compact = false }: { week: EmergencyThisWeek; now: number; compact?: boolean }) {
  if (week === null) return null;
  const run = week?.run ?? null;
  const days = week ? daysLeftText(daysLeft(week.endsAt, now)) : "Una sfida più dura";
  const state =
    week === undefined
      ? undefined
      : !run
        ? "Da fare"
        : run.status === "active"
          ? `In corso · ${run.passed}/${week.threats}`
          : `✓ ${run.passed}/${week.threats}${week.rank ? ` · ${week.rank}°` : ""}`;
  if (compact) {
    // Half the row, beside an Emergenza a tema: the name and where the player is.
    return (
      <Link
        href={emergencyHref("week")}
        aria-label={`Emergenza della settimana: ${days}${state ? `, ${state}` : ""}`}
        className="tile flex min-h-10 min-w-0 flex-1 flex-col justify-center bg-foreground px-2.5 py-1 text-black short:min-h-9"
      >
        <span className="block truncate font-display text-[15px] uppercase leading-5">Settimana</span>
        <span className="block truncate text-[12px] font-bold leading-4">{state ?? days}</span>
      </Link>
    );
  }
  return (
    <Link
      href={emergencyHref("week")}
      aria-label={`Emergenza della settimana: ${days}${state ? `, ${state}` : ""}`}
      className="tile flex min-h-10 shrink-0 items-center gap-2 bg-foreground px-2.5 py-1 text-black short:min-h-9"
    >
      <span className="shrink-0 -skew-x-8 bg-black px-1.5 font-sfx text-[13px] leading-5 tracking-wide text-comic-yellow">
        Settimana
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] uppercase leading-5">Emergenza della settimana</span>
        <span className="block truncate text-[12px] font-bold leading-4">{days}</span>
      </span>
      {state && (
        <span className="shrink-0 whitespace-nowrap bg-black px-1 text-[10px] font-extrabold uppercase leading-[14px] text-comic-yellow">
          {state}
        </span>
      )}
    </Link>
  );
}

/**
 * An Emergenza a tema (SPEC §8.8) beside the week's, on the same slim row: no line more in Gioca.
 * Its name, and where the player is: to play, in progress, done with the threats passed.
 */
function EmergencyChallengeRow({ challenge }: { challenge: Challenge }) {
  const run = challenge.my_run ?? null;
  const threats = challenge.emergency_threats ?? challenge.team_size;
  const state = !run ? `Da fare · ${threats} Minacce` : run.status === "active" ? `In corso · ${run.passed}/${threats}` : `✓ ${run.passed}/${threats}`;
  return (
    <Link
      href={challengeEmergencyHref(challenge)}
      aria-label={`Emergenza a tema ${challenge.title}: ${state}`}
      className="tile flex min-h-10 min-w-0 flex-[1.4_1_0] items-center gap-1.5 px-2 py-1 text-black short:min-h-9"
      style={{ background: challenge.color }}
    >
      <span className="shrink-0 -rotate-2 border-2 border-black px-1 font-sfx text-[12px] leading-[14px] tracking-wide">★</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] uppercase leading-5">{challenge.title}</span>
        <span className="block truncate text-[12px] font-bold leading-4">{state}</span>
      </span>
    </Link>
  );
}

/**
 * The Operazioni (SPEC §5.17) on the week's row: the room the player is in, or how far the
 * chapter is. Beside the week's Emergenza, so Gioca gains no line.
 */
function OperationsTile({ coop, compact = false }: { coop: CoopCatalog | null | undefined; compact?: boolean }) {
  const room = coop?.room ?? null;
  const operations = coop?.chapters.flatMap((chapter) => chapter.operations) ?? [];
  const next = operations.find((operation) => operation.unlocked && !operation.completed);
  const state = room
    ? room.status === "active"
      ? "In corso"
      : `Stanza ${room.code}`
    : next
      ? compact
        ? `${next.ord}/${operations.length}`
        : `${next.title} · ${next.ord}/${operations.length}`
      : operations.length
        ? "✓ Completate"
        : "In squadra, dal vivo";
  return (
    <Link
      href={room ? coopRoomHref(room.id) : "/operazioni"}
      aria-label={`Operazioni in squadra: ${state}`}
      className={`tile flex min-h-10 min-w-0 flex-col justify-center bg-comic-cyan px-2.5 py-1 text-black short:min-h-9 ${
        compact ? "flex-1" : "flex-[1.4_1_0]"
      }`}
    >
      <span className="block truncate font-display text-[15px] uppercase leading-5">Operazioni</span>
      <span className="block truncate text-[12px] font-bold leading-4">{state}</span>
    </Link>
  );
}

/**
 * The Story at the chapter the player is in, with the stars of the whole Story earned so far
 * («★ 15/180», locked missions counted too): the Story opens on its next mission.
 */
function StoryTile({ chapters, disabled }: { chapters: StoryChapter[] | null; disabled: boolean }) {
  const playing = chapters?.find((chapter) => chapterUnlocked(chapter) && chapter.missions.some((m) => !m.completed));
  const done = playing?.missions.filter((m) => m.completed).length ?? 0;
  const stars = chapters && storyStarCount(chapters);
  const missions = playing ? `${done}/${playing.missions.length}` : null;
  if (stars) {
    // The stars take the chip; the chapter's missions move beside its number, when there is room.
    return (
      <TodayTile
        href="/storia"
        title="Storia"
        detail={playing ? `Capitolo ${playing.number}` : "Completata"}
        detailTail={missions ?? undefined}
        state={<StarCount {...stars} className="align-top text-[11px]" />}
        stateLabel={`${missions ? `${missions} missioni, ` : ""}${stars.earned} stelle su ${stars.total}`}
        className="rays-gold"
        disabled={disabled}
      />
    );
  }
  return (
    <TodayTile
      href="/storia"
      title="Storia"
      detail={playing ? `Capitolo ${playing.number}` : chapters ? "Completata" : "Missioni"}
      state={missions ? `${missions} missioni` : undefined}
      className="rays-gold"
      disabled={disabled}
    />
  );
}

/** What is at stake: the Fama of the Classificata (its page), the cards of the Conquista. */
function StakesRow({ ranked, conquest, blocked }: { ranked: MyRanked | null; conquest: ConquestStatus | null; blocked: boolean }) {
  const { maxCardsLostPerDay, unlockAfterMatches, unlockAtLevel } = balance.conquest;
  const limitReached = conquest !== null && conquest.cards_lost_today >= maxCardsLostPerDay;
  const locked = conquest !== null && !conquest.unlocked;
  const available = conquest !== null && !locked && !limitReached && !blocked;
  const conquestDetail = locked
    ? `${conquest.completed_matches}/${unlockAfterMatches} partite o liv. ${unlockAtLevel}`
    : limitReached
      ? "Torna dopo mezzanotte"
      : `Perse oggi ${conquest?.cards_lost_today ?? 0}/${maxCardsLostPerDay}`;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5">
      <Link
        href="/classificata"
        aria-label={ranked ? `Classificata: ${ranked.fama} Fama, ${leagueInfo(ranked.league).name}` : "Classificata: la Fama in gioco"}
        className="cut-both rays-gold flex min-h-14 min-w-0 flex-col justify-center px-3 py-1 text-black short:min-h-12"
      >
        <span className="block -skew-x-8 truncate font-display text-xl uppercase leading-6">Classificata</span>
        <span className="block truncate text-[12px] font-extrabold leading-4">
          {ranked ? `${ranked.fama} Fama · ${leagueInfo(ranked.league).name}` : "La Fama in gioco"}
        </span>
      </Link>
      <Link
        href={available ? "/squadra/?mode=conquest" : "#"}
        aria-disabled={!available}
        aria-label={`Conquista: chi vince prende una carta dell'altro. ${
          locked
            ? `Si sblocca dopo ${unlockAfterMatches} partite (${conquest.completed_matches}/${unlockAfterMatches}) o al livello ${unlockAtLevel}.`
            : limitReached
              ? `Hai perso ${maxCardsLostPerDay} carte oggi: torna dopo la mezzanotte.`
              : conquestDetail
        }`}
        className={`cut-both speed-lines relative flex min-h-14 min-w-0 flex-col justify-center bg-comic-magenta px-3 py-1 text-black short:min-h-12 ${
          available ? "" : "pointer-events-none opacity-50"
        }`}
      >
        <span className="block -skew-x-8 truncate font-display text-xl uppercase leading-6">Conquista</span>
        <span className="block truncate text-[12px] font-extrabold leading-4">{conquestDetail}</span>
        {locked && (
          <span className="absolute right-1.5 top-1 bg-black px-1 font-sfx text-[13px] leading-4 tracking-wide text-comic-magenta" aria-hidden>
            🔒 Liv. {unlockAtLevel}
          </span>
        )}
      </Link>
    </div>
  );
}

/** The match in progress on one row: the row resumes it, the flag abandons it after a confirmation. */
function ActiveMatchBanner({ match, onForfeit }: { match: ActiveMatch; onForfeit: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href={`/partita/?id=${match.id}`}
        className="tile flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 bg-comic-cyan px-3 py-1.5 text-black"
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

/**
 * The Gioca screen (SPEC §11.6), drawn from what the page loaded: «Gioca ancora», the day's
 * row (event, Emergenza, Storia), the four modes and what is at stake. It fits the screen
 * above the bottom bar; an open mode takes the list's place.
 */
export function PlayMenuView({
  active,
  error,
  conquest,
  ranked,
  emergency,
  emergencyWeek,
  story,
  lastPlay,
  event,
  challenges = null,
  coop,
  now,
  onForfeit,
}: {
  /** The match in progress; undefined while loading. */
  active: ActiveMatch | null | undefined;
  error: string | null;
  conquest: ConquestStatus | null;
  ranked: MyRanked | null;
  emergency: EmergencyToday;
  emergencyWeek: EmergencyThisWeek;
  story: StoryChapter[] | null;
  /** The last match set off on this device, or null for none. */
  lastPlay: LastPlay | null;
  /** The event's tile (EventBanner compact): nothing when there is no event. */
  event: ReactNode;
  /** The Sfide a tema running or to come (SPEC §8.8); null while loading or without any. */
  challenges?: Challenge[] | null;
  /** The Operazioni (SPEC §5.17): the chapter and the room the player is in; undefined while loading. */
  coop?: CoopCatalog | null;
  now: number;
  onForfeit: () => void;
}) {
  // Back from a match setup, the same mode is open where it was.
  const [openMode, setOpenMode] = useRememberedState<string | null>("mode", null);
  // The modes wait for the answer: a match in progress would block them anyway.
  const blocked = Boolean(active) || (active === undefined && !error);
  const openKey = (openMode && MOVED_MODES[openMode]) ?? openMode;
  const opened = MODES.find((mode) => mode.key === openKey) ?? null;
  const challengeOf = (key: ModeKey) => runningChallenge(challenges, key, now);
  // An Emergenza a tema has no mode tile: it sits beside the week's Emergenza.
  const themedEmergency = runningChallenge(challenges, "emergency", now);

  // The same play, never another one: a Conquista closed or a Sfida a tema over (or done for
  // today) is said on the button, which waits (SPEC §11.2). Until 20 November 2026 they fell
  // back to a friendly Classica online and to the mode without the challenge.
  const againBlock = lastPlay ? playBlock(lastPlay, { now, challenges, conquest }) : null;

  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Gioca</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/classifiche/" aria-label="Classifiche" className="btn btn-outline h-11 w-11 shrink-0 px-0">
            <TrophyIcon />
          </Link>
          <TutorialButton compact />
        </div>
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && <ActiveMatchBanner match={active} onForfeit={onForfeit} />}

        {opened ? (
          <section className="flex min-h-0 flex-1 flex-col gap-1.5">
            <ModeTile mode={opened} open now={now} onToggle={() => setOpenMode(null)} />
            <ModeSheet key={opened.key} mode={opened} disabled={blocked} challenge={challengeOf(opened.key)} now={now} />
          </section>
        ) : (
          <>
            {!active && <PlayAgain play={lastPlay ?? FIRST_PLAY} first={!lastPlay} disabled={blocked} block={againBlock} />}

            <ListTitle>Oggi</ListTitle>
            <div className="flex shrink-0 gap-1.5">
              {event}
              <EmergencyTile today={emergency} />
              <StoryTile chapters={story} disabled={blocked} />
            </div>
            {/* The week's Emergenza shares its row: with an Emergenza a tema and with the Operazioni. */}
            <div className="flex shrink-0 gap-1.5">
              <EmergencyWeekRow week={emergencyWeek} now={now} compact />
              {themedEmergency && <EmergencyChallengeRow challenge={themedEmergency} />}
              <OperationsTile coop={coop} compact={Boolean(themedEmergency)} />
            </div>

            <ListTitle>Modalità</ListTitle>
            <div className="grid min-h-28 flex-[1_1_0] auto-rows-fr grid-cols-2 gap-1.5">
              {MODES.map((mode) => (
                <ModeTile
                  key={mode.key}
                  mode={mode}
                  open={false}
                  now={now}
                  challenge={challengeOf(mode.key)}
                  onToggle={() => setOpenMode(mode.key)}
                />
              ))}
            </div>

            <ListTitle>In palio</ListTitle>
            <StakesRow ranked={ranked} conquest={conquest} blocked={blocked} />
          </>
        )}
      </main>
    </div>
  );
}
