import type { BotDifficulty } from "@o-mega/game-engine";
import { balance } from "@/config/balance";
import type { Challenge } from "@/lib/challenges";
import type { ConquestStatus, MatchFormat, MatchMode } from "@/lib/match";

/**
 * The last match the player set off from the team screen, kept on this device: Gioca's
 * «Gioca ancora» opens the same team screen again. A shortcut only: the server still checks
 * everything when the match starts (a locked Conquista, a match in progress...).
 * A friend code joined is kept as "lobby": playing it again makes a new code of the same kind.
 */
export type LastPlay =
  /** challenge: a Sfida a tema (SPEC §8.8), kept even once it is over (see playBlock). */
  | { mode: "bot"; format: MatchFormat; difficulty: BotDifficulty; challenge?: { id: string; title: string } }
  | { mode: "queue" | "lobby" | "ranked"; format: MatchFormat; challenge?: { id: string; title: string } }
  | { mode: "conquest"; format: "classic" };

/** What Gioca suggests before the player has started anything on this device. */
export const FIRST_PLAY: LastPlay = { mode: "bot", format: "classic", difficulty: "easy" };

const STORE_KEY = "o-mega.last-play";
const FORMATS: readonly MatchFormat[] = ["classic", "boss", "triple", "quadrant", "quadrant_shifting"];
const DIFFICULTIES: readonly BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];
const DIFFICULTY_NAMES: Record<BotDifficulty, string> = { easy: "Facile", medium: "Medio", hard: "Difficile", super_pro: "Super Pro" };

/** A stored value back to a play, or null if it is not one (an older or broken value). */
export function parseLastPlay(value: unknown): LastPlay | null {
  if (typeof value !== "object" || value === null) return null;
  const { mode, format, difficulty, challenge } = value as Record<string, unknown>;
  if (!FORMATS.includes(format as MatchFormat)) return null;
  const known = format as MatchFormat;
  const { id, title } = (challenge ?? {}) as Record<string, unknown>;
  const knownChallenge = typeof id === "string" && typeof title === "string" ? { id, title } : null;
  if (mode === "bot") {
    if (!DIFFICULTIES.includes(difficulty as BotDifficulty)) return null;
    const play: LastPlay = { mode, format: known, difficulty: difficulty as BotDifficulty };
    return knownChallenge ? { ...play, challenge: knownChallenge } : play;
  }
  // Online, the random queue and a friend code keep their challenge; the Classificata has none.
  if ((mode === "queue" || mode === "lobby") && knownChallenge) return { mode, format: known, challenge: knownChallenge };
  if (mode === "queue" || mode === "lobby" || mode === "ranked") return { mode, format: known };
  if (mode === "conquest") return { mode, format: "classic" };
  return null;
}

export function readLastPlay(): LastPlay | null {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    return saved ? parseLastPlay(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function rememberLastPlay(play: LastPlay) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(play));
  } catch {
    // A convenience of this device: without storage Gioca suggests the first play.
  }
}

/** The team screen of a play, as the links of Gioca and the Classificata open it. */
export function lastPlayHref(play: LastPlay): string {
  const format = play.format === "classic" ? "" : `format=${play.format}`;
  const params =
    play.mode === "bot"
      ? [play.challenge ? `sfida=${play.challenge.id}` : "", format, `difficulty=${play.difficulty}`]
      : play.mode === "conquest"
        ? ["mode=conquest"]
        : [play.challenge ? `sfida=${play.challenge.id}` : "", `mode=${play.mode}`, format];
  return `/squadra/?${params.filter(Boolean).join("&")}`;
}

const MODE_NAMES: Record<MatchFormat, string> = {
  classic: "Classica",
  boss: "Grande Minaccia",
  triple: "Allarme Triplo",
  quadrant: "Quadrante",
  quadrant_shifting: "Quadrante",
};

/** The play in words: the mode, then how (grid, opponent). */
export function describeLastPlay(play: LastPlay): { title: string; detail: string } {
  const grid = play.format === "quadrant" ? "Griglia fissa · " : play.format === "quadrant_shifting" ? "Griglia mobile · " : "";
  const how =
    play.mode === "bot"
      ? `contro il bot ${DIFFICULTY_NAMES[play.difficulty]}`
      : play.mode === "queue"
        ? "amichevole, avversario casuale"
        : play.mode === "lobby"
          ? "amichevole, codice per un amico"
          : play.mode === "ranked"
            ? "Classificata, la Fama in gioco"
            : "Conquista, carte in palio";
  const detail = `${grid}${how}`;
  if ((play.mode === "bot" || play.mode === "queue" || play.mode === "lobby") && play.challenge) {
    return { title: play.challenge.title, detail: `Sfida a tema · ${MODE_NAMES[play.format]} ${how}` };
  }
  return { title: MODE_NAMES[play.format], detail: detail.charAt(0).toUpperCase() + detail.slice(1) };
}

