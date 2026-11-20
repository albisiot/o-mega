// The round result for the twenty-two powers of 20 November 2026, second batch (SPEC §4.4):
// their family on the page, what the notes say, and the points the rule powers move.

import { describe, expect, it } from "vitest";
import { toCharacter, type MatchCard } from "./match";
import { chargeSource, isDistinctive, powerFamily } from "./effect-families";
import { emergencyPowerNotes } from "./emergency-powers";
import { calmedBy, resultPowers, roundPowerNotes, rulePowerOutcome } from "./round-powers";

const FAMILIES = { FOR: "body", VEL: "body", INT: "mind", ENE: "power", MAG: "power" };
const card = (code: string | null, params: Record<string, string | number> = {}, name = "Prova", stats: Record<string, number> = {}): MatchCard => ({
  definition_id: name,
  code: "P001",
  name,
  faction: "heroes",
  flavor: "",
  art_url: null,
  stats: { FOR: 5, VEL: 5, INT: 5, ENE: 5, MAG: 5, ...stats },
  rarity: { code: "gamma", name: "Gamma", rank: 2, color: "#000" },
  power: code ? { code, params, name, text: "" } : null,
});
const threat = { level: 2, abilities: ["FOR", "VEL"], modifier: null };
const calm = { carried: 0, lost: false, wonTie: false };
const engineThreat = { id: "round", ...threat };
const ch = (c: MatchCard) => toCharacter(c, c.definition_id);

describe("the families of the new powers", () => {
  it("puts each one where it acts", () => {
    expect(["patience", "hunter", "rainbow", "steady", "gamble", "vampire", "thief", "joker", "negative_self", "single_force", "duelist"].map(powerFamily)).toEqual(
      Array(11).fill("charge"),
    );
    expect(["rival_frost", "rival_all_or_nothing", "rival_price", "rival_duel"].map(powerFamily)).toEqual(Array(4).fill("strike"));
    expect([powerFamily("upset"), powerFamily("wall"), powerFamily("calm"), powerFamily("abyss_next"), powerFamily("phoenix")]).toEqual([
      "tiebreak",
      "tiebreak",
      "stop",
      "forward",
      "forward",
    ]);
    expect([powerFamily("ambush"), powerFamily("tracker")]).toEqual(["reveal", "reveal"]);
    expect([chargeSource("patience"), chargeSource("hunter"), chargeSource("rainbow"), chargeSource("joker")]).toEqual(["round", "rival", "team", "threat"]);
    expect(isDistinctive("vampire") && isDistinctive("rival_frost") && !isDistinctive("joker")).toBe(true);
  });
});

describe("the rule powers between two cards", () => {
  it("Gelo: the victim's note takes the points, the attacker tells what it took", () => {
    const frost = { ...card("rival_frost", { cap: 8 }, "Brina"), power: { code: "rival_frost", params: { cap: 8 }, name: "Gelo", text: "" } };
    const victim = card(null, {}, "Talos", { FOR: 10, VEL: 9 });
    const hit = rulePowerOutcome(ch(victim), ch(frost), engineThreat, { families: FAMILIES, played: [] }, { rival: frost });
    expect(hit.rules?.rival).toBe(-3);
    const notes = roundPowerNotes(victim, { bonus: 0 }, threat, { ...calm, ...hit }, true);
    expect(notes).toEqual([{ name: "Gelo di Brina", effect: "−3", active: true, points: -3, code: "rival_frost", source: "worn" }]);
    const dealt = rulePowerOutcome(ch(frost), ch(victim), engineThreat, { families: FAMILIES, played: [] }, { rival: victim });
    expect(roundPowerNotes(frost, { bonus: 0 }, threat, { ...calm, ...dealt })[0]).toMatchObject({ effect: "−3 alle abilità rivali", active: true });
  });

  it("Jolly, Negativo: the points of the own rule", () => {
    const joker = card("joker", { max_gain: 10 }, "Jolly", { FOR: 2, VEL: 6, MAG: 9 });
    const own = rulePowerOutcome(ch(joker), null, engineThreat, { families: FAMILIES, played: [] }, {});
    expect(roundPowerNotes(joker, { bonus: 0 }, threat, { ...calm, ...own })[0]).toEqual({ name: "Jolly", effect: "+7", active: true, points: 7 });
  });

  it("Abissi: the next card gets its points as a bonus passed on", () => {
    const abyss = card("abyss_next", { family: "body" }, "Abisso");
    const next = card(null, {}, "Dopo");
    expect(roundPowerNotes(abyss, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "×2 al prossimo", timing: "after" });
    const passed = rulePowerOutcome(ch(next), null, engineThreat, { families: FAMILIES, played: [ch(abyss)] }, { previous: abyss });
    expect(roundPowerNotes(next, { bonus: 0 }, threat, { ...calm, ...passed }, true)).toEqual([
      { name: "Abissi di Abisso", effect: "+10", active: true, points: 10, code: "abyss_next", source: "carried" },
    ]);
  });

  it("Vampiro: +1 to itself in its note, −1 on the rival's", () => {
    const vampire = card("vampire", {}, "Vlad", { FOR: 5, VEL: 5 });
    const rival = card(null, {}, "Talos", { FOR: 7, VEL: 3 });
    const drained = rulePowerOutcome(ch(rival), ch(vampire), engineThreat, { families: FAMILIES, played: [] }, { rival: vampire });
    expect(drained).toMatchObject({ drained: 1, drainedFrom: "Vlad" });
    expect(roundPowerNotes(rival, { bonus: 0 }, threat, { ...calm, ...drained }, true)).toEqual([
      { name: "Vampiro di Vlad", effect: "−1", active: true, points: -1, code: "vampire", source: "worn" },
    ]);
  });

  it("Ladro: the victim's power says it was stolen", () => {
    const booster = card("ability_bonus", { ability: "FOR", bonus: 2 }, "Specialità");
    const parts = { power: 0, carried: 0, pack: 0, modifier: 0, floor: 0 };
    expect(roundPowerNotes(booster, { bonus: 0 }, threat, { ...calm, parts, stolenBy: "Lesto" })[0]).toMatchObject({
      effect: "rubato da Lesto",
      active: false,
      cancelled: "blocked",
    });
  });
});

