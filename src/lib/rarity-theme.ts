import type { CSSProperties } from "react";

type RarityLook = { name: string; rank: number; color: string };

const FOIL_FRAME = "conic-gradient(from 210deg, #ffd60a, #ff2e6c, #16c8ff, #2fd06e, #ffd60a)";
const FOIL_MIN_RANK = 5;

const LETTERS: Record<string, string> = { delta: "Δ", gamma: "Γ", beta: "Β", alfa: "Α", omega: "Ω" };

export const FACTION_COLORS: Record<string, string> = {
  heroes: "#16c8ff",
  villains: "#ff2e6c",
  neutrals: "#fff8e7",
};

export function isFoil(rarity: RarityLook): boolean {
  return rarity.rank >= FOIL_MIN_RANK;
}

/** Greek letter of a rarity; new rarities without a mapping show their initial. */
export function rarityLetter(rarity: RarityLook): string {
  return LETTERS[rarity.name.toLowerCase()] ?? rarity.name.charAt(0).toUpperCase();
}

export function rarityFrame(rarity: RarityLook): string {
  return isFoil(rarity) ? FOIL_FRAME : rarity.color;
}

/** Art background: the treatment grows with the rank, the color comes from the database. */
export function rarityArt(rarity: RarityLook): CSSProperties {
  const base = `color-mix(in srgb, ${rarity.color} 70%, black)`;
  if (isFoil(rarity)) {
    return {
      backgroundColor: rarity.color,
      backgroundImage: `repeating-conic-gradient(from 0deg at 50% 62%, ${rarity.color} 0 9deg, #ff8a00 9deg 18deg)`,
    };
  }
  if (rarity.rank >= 4) {
    return {
      backgroundColor: base,
      backgroundImage: "repeating-conic-gradient(from 0deg at 50% 62%, rgb(255 255 255 / 0.22) 0 9deg, transparent 9deg 18deg)",
    };
  }
  if (rarity.rank === 3) {
    return {
      backgroundColor: base,
      backgroundImage: "repeating-linear-gradient(112deg, transparent 0 10px, rgb(255 255 255 / 0.22) 10px 14px)",
    };
  }
  const dot = rarity.rank === 2 ? { radius: 2.2, size: 9 } : { radius: 1.6, size: 7 };
  return {
    backgroundColor: base,
    backgroundImage: `radial-gradient(circle, rgb(0 0 0 / 0.38) ${dot.radius}px, transparent ${dot.radius + 0.2}px)`,
    backgroundSize: `${dot.size}px ${dot.size}px`,
  };
}