/** A finished match as its result screen sees it (MatchView, BossView, TripleView, QuadrantView). */
export type PlayedMatch = {
  mode: MatchMode;
  /** Missing before the other modes existed: a Classica. */
  format?: MatchFormat;
  bot_difficulty: BotDifficulty | null;
  challenge?: { id: string; title: string } | null;
};

/**
 * What «Rivincita» and «Gioca ancora» open after a match: the same play again, never another
 * one (SPEC §11.2). The match says the mode, the grid, the bot and its level, the Classificata,
 * the Conquista and the Sfida a tema; this device says whether a friendly match came from the
 * random queue or from a friend code, when its last play is that match. Without it, the queue.
 */
export function rematchOf(match: PlayedMatch, remembered: LastPlay | null): LastPlay {
  const format = match.format ?? "classic";
  const challenge = match.challenge ? { challenge: { id: match.challenge.id, title: match.challenge.title } } : {};
  switch (match.mode) {
    case "bot":
      return { mode: "bot", format, difficulty: match.bot_difficulty ?? "easy", ...challenge };
    case "ranked":
      return { mode: "ranked", format };
    case "conquest":
      return { mode: "conquest", format: "classic" };
    case "friendly": {
      const same =
        (remembered?.mode === "queue" || remembered?.mode === "lobby") &&
        remembered.format === format &&
        (remembered.challenge?.id ?? null) === (match.challenge?.id ?? null);
      return { mode: same ? remembered.mode : "queue", format, ...challenge };
    }
  }
}

/** Why a play cannot be set off again now. */
export type PlayBlock =
  | { kind: "challenge_over" }
  | { kind: "challenge_daily_limit"; limit: number }
  | { kind: "conquest_locked"; completed: number }
  | { kind: "conquest_limit" };

/**
 * What stops a play now, or null when nothing known does: a Sfida a tema over, or with today's
 * matches used up; a Conquista still locked, or closed after today's lost cards. Unknown facts
 * (null: still loading) stop nothing: the team screen and the server check again. The play is
 * never swapped for another one: the player is told why (SPEC §11.2).
 */
export function playBlock(
  play: LastPlay,
  known: { now: number; challenges: readonly ChallengeFacts[] | null; conquest: ConquestStatus | null },
): PlayBlock | null {
  if (play.mode === "conquest") return known.conquest ? conquestBlock(known.conquest) : null;
  if (play.mode === "ranked" || !play.challenge || !known.challenges) return null;
  return challengeBlock(play.challenge.id, known.challenges, known.now);
}

/** What the player list of the Sfide a tema says of each (src/lib/challenges.ts). */
export type ChallengeFacts = Pick<Challenge, "id" | "starts_at" | "ends_at" | "daily_limit" | "plays_today">;

/**
 * A Sfida a tema over (or gone from the list: ended long ago, or switched off), or with today's
 * matches used up. One not yet begun is left to the server.
 */
export function challengeBlock(id: string, challenges: readonly ChallengeFacts[], now: number): PlayBlock | null {
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge || now >= Date.parse(challenge.ends_at)) return { kind: "challenge_over" };
  if (now < Date.parse(challenge.starts_at)) return null;
  return challenge.daily_limit !== null && challenge.plays_today >= challenge.daily_limit
    ? { kind: "challenge_daily_limit", limit: challenge.daily_limit }
    : null;
}

/** A Conquista still locked, or closed for the day after the most cards lost. */
export function conquestBlock(conquest: ConquestStatus): PlayBlock | null {
  if (!conquest.unlocked) return { kind: "conquest_locked", completed: conquest.completed_matches };
  return conquest.cards_lost_today >= balance.conquest.maxCardsLostPerDay ? { kind: "conquest_limit" } : null;
}

/** A block in words: `short` on Gioca's «Gioca ancora», `long` on the team screen. */
export function describePlayBlock(block: PlayBlock): { short: string; long: string } {
  const { unlockAfterMatches, unlockAtLevel, maxCardsLostPerDay } = balance.conquest;
  switch (block.kind) {
    case "challenge_over":
      return { short: "Sfida a tema finita", long: "Questa Sfida a tema non è più aperta." };
    case "challenge_daily_limit":
      return {
        short: `Partite di oggi finite (${block.limit}/${block.limit})`,
        long: `Hai giocato tutte le partite di oggi di questa sfida (${block.limit}/${block.limit}): torna dopo mezzanotte.`,
      };
    case "conquest_locked":
      return {
        short: `Conquista bloccata: ${block.completed}/${unlockAfterMatches} partite`,
        long: `La Conquista si sblocca dopo ${unlockAfterMatches} partite (${block.completed}/${unlockAfterMatches}) o al livello ${unlockAtLevel}.`,
      };
    case "conquest_limit":
      return {
        short: "Conquista: riapre a mezzanotte",
        long: `Oggi hai perso ${maxCardsLostPerDay} carte in Conquista: torna dopo mezzanotte.`,
      };
  }
}

/** The team screen «Rivincita» and «Gioca ancora» open after `match` (see rematchOf). */
export function rematchHref(match: PlayedMatch): string {
  return lastPlayHref(rematchOf(match, readLastPlay()));
}