describe("the other notes", () => {
  it("Calma piatta, Ribaltone, Muro say what they did", () => {
    expect(roundPowerNotes(card("calm"), { bonus: 0 }, threat, { ...calm, calmedRule: "Colpo mirato" })[0]).toMatchObject({ effect: "toglie Colpo mirato", active: true });
    expect(roundPowerNotes(card("upset", { min_gap: 10 }), { bonus: 0 }, threat, { ...calm, upsetWon: true })[0]).toMatchObject({ active: true, timing: "tie" });
    expect(roundPowerNotes(card("wall", { margin: 3 }), { bonus: 0 }, threat, { ...calm, wallVoided: true })[0]).toMatchObject({ effect: "round nullo", active: true });
  });

  it("Imboscata, Segugio, Fenice", () => {
    expect(roundPowerNotes(card("ambush"), { bonus: 0 }, threat, calm)[0]).toMatchObject({ timing: "after", active: true });
    expect(roundPowerNotes(card("tracker"), { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "svela le rarità rivali" });
    expect(roundPowerNotes(card("phoenix"), { bonus: 0 }, threat, { ...calm, lost: true })[0]).toMatchObject({ effect: "torna in squadra", active: true });
    expect(roundPowerNotes(card("phoenix"), { bonus: 0 }, threat, calm)[0].active).toBe(false);
  });

  it("Azzardo: +3, then −3 for the next card after a lost round, told like a bonus", () => {
    const gamble = card("gamble", { bonus: 3, malus: 3 }, "Azzardo");
    const parts = { power: 3, carried: 0, pack: 0, modifier: 0, floor: 0 };
    const notes = roundPowerNotes(gamble, { bonus: 3 }, threat, { ...calm, lost: true, parts }, true);
    expect(notes.map((n) => n.effect)).toEqual(["+3", "−3 al prossimo"]);
    expect(roundPowerNotes(card(null), { bonus: -3 }, threat, { ...calm, carried: -3, carriedFrom: "Azzardo" }, true)[0]).toMatchObject({
      name: "Azzardo",
      effect: "−3",
      points: -3,
    });
  });

  it("calmedBy and resultPowers read the round as played", () => {
    const focus = { code: "focus" } as const;
    expect(calmedBy(card("calm"), card(null), focus)).toBe(true);
    expect(calmedBy(card("calm"), card("nullifier"), focus)).toBe(false);
    expect(calmedBy(card("calm"), card(null), null)).toBe(false);
    expect(resultPowers({ score: 5 }, { score: 16 }, card("upset", { min_gap: 10 }), card(null), "me", null)).toEqual({ upset: "me", wall: null });
    expect(resultPowers({ score: 10 }, { score: 12 }, card("wall", { margin: 3 }), card(null), "none", null)).toEqual({ upset: null, wall: "me" });
  });

  it("in Emergenza the ones that need an opponent do nothing", () => {
    const play = { round: 2, level: 2, threat: { name: "Minaccia", abilities: ["FOR", "VEL"], flavor: "" }, bonus: 0, passed: true, parts: null, modifier: null };
    for (const code of ["hunter", "vampire", "thief", "upset", "wall", "rival_frost", "ambush", "tracker", "phoenix"]) {
      expect(emergencyPowerNotes(card(code, { bonus: 4, cap: 8, min_gap: 10, margin: 3 }), play, [])[0].effect).toBe("senza avversario non agisce");
    }
  });
});
