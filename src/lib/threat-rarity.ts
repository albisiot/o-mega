// The rarity tiers of the rare threats (SPEC §5.15), as the server sends them.

import type { CSSProperties } from "react";

export type ThreatRarity = {
  code: string;
  name: string;
  rank: number;
  color: string;
  /** A threat of this tier turns up once in `one_in` matches; 0: never. */
  one_in: number;
};

const thousands = new Intl.NumberFormat("it-IT");

/** "circa 1 partita su 5.000". */
export function oddsText(oneIn: number): string {
  return oneIn > 0 ? `circa 1 partita su ${thousands.format(oneIn)}` : "per ora non esce";
}

/** "Minaccia Apocalittica". */
export function rarityTitle(rarity: Pick<ThreatRarity, "name">): string {
  return `Minaccia ${rarity.name}`;
}

/** The glow of a level tile or a panel of a rare threat: its tier's colour. */
export function rarityGlow(rarity: Pick<ThreatRarity, "color"> | null | undefined): CSSProperties | undefined {
  if (!rarity) return undefined;
  return { boxShadow: `0 0 0 3px ${rarity.color}, 0 0 14px 2px ${rarity.color}` };
}

/** A level as the sequence shows it: Livello ignoto hides it until its round. */
export function levelText(level: number | null | undefined): string {
  return level === null || level === undefined ? "?" : String(level);
}

/** The levels a power may read (Grande prova): the hidden ones are left out. */
export function knownLevels(levels: readonly (number | null)[]): number[] {
  return levels.filter((level): level is number => level !== null);
}
