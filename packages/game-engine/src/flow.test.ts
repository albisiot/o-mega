import { describe, expect, it } from "vitest";
import { computeAbilityMeans } from "./bots.ts";
import { planBotMatch, playBotRound, playPvpRound, type BotMatchCatalog } from "./flow.ts";
import { availableCharacters, roundsWon } from "./match.ts";
import { mulberry32, pickOne } from "./rng.ts";
import { ABILITIES, character, FAMILIES, RULES, threatCatalog } from "./test-fixtures.ts";
import { isValidLevelSequence } from "./threats.ts";
import type { MatchState } from "./types.ts";

const characters = Array.from({ length: 24 }, (_, i) =>
  character(`c${i}`, { [ABILITIES[i % 12]]: 10, [ABILITIES[(i + 5) % 12]]: 8 }, null, 3 + (i % 3)),
);
const catalog: BotMatchCatalog = {
  characters,
  threatCatalog: threatCatalog(),
  families: FAMILIES,
  abilityMeans: computeAbilityMeans(characters),
};
const playerTeam = characters.slice(0, 5).map((c) => ({ ...c, id: `inst-${c.id}` }));

function startMatch(seed: number, difficulty: "easy" | "medium" | "hard"): MatchState {
  const plan = planBotMatch({ rules: RULES, catalog, difficulty, rng: mulberry32(seed) });
  return { rules: RULES, threats: plan.threats, teams: { a: playerTeam, b: plan.botTeam }, rounds: [] };
}

describe("planBotMatch", () => {
  it("draws valid threats and a full bot team", () => {
    const plan = planBotMatch({ rules: RULES, catalog, difficulty: "hard", rng: mulberry32(5) });
    expect(isValidLevelSequence(plan.threats.map((t) => t.level), RULES.threatLevels)).toBe(true);
    expect(plan.botTeam).toHaveLength(5);
  });
});

describe("playBotRound", () => {
  it("plays whole matches to a consistent result for every difficulty", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const rng = mulberry32(seed * 7);
        let state = startMatch(seed, difficulty);
        let outcome = null;
        for (let round = 1; round <= 5 && !outcome; round++) {
          const choice = pickOne(rng, availableCharacters(state, "a")).id;
          const played = playBotRound({ state, catalog, difficulty, playerSide: "a", playerChoice: choice, rng });
          state = played.state;
          if (played.finished) outcome = played.result;
        }
        expect(outcome).not.toBeNull();
        const won = roundsWon(state);
        if (state.rounds.length < 5) expect(Math.max(won.a, won.b)).toBe(3);
        // The bot never fields a character twice.
        const botIds = state.rounds.map((r) => r.plays.b.characterId);
        expect(new Set(botIds).size).toBe(botIds.length);
      }
    }
  });

  it("auto-plays a random available character when the timer expired", () => {
    const state = startMatch(3, "medium");
    const played = playBotRound({ state, catalog, difficulty: "medium", playerSide: "a", playerChoice: null, rng: mulberry32(1) });
    expect(played.round.plays.a.autoPlayed).toBe(true);
    expect(playerTeam.map((c) => c.id)).toContain(played.round.plays.a.characterId);
  });

  it("rejects a character the player does not have available", () => {
    const state = startMatch(3, "medium");
    expect(() =>
      playBotRound({ state, catalog, difficulty: "medium", playerSide: "a", playerChoice: "someone-else", rng: mulberry32(1) }),
    ).toThrow(/character_not_available/);
  });

  it("resolves a PvP round with both choices, or plays randomly for a missing one", () => {
    const opponents = characters.slice(10, 15).map((c) => ({ ...c, id: `opp-${c.id}` }));
    const plan = planBotMatch({ rules: RULES, catalog, difficulty: "easy", rng: mulberry32(8) });
    const state: MatchState = { rules: RULES, threats: plan.threats, teams: { a: playerTeam, b: opponents }, rounds: [] };

    const both = playPvpRound({
      state,
      choices: { a: playerTeam[0].id, b: opponents[2].id },
      families: FAMILIES,
      rng: mulberry32(1),
    });
    expect(both.round.plays.a).toMatchObject({ characterId: playerTeam[0].id, autoPlayed: false });
    expect(both.round.plays.b).toMatchObject({ characterId: opponents[2].id, autoPlayed: false });

    const missing = playPvpRound({ state, choices: { a: playerTeam[1].id, b: null }, families: FAMILIES, rng: mulberry32(2) });
    expect(missing.round.plays.b.autoPlayed).toBe(true);
    expect(opponents.map((c) => c.id)).toContain(missing.round.plays.b.characterId);

    expect(() =>
      playPvpRound({ state: both.state, choices: { a: playerTeam[0].id, b: null }, families: FAMILIES, rng: mulberry32(3) }),
    ).toThrow(/character_not_available/);
  });

  it("decides the bot move without looking at the player's choice", () => {
    const state = startMatch(4, "hard");
    const [first, second] = availableCharacters(state, "a");
    const botWith = (choice: string) =>
      playBotRound({ state, catalog, difficulty: "hard", playerSide: "a", playerChoice: choice, rng: mulberry32(99) }).round
        .plays.b.characterId;
    expect(botWith(first.id)).toBe(botWith(second.id));
  });
});
