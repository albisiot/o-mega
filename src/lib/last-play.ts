import type { BotDifficulty } from "@o-mega/game-engine";
import type { MatchFormat } from "@/lib/match";

/**
 * The last match the player set off from the team screen, kept on this device: Gioca's
 * «Gioca ancora» opens the same team screen again. A shortcut only: the server still checks
 * everything when the match starts (a locked Conquista, a match in progress...).
 */
export type LastPlay =
  | { mode: "bot"; format: MatchFormat; difficulty: BotDifficulty }
  | { mode: "queue" | "lobby" | "ranked"; format: MatchFormat }
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
  const { mode, format, difficulty } = value as Record<string, unknown>;
  if (!FORMATS.includes(format as MatchFormat)) return null;
  const known = format as MatchFormat;
  if (mode === "bot") {
    return DIFFICULTIES.includes(difficulty as BotDifficulty)
      ? { mode, format: known, difficulty: difficulty as BotDifficulty }
      : null;
  }
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
      ? [format, `difficulty=${play.difficulty}`]
      : play.mode === "conquest"
        ? ["mode=conquest"]
        : [`mode=${play.mode}`, format];
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
  return { title: MODE_NAMES[play.format], detail: detail.charAt(0).toUpperCase() + detail.slice(1) };
}
