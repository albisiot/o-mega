import { describe, expect, it } from "vitest";
import {
  autoRaidPlacement,
  drawRaidMoves,
  isRaidFinished,
  isValidRaidMoveSequence,
  isValidRaidPlacement,
  percentOf,
  playRaidRound,
  raidAttack,
  raidContext,
  raidCurrentRound,
  raidDefenses,
  raidHand,
  raidResult,
  raidRoundOutcome,
  raidVita,
  raidVitaMax,
  resolveRaidRound,
  type RaidMove,
  type RaidRules,
  type RaidState,
} from "./raid.ts";
import { mulberry32 } from "./rng.ts";
import { character, FAMILIES, threat } from "./test-fixtures.ts";
import type { Character, Power, Threat } from "./types.ts";

const power = (code: string, params: Record<string, string | number> = {}): Power => ({ code, params });

const RULES: RaidRules = {
  rounds: 5,
  squadSize: 6,
  defenses: 3,
  targets: { 1: 7, 2: 13, 3: 18, 4: 23, 5: 28, 6: 32 },
  attackFactor: { 2: 200, 3: 285, 4: 360 },
  vitaFactor: { 2: 200, 3: 285, 4: 360 },
  vitaBase: 10,
  heavyDefenses: 2,
  regenPercent: 10,
  exposedMax: 1,
  heavyMax: 2,
};

/** Five threats: levels 1, 2, 3, 4, 5. */
const THREATS: Threat[] = [
  threat("t1", ["FOR"]),
  threat("t2", ["VEL", "RES"]),
  threat("t3", ["INT", "VOL", "PER"]),
  threat("t4", ["ENE", "MAG", "PSI", "COM"]),
  threat("t5", ["FOR", "VEL", "RES", "INT", "VOL"]),
];

/** Six characters with every value at `base`. */
function squad(prefix: string, base = 4): Character[] {
  return Array.from({ length: 6 }, (_, i) => character(`${prefix}${i}`, {}, null, base));
}

function newRaid(
  a: Character[] = squad("a"),
  b: Character[] = squad("b"),
  moves: RaidMove[] = ["plain", "plain", "plain", "plain", "plain"],
  threats: Threat[] = THREATS,
): RaidState {
  return {
    rules: RULES,
    boss: { forzaPercent: 100, vitaPercent: 100 },
    players: [
      { id: "A", squad: a },
      { id: "B", squad: b },
    ],
    threats,
    moves,
    records: [],
  };
}

const play = (characterId: string) => ({ characterId, autoPlayed: false });

describe("Caccia grossa: numbers", () => {
  it("scales the Attack by the players and the Strength, to the nearest integer", () => {
    expect(raidAttack(RULES, 3, 2, 100)).toBe(36);
    expect(raidAttack(RULES, 3, 3, 100)).toBe(51); // 51.3
    expect(raidAttack(RULES, 1, 4, 100)).toBe(25); // 25.2
    expect(raidAttack(RULES, 4, 3, 100)).toBe(66); // 65.55
    expect(raidAttack(RULES, 5, 2, 120)).toBe(67); // 67.2
    expect(() => raidAttack(RULES, 3, 5, 100)).toThrow();
  });

  it("gives the Boss a Life by players, Strength and its own Life", () => {
    expect(raidVitaMax(RULES, 2, { forzaPercent: 100, vitaPercent: 100 })).toBe(20);
    expect(raidVitaMax(RULES, 3, { forzaPercent: 100, vitaPercent: 100 })).toBe(29); // 28.5
    expect(raidVitaMax(RULES, 4, { forzaPercent: 85, vitaPercent: 120 })).toBe(37); // 36.72
  });

  it("rounds a share to the nearest integer, halves up", () => {
    expect(percentOf(30, 75)).toBe(23); // 22.5
    expect(percentOf(60, 250)).toBe(150);
    expect(percentOf(10, 50)).toBe(5);
  });
});

