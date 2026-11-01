export type CardEffect = "flash" | "tilt" | "holo" | "aura" | "bolts" | "embers" | "glitch";

// Purely visual and tied to the rank, like the frames in rarity-theme: rarity never means power.
const EFFECTS_BY_RANK: { minRank: number; effects: CardEffect[] }[] = [
  { minRank: 4, effects: ["holo", "tilt"] },
  { minRank: 3, effects: ["flash", "tilt"] },
  { minRank: 2, effects: ["flash"] },
];

// Small cards appear by the dozen on one screen: only the rarest move, and they do not react to touch.
const SMALL_MIN_RANK = 4;

/** Each Omega character has an effect of its own, on top of those of its rank. */
const SIGNATURE_EFFECTS: Record<string, CardEffect> = {
  P057: "aura",
  P058: "bolts",
  P059: "glitch",
  P060: "embers",
  P080: "aura",
  P092: "aura",
  P104: "glitch",
};

export function cardEffects(card: { code?: string; rarity: { rank: number } }, size: "lg" | "sm"): CardEffect[] {
  if (size === "sm") return card.rarity.rank >= SMALL_MIN_RANK ? ["holo"] : [];
  const effects = EFFECTS_BY_RANK.find(({ minRank }) => card.rarity.rank >= minRank)?.effects ?? [];
  const signature = card.code ? SIGNATURE_EFFECTS[card.code] : undefined;
  return signature ? [...effects, signature] : effects;
}
