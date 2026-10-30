import { balance } from "@/config/balance";

// Mirrors level_for_xp() in the database, which is the authority: this only
// draws the progress bar on the profile.

/** Total XP needed to reach a level. */
export function xpForLevel(level: number): number {
  return balance.progression.levelXpBase * level * (level - 1);
}

/** Share of the current level already completed, from 0 to 1. */
export function levelProgress(xp: number, level: number): number {
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return Math.min(1, Math.max(0, (xp - start) / (end - start)));
}
