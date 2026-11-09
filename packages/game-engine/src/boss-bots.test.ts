import { describe, expect, it } from "vitest";
import { bossResult, resolveBossTurn, type BossState } from "./boss.ts";
import { bossBotView, chooseBossBotPlay, playBossBotTurn } from "./boss-bots.ts";
import { computeAbilityMeans, type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { mulberry32, randomInt, shuffle, type Rng } from "./rng.ts";
import { ABILITIES, bossState, character, FAMILIES, FRONTS } from "./test-fixtures.ts";
import type { Character } from "./types.ts";

/** 40 characters with uneven values, like the real catalog: a few peaks, many middling values. */
function catalog(seed = 1): Character[] {
  const rng = mulberry32(seed);
  return Array.from({ length: 40 }, (_, i) =>
    character(`c${i}`, Object.fromEntries(ABILITIES.map((a) => [a, Math.min(10, randomInt(rng, 6) + randomInt(rng, 6))]))),
  );
}

function knowledge(characters: Character[]): BotKnowledge {
  return { threatCatalog: FRONTS, families: FAMILIES, abilityMeans: computeAbilityMeans(characters), characters };
}

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "super_pro"];

describe("chooseBossBotPlay", () => {
  it("always chooses an available character and an existing front", () => {
    const characters = catalog();
    const rng = mulberry32(9);
    for (const difficulty of DIFFICULTIES) {
      let state: BossState = bossState(characters.slice(0, 5), characters.slice(5, 10));
      while (state.turns.length < 5) {
        const choice = chooseBossBotPlay(difficulty, bossBotView(state, "b", knowledge(characters)), rng);
        const available = state.teams.b.filter((c) => !state.turns.some((t) => t.plays.b.characterId === c.id));
        expect(available.map((c) => c.id)).toContain(choice.characterId);
        expect(choice.front).toBeGreaterThanOrEqual(0);
        expect(choice.front).toBeLessThan(5);
        state = playBossBotTurn({
          state,
          catalog: knowledge(characters),
          difficulty,
          playerSide: "a",
          playerChoice: null,
          rng,
        }).state;
      }
      expect(bossResult(state)).not.toBeNull();
    }
  });

  it("the bot sees only the opponent's characters already played", () => {
    const characters = catalog();
    const state = bossState(characters.slice(0, 5), characters.slice(5, 10));
    const view = bossBotView(state, "b", knowledge(characters));
    expect(view.opponentPool).toHaveLength(characters.length);
    expect(view.opponentHandSize).toBe(5);
    const after = resolveBossTurn(
      state,
      {
        a: { characterId: "c0", front: 0, autoPlayed: false },
        b: { characterId: "c5", front: 1, autoPlayed: false },
      },
      FAMILIES,
    ).state;
    const next = bossBotView(after, "b", knowledge(characters));
    expect(next.opponentPool.map((c) => c.id)).not.toContain("c0");
    expect(next.opponentHandSize).toBe(4);
  });

  it("Hard varies among near-equal moves", () => {
    const characters = catalog(4);
    const state = bossState(characters.slice(0, 5), characters.slice(5, 10));
    const view = bossBotView(state, "b", knowledge(characters));
    const rng = mulberry32(2);
    const moves = new Set(Array.from({ length: 40 }, () => {
      const c = chooseBossBotPlay("hard", view, rng);
      return `${c.characterId}:${c.front}`;
    }));
    expect(moves.size).toBeGreaterThan(1);
  });
});

/** A match between two bots with the same team; 1 if side a wins, 0.5 on a draw. */
function botMatch(rng: Rng, team: Character[], other: Character[], a: BotDifficulty, b: BotDifficulty, characters: Character[]): number {
  const values = shuffle(rng, [0, 1, 2, 3, 4]);
  // A table drawn like the real one: two hot fronts, then +1 and +2.
  let row: number[] = [0, 1, 2, 3, 4].map((f) => (values.indexOf(f) < 2 ? 2 : 1));
  const table = [row];
  for (let t = 1; t < 5; t++) {
    const extra = shuffle(rng, [0, 1, 2, 3, 4]).slice(0, 2);
    row = row.map((v, f) => v + 1 + (extra.includes(f) ? 1 : 0));
    table.push(row);
  }
  let state = bossState(team, other.map((c) => ({ ...c, id: `${c.id}-b` })), table);
  const k = knowledge(characters);
  while (state.turns.length < 5) {
    const choiceA = chooseBossBotPlay(a, bossBotView(state, "a", k), rng);
    const choiceB = chooseBossBotPlay(b, bossBotView(state, "b", k), rng);
    state = resolveBossTurn(state, { a: choiceA, b: choiceB }, FAMILIES).state;
  }
  const result = bossResult(state);
  return result === "a" ? 1 : result === "draw" ? 0.5 : 0;
}

describe("bot strength (mini simulation, fixed seed)", () => {
  it("Super Pro beats Easy with random teams", () => {
    const characters = catalog(7);
    const rng = mulberry32(2026);
    let score = 0;
    const matches = 60;
    for (let i = 0; i < matches; i++) {
      score += botMatch(rng, shuffle(rng, characters).slice(0, 5), shuffle(rng, characters).slice(0, 5), "super_pro", "easy", characters);
    }
    expect(score / matches).toBeGreaterThan(0.6);
  }, 30_000);
});
