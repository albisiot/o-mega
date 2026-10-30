import { balance } from "@/config/balance";
import type { MatchView } from "@/lib/match";

// Mirrors level_for_xp() in the database, which is the authority: this only
// draws the progress bar on the profile.

/** Total XP needed to reach a level. */
export function xpForLevel(level: number): number {
  return balance.progression.levelXpBase * level * (level - 1);
}

/** XP earned in a finished match, for display: finish_match() is the authority. */
export function matchXp(view: Pick<MatchView, "mode" | "result" | "end_reason">): number {
  const { pvpWinXp, pvpParticipationXp, botWinXp, botParticipationXp } = balance.progression;
  if (!view.result) return 0;
  if (view.end_reason === "forfeit" && view.result !== "win") return 0; // whoever leaves earns nothing
  if (view.mode === "bot") return view.result === "win" ? botWinXp : botParticipationXp;
  return view.result === "win" ? pvpWinXp : pvpParticipationXp;
}

/** Share of the current level already completed, from 0 to 1. */
export function levelProgress(xp: number, level: number): number {
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return Math.min(1, Math.max(0, (xp - start) / (end - start)));
}