describe("Caccia grossa: a round", () => {
  it("sums the cards; what goes beyond the Attack is damage", () => {
    const state = newRaid(squad("a", 10), squad("b", 10));
    // Level 1, Attack 14: 10 + 10 = 20, damage 6.
    const { record, state: next } = resolveRaidRound(state, { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(record).toMatchObject({ attack: 14, total: 20, held: true, damage: 6, defensesLost: 0, vita: 14, defenses: 3 });
    expect(raidVita(next)).toBe(14);
    expect(raidCurrentRound(next)?.round).toBe(2);
  });

  it("loses a Defence below the Attack, without damage", () => {
    const state = newRaid(squad("a", 3), squad("b", 3));
    const { record } = resolveRaidRound(state, { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(record).toMatchObject({ total: 6, held: false, damage: 0, defensesLost: 1, defenses: 2, vita: 20 });
  });

  it("holds exactly at the Attack, without damage", () => {
    const state = newRaid(squad("a", 7), squad("b", 7));
    const { record } = resolveRaidRound(state, { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(record).toMatchObject({ total: 14, held: true, damage: 0, defensesLost: 0 });
  });

  it("Colpo pesante takes two Defences, Corazza halves the damage, Punto scoperto doubles it", () => {
    const heavy = resolveRaidRound(newRaid(squad("a", 3), squad("b", 3), ["heavy", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(heavy.record).toMatchObject({ defensesLost: 2, defenses: 1 });
    const armor = resolveRaidRound(newRaid(squad("a", 10), squad("b", 9), ["armor", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(armor.record).toMatchObject({ total: 19, damage: 2 }); // 5 / 2
    const exposed = resolveRaidRound(newRaid(squad("a", 10), squad("b", 9), ["exposed", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(exposed.record).toMatchObject({ total: 19, damage: 10 });
  });

  it("Rigenerazione gives back a tenth of the Life when the Boss takes no damage, never above the whole", () => {
    const moves: RaidMove[] = ["plain", "regen", "regen", "plain", "plain"];
    let state = newRaid(squad("a", 10), squad("b", 10), moves);
    state = resolveRaidRound(state, { A: play("a0"), B: play("b0") }, FAMILIES).state; // Life 20 → 14
    // Level 2, Attack 26: 6 + 6 = 12 per card... the cards with 3 everywhere make 12, below.
    const weak = { ...state, players: state.players.map((p) => ({ ...p, squad: p.squad.map((c, i) => (i === 1 ? character(c.id, {}, null, 3) : c)) })) };
    const { record, state: after } = resolveRaidRound(weak, { A: play("a1"), B: play("b1") }, FAMILIES);
    expect(record).toMatchObject({ held: false, damage: 0, healed: 2, vita: 16 });
    // Full Life: nothing to give back.
    const full = resolveRaidRound(newRaid(squad("a", 3), squad("b", 3), ["plain", "regen", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    const again = resolveRaidRound(full.state, { A: play("a1"), B: play("b1") }, FAMILIES);
    expect(again.record.healed).toBe(0);
    expect(after.records).toHaveLength(2);
  });

  it("Bersaglio halves the highest card only (the first by seat on a tie)", () => {
    const a = squad("a", 10);
    const b = squad("b", 6);
    const { record } = resolveRaidRound(newRaid(a, b, ["target", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(record.plays.map((p) => p.counted)).toEqual([5, 6]);
    expect(record.total).toBe(11);
    const tie = resolveRaidRound(newRaid(squad("a", 8), squad("b", 8), ["target", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(tie.record.plays.map((p) => p.counted)).toEqual([4, 8]);
  });

  it("an Annullatore of the team cancels a move against the team, not Punto scoperto", () => {
    const a = squad("a", 10);
    a[0] = character("a0", {}, power("nullifier"), 10);
    const heavy = resolveRaidRound(newRaid(squad("a", 3).map((c, i) => (i === 0 ? character("a0", {}, power("nullifier"), 3) : c)), squad("b", 3), ["heavy", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(heavy.record).toMatchObject({ cancelled: true, defensesLost: 1 });
    const armor = resolveRaidRound(newRaid(a, squad("b", 9), ["armor", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(armor.record).toMatchObject({ cancelled: true, damage: 5 });
    const exposed = resolveRaidRound(newRaid(a, squad("b", 9), ["exposed", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(exposed.record).toMatchObject({ cancelled: false, damage: 10 });
    const delayed = squad("a", 10);
    delayed[0] = character("a0", {}, power("delayed_nullifier"), 10);
    const target = resolveRaidRound(newRaid(delayed, squad("b", 9), ["target", "plain", "plain", "plain", "plain"]), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(target.record).toMatchObject({ cancelled: true, total: 19 });
  });

  it("only the strongest Sabotatore lowers the Attack, and the damage counts from there", () => {
    // Level 3, round 3: Attack 36. Two Sabotatori of 1 and 2: the Attack drops by 2 × 3 = 6.
    let state = newRaid(squad("a", 7), squad("b", 7));
    state = resolveRaidRound(state, { A: play("a0"), B: play("b0") }, FAMILIES).state;
    state = resolveRaidRound(state, { A: play("a1"), B: play("b1") }, FAMILIES).state;
    const a = state.players[0].squad.map((c, i) => (i === 2 ? character("a2", {}, power("sabotage", { malus: 1 }), 6) : c));
    const b = state.players[1].squad.map((c, i) => (i === 2 ? character("b2", {}, power("sabotage", { malus: 2 }), 6) : c));
    const saboteurs = { ...state, players: [{ id: "A", squad: a }, { id: "B", squad: b }] };
    const { record } = resolveRaidRound(saboteurs, { A: play("a2"), B: play("b2") }, FAMILIES);
    expect(record).toMatchObject({ attack: 36, effectiveAttack: 30, required: 30, total: 36, held: true, damage: 6 });
  });

  it("Implacabile holds a point short, once, without damage", () => {
    const a = squad("a", 6);
    a[0] = character("a0", {}, power("relentless"), 6);
    const b = squad("b", 6);
    b[0] = character("b0", {}, power("relentless"), 7);
    // Level 1, Attack 14: 6 + 7 = 13 holds, one point short.
    const { record } = resolveRaidRound(newRaid(a, b), { A: play("a0"), B: play("b0") }, FAMILIES);
    expect(record).toMatchObject({ required: 13, total: 13, held: true, damage: 0, defensesLost: 0 });
  });

  it("Legame counts the player's own squad, not the team", () => {
    const a = squad("a").map((c) => ({ ...c, faction: "heroes" }));
    a[0] = { ...character("a0", {}, power("bond", { bonus: 1 })), faction: "heroes" };
    const b = squad("b").map((c) => ({ ...c, faction: "heroes" }));
    const state = newRaid(a, b);
    expect(raidContext(state, "A", FAMILIES).team).toHaveLength(6);
    const outcome = raidRoundOutcome(state, { A: play("a0") }, FAMILIES);
    // 4 + 5 heroes beside it in its own squad.
    expect(outcome.plays[0].total).toBe(9);
  });
});

describe("Caccia grossa: the end", () => {
  it("wins as soon as the Life is gone", () => {
    const state = newRaid(squad("a", 10), squad("b", 10));
    let s = state;
    for (let round = 0; round < 5 && !isRaidFinished(s); round++) s = resolveRaidRound(s, { A: play(`a${round}`), B: play(`b${round}`) }, FAMILIES).state;
    expect(raidResult(s)).toBe("won");
    expect(s.records.length).toBeLessThan(5);
    expect(raidVita(s)).toBe(0);
  });

  it("loses when the Defences are gone", () => {
    let s = newRaid(squad("a", 1), squad("b", 1));
    for (let round = 0; round < 3; round++) s = resolveRaidRound(s, { A: play(`a${round}`), B: play(`b${round}`) }, FAMILIES).state;
    expect(raidDefenses(s)).toBe(0);
    expect(raidResult(s)).toBe("lost");
    expect(isValidRaidPlacement(s, "A", "a4")).toBe(false);
  });

  it("loses when the Boss stands after the last round", () => {
    // Each card makes exactly one player's share of its round: the team holds every round, without damage.
    const exactCard = (id: string, t: Threat, share: number): Character =>
      character(
        id,
        Object.fromEntries(t.abilities.map((ability, k) => [ability, Math.floor(share / t.abilities.length) + (k < share % t.abilities.length ? 1 : 0)])),
        null,
        0,
      );
    const exact = (prefix: string) => [...THREATS.map((t, i) => exactCard(`${prefix}${i}`, t, RULES.targets[t.level])), character(`${prefix}5`, {}, null, 0)];
    let s = newRaid(exact("a"), exact("b"));
    for (let round = 0; round < 5; round++) s = resolveRaidRound(s, { A: play(`a${round}`), B: play(`b${round}`) }, FAMILIES).state;
    expect(s.records.every((r) => r.held)).toBe(true);
    expect(raidResult(s)).toBe("lost");
  });
});

describe("Caccia grossa: the cards the server puts down", () => {
  it("reaches the Attack wasting least when the others fall short", () => {
    const a = [3, 5, 8, 10, 2, 1].map((v, i) => character(`a${i}`, {}, null, v));
    const state = newRaid(a, squad("b", 6));
    // Attack 14, B puts 6: A needs 8 → the card with 8.
    const pick = autoRaidPlacement(state, "A", { B: play("b0") }, FAMILIES, mulberry32(1));
    expect(pick).toEqual({ characterId: "a2", autoPlayed: true });
  });

  it("otherwise plays the card worth least later", () => {
    const a = [3, 5, 8, 10, 2, 1].map((v, i) => character(`a${i}`, {}, null, v));
    const state = newRaid(a, squad("b", 20));
    // B alone holds: A spends its weakest card.
    expect(autoRaidPlacement(state, "A", { B: play("b0") }, FAMILIES, mulberry32(1)).characterId).toBe("a5");
    // Nobody reaches: the weakest again.
    const hopeless = newRaid(a, squad("b", 0));
    const short = { ...hopeless, threats: [threat("t5", ["FOR", "VEL", "RES", "INT", "VOL"]), ...THREATS.slice(1)] };
    expect(autoRaidPlacement(short, "A", { B: play("b0") }, FAMILIES, mulberry32(1)).characterId).toBe("a5");
  });

  it("puts down the missing cards and resolves the round", () => {
    const state = newRaid(squad("a", 10), squad("b", 10));
    const played = playRaidRound({ state, choices: { A: "a3", B: null }, families: FAMILIES, rng: mulberry32(2) });
    expect(played.record.plays.map((p) => [p.player, p.autoPlayed])).toEqual([
      ["A", false],
      ["B", true],
    ]);
    expect(raidHand(played.state, "A").map((c) => c.id)).not.toContain("a3");
    expect(() => playRaidRound({ state, choices: { A: "b0", B: null }, families: FAMILIES, rng: mulberry32(2) })).toThrow("invalid_placement");
  });
});

describe("Caccia grossa: the Boss's moves", () => {
  it("keeps the rules of a sequence", () => {
    const rules = { exposedMax: 1, heavyMax: 2 };
    expect(isValidRaidMoveSequence(["plain", "heavy", "plain", "heavy", "exposed"], rules)).toBe(true);
    expect(isValidRaidMoveSequence(["regen", "plain"], rules)).toBe(false);
    expect(isValidRaidMoveSequence(["heavy", "heavy"], rules)).toBe(false);
    expect(isValidRaidMoveSequence(["exposed", "plain", "exposed"], rules)).toBe(false);
    expect(isValidRaidMoveSequence(["heavy", "plain", "heavy", "plain", "heavy"], rules)).toBe(false);
  });

  it("draws sequences that keep them, from the Boss's repertoire", () => {
    const rng = mulberry32(7);
    const repertoire: RaidMove[] = ["heavy", "armor", "regen", "target", "exposed"];
    for (let i = 0; i < 200; i++) {
      const moves = drawRaidMoves(rng, repertoire, 5, RULES);
      expect(moves).toHaveLength(5);
      expect(isValidRaidMoveSequence(moves, RULES)).toBe(true);
      expect(moves.every((m) => m === "plain" || repertoire.includes(m))).toBe(true);
    }
    expect(drawRaidMoves(rng, [], 5, RULES)).toEqual(["plain", "plain", "plain", "plain", "plain"]);
  });
});
