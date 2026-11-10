import { describe, expect, it } from "vitest";
import { computeAbilityMeans, type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { mulberry32 } from "./rng.ts";
import { character, FAMILIES, threatCatalog, tripleState } from "./test-fixtures.ts";
import { isTripleFinished, isValidTriplePlacement, tripleHand, tripleResult } from "./triple.ts";
import { chooseTripleBotPlacement, playTripleBotRound, tripleBotView } from "./triple-bots.ts";
import type { Character } from "./types.ts";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

function catalog(): Character[] {
  const rng = mulberry32(21);
  return Array.from({ length: 40 }, (_, i) =>
    character(`c${i}`, Object.fromEntries(["FOR", "VEL", "RES", "INT", "VOL", "PER"].map((a) => [a, Math.floor(rng() * 11)]))),
  ).map((c) => ({ ...c, definitionId: c.id }));
}

function knowledge(characters: Character[]): BotKnowledge {
  return { characters, threatCatalog: threatCatalog(), families: FAMILIES, abilityMeans: computeAbilityMeans(characters) };
}

describe("Allarme Triplo bots", () => {
  it("place their own hand, one card per threat, at every difficulty", () => {
    const cards = catalog();
    const state = tripleState(cards.slice(0, 9), cards.slice(9, 18));
    for (const difficulty of DIFFICULTIES) {
      const placement = chooseTripleBotPlacement(difficulty, tripleBotView(state, "b", knowledge(cards)), mulberry32(4));
      expect(isValidTriplePlacement(state, "b", placement.characterIds)).toBe(true);
    }
  });

  it("see only their own hand, never the opponent's", () => {
    const cards = catalog();
    const state = tripleState(cards.slice(0, 9), cards.slice(9, 18));
    const view = tripleBotView(state, "b", knowledge(cards));
    expect(view.hand.map((c) => c.id)).toEqual(tripleHand(state, "b").map((c) => c.id));
    // Nothing played yet: the opponent may hold any character of the catalog.
    expect(view.opponentPool).toHaveLength(cards.length);
  });

  it("put the specialist on the threat it fits (Medio)", () => {
    const deckB = [character("s", { FOR: 1, VEL: 1, RES: 1, INT: 10, VOL: 10, PER: 10 }), character("f", { FOR: 10, VEL: 1, RES: 1 }), character("v", { VEL: 9, RES: 9, FOR: 1 })];
    const all = [...deckB, ...catalog()];
    const state = tripleState(catalog().slice(0, 9), [...deckB, ...catalog().slice(20, 26)]);
    const placement = chooseTripleBotPlacement("medium", tripleBotView(state, "b", knowledge(all)), mulberry32(1));
    expect(placement.characterIds).toEqual(["f", "v", "s"]);
  });

  it("play a whole match to a result", () => {
    const cards = catalog();
    for (const difficulty of DIFFICULTIES) {
      let state = tripleState(cards.slice(0, 9), cards.slice(9, 18));
      const rng = mulberry32(9);
      while (!isTripleFinished(state)) {
        const hand = tripleHand(state, "a").map((c) => c.id);
        state = playTripleBotRound({ state, catalog: knowledge(cards), difficulty, playerSide: "a", playerChoice: hand, rng }).state;
      }
      expect(state.rounds).toHaveLength(3);
      expect(tripleResult(state)).not.toBe(null);
    }
  });
});
