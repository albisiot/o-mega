// The round result for the thirteen powers of 20 November 2026 (SPEC §4.4): their family
// on the page, what the notes say, and how Logoramento's points show on the next card.

import { describe, expect, it } from "vitest";
import { chargeSource, isDistinctive, powerFamily } from "./effect-families";
import { emergencyPowerNotes } from "./emergency-powers";
import { foreseenBy, spiedBy, type MatchCard, type MatchRound } from "./match";
import { roundPlaysBefore, roundPowerNotes, wornDownBy } from "./round-powers";

const card = (code: string, params: Record<string, string | number>, name: string, id = "d1"): MatchCard => ({
  definition_id: id,
  code: "P001",
  name,
  faction: "heroes",
  flavor: "",
  art_url: null,
  stats: { FOR: 5, VEL: 5, RES: 5 },
  rarity: { code: "gamma", name: "Gamma", rank: 2, color: "#000" },
  power: { code, params, name, text: "" },
});
const plain = (name: string, id = "d9"): MatchCard => ({ ...card("x", {}, name, id), power: null });
const threat = { level: 2, abilities: ["FOR", "VEL"], modifier: null };
const calm = { carried: 0, lost: false, wonTie: false };

function round(n: number, mine: MatchCard, theirs: MatchCard, modifier: MatchRound["modifier"] = null): MatchRound {
  const play = { base: 0, bonus: 0, score: 5, highest: 5, auto_played: false };
  return {
    round: n,
    level: 1,
    modifier,
    threat: { name: "Minaccia", abilities: ["FOR"], flavor: "" },
    deadline_at: "",
    resolved: true,
    winner: "none",
    my_play: { ...play, instance_id: `i-${mine.definition_id}`, definition_id: mine.definition_id },
    opponent_play: { ...theirs, ...play },
    my_pending_instance_id: null,
    opponent_has_chosen: false,
  };
}

describe("the families of the new powers", () => {
  it("charges from the threat, the round or the rival", () => {
    for (const code of ["peak", "euphoria", "away", "twin", "match_point", "icebreaker", "even_score", "diminuendo"]) {
      expect(powerFamily(code)).toBe("charge");
    }
    expect(chargeSource("peak")).toBe("threat");
    expect(chargeSource("away")).toBe("threat");
    expect(chargeSource("icebreaker")).toBe("round");
    expect(chargeSource("diminuendo")).toBe("round");
    expect(chargeSource("twin")).toBe("rival");
  });

  it("Logoramento hits, Guastafeste stops, the three that show reveal", () => {
    expect(powerFamily("attrition")).toBe("strike");
    expect(powerFamily("spoiler")).toBe("stop");
    expect(["omen", "infiltrator", "oracle"].map(powerFamily)).toEqual(["reveal", "reveal", "reveal"]);
    expect(["attrition", "omen", "oracle"].every(isDistinctive)).toBe(true);
    expect(isDistinctive("infiltrator")).toBe(false);
  });
});

describe("what the screens say the powers showed", () => {
  it("the foreseen threats name their power, the full Veggente's none", () => {
    expect(foreseenBy({ seen_by: "Oracolo" })).toBe("Oracolo");
    expect(foreseenBy({ seen_by: "Veggente e Presagio" })).toBe("Veggente e Presagio");
    expect(foreseenBy({})).toBe("Veggente");
  });

  it("the characters seen: Infiltrato at the start, Spia after a round", () => {
    expect(spiedBy([{ round: 0 }])).toBe("Infiltrato");
    expect(spiedBy([{ round: 2 }, { round: 3 }])).toBe("Spia");
    expect(spiedBy([{ round: 2 }, { round: 0 }])).toBe("Infiltrato e Spia");
  });
});

describe("the notes of the new powers", () => {
  it("a power that adds points says how many", () => {
    const ice = card("icebreaker", { bonus: 3 }, "Rompighiaccio");
    const parts = { power: 3, carried: 0, pack: 0, modifier: 0, floor: 0 };
    expect(roundPowerNotes(ice, { bonus: 3 }, threat, { ...calm, parts }, true)[0]).toMatchObject({ effect: "+3", points: 3, code: "icebreaker" });
  });

  it("Logoramento waits for the next opposing card", () => {
    const worn = card("attrition", { malus: 2 }, "Logoramento");
    expect(roundPowerNotes(worn, { bonus: 0 }, threat, calm)[0]).toEqual({
      name: "Logoramento",
      effect: "−2 al prossimo rivale",
      active: true,
      timing: "after",
    });
  });

  it("the next opposing card shows the points it lost, unless the Logoramento was stopped", () => {
    const worn = card("attrition", { malus: 2 }, "Ruggine", "wo");
    const team = [{ ...plain("Mio", "m1"), instance_id: "i-m1" }, { ...plain("Secondo", "m2"), instance_id: "i-m2" }];
    const before = roundPlaysBefore([round(1, team[0], worn)], team, 2);
    const hit = wornDownBy(before, worn);
    expect(hit).toEqual({ points: 2, from: "Ruggine" });
    const notes = roundPowerNotes(plain("Secondo", "m2"), { bonus: 0 }, threat, { ...calm, wornDown: hit.points, wornDownFrom: hit.from }, true);
    expect(notes).toEqual([{ name: "Logoramento di Ruggine", effect: "−2", active: true, points: -2, code: "attrition", source: "worn" }]);

    // Silenzio della tomba in its round: it did nothing.
    const silent = roundPlaysBefore([round(1, team[0], worn, { code: "tomb_silence" })], team, 2);
    expect(wornDownBy(silent, worn).points).toBe(0);
    // An Annullatore against it.
    const stopper = { ...card("nullifier", {}, "Annullatore", "nu"), instance_id: "i-nu" };
    const nullified = roundPlaysBefore([round(1, stopper, worn)], [stopper, team[1]], 2);
    expect(wornDownBy(nullified, worn).points).toBe(0);
  });

  it("Guastafeste speaks only when the rival had a bonus to lose", () => {
    const spoiler = card("spoiler", {}, "Guastafeste");
    expect(roundPowerNotes(spoiler, { bonus: 0 }, threat, { ...calm, opponentSpoiled: 3 })[0]).toMatchObject({
      effect: "toglie +3 al rivale",
      active: true,
    });
    expect(roundPowerNotes(spoiler, { bonus: 0 }, threat, calm)[0].active).toBe(false);
  });

  it("Presagio, Infiltrato and Oracolo add nothing in the round they are played", () => {
    for (const code of ["omen", "infiltrator", "oracle"]) {
      expect(roundPowerNotes(card(code, {}, "Visione"), { bonus: 0 }, threat, calm)[0].active).toBe(false);
    }
  });

  it("in Emergenza the ones that need an opponent do nothing", () => {
    const play = { round: 2, level: 2, threat: { name: "Minaccia", abilities: ["FOR", "VEL"], flavor: "" }, bonus: 0, passed: true, parts: null, modifier: null };
    for (const [code, params] of [["twin", { bonus: 3 }], ["spoiler", {}], ["attrition", { malus: 2 }], ["infiltrator", {}]] as const) {
      expect(emergencyPowerNotes(card(code, params, "Prova"), play, [])[0].effect).toBe("senza avversario non agisce");
    }
  });
});
