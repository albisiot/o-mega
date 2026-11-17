// Classificata (SPEC §8.7): the Fama a ranked match moves, and the opponent the
// matchmaking finds when no person is free. That opponent plays with the usual
// bots of each mode; its strength follows the player's Fama, league by league.

import { characterStrength, type BotDifficulty } from "./bots.ts";
import { shuffle, type Rng } from "./rng.ts";
import type { Character } from "./types.ts";

/** Bot difficulties from 1 (Facile) to 4 (Super Pro), as the ladder numbers them. */
export const RANKED_DIFFICULTIES: readonly BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

/**
 * How the opponent plays at the start of a league; through the league it moves
 * towards the `...To` values, reached where the next league starts.
 */
export type RankedLadderStep = {
  /** Fama at which the league starts. */
  from: number;
  /** Bot difficulty at the start and at the end of the league, 1 (Facile) to 4 (Super Pro). */
  difficultyFrom: number;
  difficultyTo: number;
  /** Share of the strongest characters the team is drawn from, in percent (100: the whole catalog). */
  shareFrom: number;
  shareTo: number;
  /** The team is at most this percent as strong as the player's (0: no cap). */
  teamCap: number;
};

/** The Fama rules of SPEC §8.7 (balance.ts `ranked`). */
export type RankedFamaRules = {
  winPoints: number;
  lossPoints: number;
  /** Every this much Fama the opponent has more: one point more on a win, one less on a loss. */
  famaPerPoint: number;
  winMin: number;
  winMax: number;
  lossMin: number;
  lossMax: number;
  /** From this win in a row on, each win gives `streakBonus` more. */
  streakFrom: number;
  streakBonus: number;
  /** Below this Fama a loss takes nothing (the first league). */
  noLossBelow: number;
  /** Below this Fama a loss never takes the player under the start of their league. */
  floorsBelow: number;
};

/** The league a Fama is in: the last start at or below it. `starts` in increasing order. */
export function leagueStart(fama: number, starts: readonly number[]): number {
  let start = starts[0] ?? 0;
  for (const s of starts) if (fama >= s) start = s;
  return start;
}

/**
 * How much Fama a match moves for one side: positive on a win, negative or 0 on a loss,
 * 0 on a draw. `streak` counts the wins in a row before this match.
 */
export function rankedFamaChange(
  rules: RankedFamaRules,
  input: { fama: number; opponentFama: number; outcome: "win" | "draw" | "loss"; streak: number; leagueStarts: readonly number[] },
): number {
  const { fama, opponentFama, outcome, streak } = input;
  if (outcome === "draw") return 0;
  const shift = Math.trunc((opponentFama - fama) / rules.famaPerPoint);
  if (outcome === "win") {
    const gain = Math.min(rules.winMax, Math.max(rules.winMin, rules.winPoints + shift));
    return gain + (streak + 1 >= rules.streakFrom ? rules.streakBonus : 0);
  }
  if (fama < rules.noLossBelow) return 0;
  const loss = Math.min(rules.lossMax, Math.max(rules.lossMin, rules.lossPoints - shift));
  const floor = fama < rules.floorsBelow ? leagueStart(fama, input.leagueStarts) : 0;
  const taken = Math.min(loss, fama - floor);
  return taken > 0 ? -taken : 0;
}

/** Where a Fama sits in its league, from 0 (its start) to 1 (the next league's start). */
function leagueProgress(fama: number, ladder: readonly RankedLadderStep[]): { step: RankedLadderStep; t: number } {
  const steps = [...ladder].sort((x, y) => x.from - y.from);
  let index = 0;
  steps.forEach((s, i) => {
    if (fama >= s.from) index = i;
  });
  const step = steps[index];
  const next = steps[index + 1];
  const t = next ? Math.min(1, Math.max(0, (fama - step.from) / (next.from - step.from))) : 1;
  return { step, t };
}

/** The difficulty, team share and team cap of the opponent for a Fama. */
export function rankedGhostSettings(
  fama: number,
  ladder: readonly RankedLadderStep[],
  rng: Rng,
): { difficulty: BotDifficulty; share: number; teamCap: number } {
  const { step, t } = leagueProgress(fama, ladder);
  const level = step.difficultyFrom + (step.difficultyTo - step.difficultyFrom) * t;
  const low = Math.floor(level);
  const rank = Math.min(4, Math.max(1, rng() < level - low ? low + 1 : low));
  return {
    difficulty: RANKED_DIFFICULTIES[rank - 1],
    share: step.shareFrom + (step.shareTo - step.shareFrom) * t,
    teamCap: step.teamCap,
  };
}

export function teamStrength(team: readonly Character[]): number {
  return team.reduce((sum, character) => sum + characterStrength(character), 0);
}

/** Random teams tried to stay under a cap. */
const CAP_TRIES = 60;

/**
 * The opponent's team: distinct characters drawn from the strongest `share` percent
 * of the catalog. With a cap, a team at most that strong when one can be found;
 * otherwise the weakest of the teams tried.
 */
export function buildRankedGhostTeam(
  catalog: readonly Character[],
  size: number,
  share: number,
  cap: number | null,
  rng: Rng,
): Character[] {
  const distinct = [...new Map(catalog.map((character) => [character.definitionId, character])).values()];
  if (distinct.length < size) throw new Error("Not enough characters for a bot team");
  const strongest = [...distinct].sort((x, y) => characterStrength(y) - characterStrength(x));
  const poolSize = share >= 100 ? strongest.length : Math.max(size * 2, Math.round((strongest.length * share) / 100));
  const pool = strongest.slice(0, Math.min(strongest.length, poolSize));
  const draw = () => shuffle(rng, pool).slice(0, size);
  if (cap === null) return draw();

  const tried = Array.from({ length: CAP_TRIES }, draw);
  const fitting = tried.filter((team) => teamStrength(team) <= cap);
  if (fitting.length > 0) return fitting[Math.floor(rng() * fitting.length)];
  // Nothing in the pool is that weak: the weakest characters of the whole catalog, drawn at random.
  const weakest = shuffle(rng, strongest.slice(-size * 2)).slice(0, size);
  return [...tried, weakest].reduce((best, team) => (teamStrength(team) < teamStrength(best) ? team : best));
}

/** The opponent the matchmaking finds for a player with this Fama and this team. */
export function planRankedGhost(input: {
  fama: number;
  ladder: readonly RankedLadderStep[];
  catalog: readonly Character[];
  size: number;
  playerTeam: readonly Character[];
  rng: Rng;
}): { difficulty: BotDifficulty; team: Character[] } {
  const { difficulty, share, teamCap } = rankedGhostSettings(input.fama, input.ladder, input.rng);
  const cap = teamCap > 0 && input.playerTeam.length > 0 ? (teamStrength(input.playerTeam) * teamCap) / 100 : null;
  return { difficulty, team: buildRankedGhostTeam(input.catalog, input.size, share, cap, input.rng) };
}
