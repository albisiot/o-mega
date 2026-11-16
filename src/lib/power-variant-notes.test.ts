// The round result for the power variants of 16 November 2026 (SPEC §4.4): what the page
// says about them and how it tells an Annullatore ritardato, a Riscossa lunga or sullo
// scarto, and an Implacabile that wins from behind.

import { describe, expect, it } from "vitest";
import type { MatchCard, MatchRound } from "./match";
import { emergencyPowerNotes } from "./emergency-powers";
import {
  carriedIntoRound,
  decisiveNote,
  roundPlaysBefore,
  roundPowerNotes,
  tieExplanation,
  wasNullified,
  wonBehindByRelentless,
} from "./round-powers";

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

/** A resolved round of the player's view, with the player's team card `mine`. */
function round(n: number, mine: MatchCard, theirs: MatchCard, myScore: number, theirScore: number, winner: MatchRound["winner"]): MatchRound {
  const play = { base: 0, bonus: 0, highest: 5, auto_played: false };
  return {
    round: n,
    level: 1,
    modifier: null,
    threat: { name: "Minaccia", abilities: ["FOR"], flavor: "" },
    deadline_at: "",
    resolved: true,
    winner,
    my_play: { ...play, score: myScore, instance_id: `i-${mine.definition_id}`, definition_id: mine.definition_id },
    opponent_play: { ...theirs, ...play, score: theirScore },
    my_pending_instance_id: null,
    opponent_has_chosen: false,
  };
}

describe("notes of the power variants", () => {
  it("say what the variants without points did", () => {
    const flat = card("sabotage_flat", { malus: 2 }, "Sabotatore");
    expect(roundPowerNotes(flat, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "−2 al punteggio rivale", active: true });
    const big = card("sabotage_big", { malus: 1, from_level: 3 }, "Sabotatore");
    expect(roundPowerNotes(big, { bonus: 0 }, threat, calm)[0].active).toBe(false);
    expect(roundPowerNotes(big, { bonus: 0 }, { ...threat, level: 3, abilities: ["FOR", "VEL", "RES"] }, calm)[0].effect).toBe(
      "−1 a ogni abilità rivale",
    );
    const many = card("spy_many", { count: 2 }, "Spia");
    expect(roundPowerNotes(many, { bonus: 0 }, threat, calm)[0].effect).toBe("svela 2 personaggi rivali");
    const short = card("foresight_short", { count: 2 }, "Veggente");
    expect(roundPowerNotes(short, { bonus: 0 }, threat, calm)[0].effect).toBe("svela le Minacce dei prossimi 2 round");
    const delayed = card("delayed_nullifier", {}, "Annullatore");
    expect(roundPowerNotes(delayed, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "annulla il potere del prossimo rivale", timing: "after" });
  });

  it("tell the Riscossa variants after a lost round", () => {
    const long = card("comeback_long", { bonus: 2 }, "Riscossa");
    expect(roundPowerNotes(long, { bonus: 0 }, threat, { ...calm, lost: true })[0].effect).toBe("+2 ai prossimi due");
    const margin = card("comeback_margin", { max: 4 }, "Riscossa");
    expect(roundPowerNotes(margin, { bonus: 0 }, threat, { ...calm, lost: true, margin: -3 })[0].effect).toBe("+3 al prossimo");
    expect(roundPowerNotes(margin, { bonus: 0 }, threat, { ...calm, lost: true, margin: -9 })[0].effect).toBe("+4 al prossimo");
  });

  it("an Implacabile that won from behind decided the round", () => {
    const small = card("relentless_small", { margin: 1, max_level: 2 }, "Implacabile");
    const notes = roundPowerNotes(small, { bonus: 0 }, threat, { ...calm, wonBehind: 1 });
    expect(notes[0]).toMatchObject({ effect: "vince anche sotto di 1", active: true, timing: "tie" });
    expect(decisiveNote("me", notes, { score: 9, highest: 5 }, { score: 10, highest: 6 }, "Rivale")?.text).toBe(
      "Senza Implacabile vinceva Rivale, 10 a 9.",
    );
    expect(wonBehindByRelentless({ score: 9 }, { score: 10 }, small, plain("Rivale"), null)).toBe(1);
    expect(wonBehindByRelentless({ score: 9 }, { score: 10 }, plain("Altro"), plain("Rivale"), null)).toBe(0);
    expect(tieExplanation({ score: 9, highest: 5 }, { score: 10, highest: 6 }, "me", small, plain("Rivale"), null)).toBe(
      "9 a 10: vince Implacabile con Implacabile, che vince anche sotto di 1.",
    );
  });
});

describe("rounds before", () => {
  const delayed = card("delayed_nullifier", {}, "Annullatore", "dn");
  const booster = card("ability_bonus", { ability: "FOR", bonus: 2 }, "Specialità", "bo");
  const nullifier = card("nullifier", {}, "Annullatore", "nu");

  it("an opposing Annullatore ritardato takes the power of the card of the round after", () => {
    const team = [{ ...plain("Mio", "m1"), instance_id: "i-m1" }, { ...booster, instance_id: "i-bo" }];
    const rounds = [round(1, team[0], delayed, 5, 5, "none")];
    const before = roundPlaysBefore(rounds, team, 2);
    expect(wasNullified(booster, plain("Altro"), null, before)).toBe(true);
    expect(wasNullified(booster, plain("Altro"), null)).toBe(false);
  });

  it("an Annullatore it silenced cancels nothing", () => {
    const team = [{ ...delayed, instance_id: "i-dn" }, { ...booster, instance_id: "i-bo" }];
    const rounds = [round(1, team[0], plain("Altro"), 5, 5, "none")];
    expect(wasNullified(booster, nullifier, null, roundPlaysBefore(rounds, team, 2))).toBe(false);
    expect(wasNullified(booster, nullifier, null, {})).toBe(true);
  });

  it("Riscossa lunga reaches the card two rounds later, Riscossa sullo scarto passes the gap", () => {
    const long = { ...card("comeback_long", { bonus: 2 }, "Riscossa", "lo"), instance_id: "i-lo" };
    const margin = { ...card("comeback_margin", { max: 4 }, "Riscossa", "ma"), instance_id: "i-ma" };
    const other = { ...plain("Mio", "m2"), instance_id: "i-m2" };
    const team = [long, margin, other];
    const rounds = [round(1, long, plain("A"), 4, 9, "opponent"), round(2, other, plain("B"), 5, 3, "me")];
    expect(carriedIntoRound(rounds, team, 3, "me")).toMatchObject({ points: 2, from: "Riscossa", code: "comeback_long" });
    const lost = [round(1, margin, plain("A"), 6, 9, "opponent")];
    expect(carriedIntoRound(lost, team, 2, "me").points).toBe(3);
  });
});

describe("Emergenza", () => {
  const play = (level: number) => ({
    round: 2,
    level,
    threat: { name: "Minaccia", abilities: ["FOR", "VEL", "RES"].slice(0, level), flavor: "" },
    bonus: 0,
    passed: true,
    parts: null,
    modifier: null,
  });

  it("the variants of Sabotatore and Implacabile lower the target", () => {
    const flat = card("sabotage_flat", { malus: 2 }, "Sabotatore");
    expect(emergencyPowerNotes(flat, play(2), [])[0]).toMatchObject({ effect: "soglia −2", threshold: 2 });
    const big = card("sabotage_big", { malus: 1, from_level: 3 }, "Sabotatore");
    expect(emergencyPowerNotes(big, play(2), [])[0].active).toBe(false);
    expect(emergencyPowerNotes(big, play(3), [])[0].threshold).toBe(3);
    const behind = card("relentless_behind", { margin: 1 }, "Implacabile");
    const lost = [{ card: plain("A"), passed: false }];
    expect(emergencyPowerNotes(behind, play(2), lost)[0]).toMatchObject({ effect: "gli bastano 2 punti in meno", threshold: 2 });
  });

  it("the ones that need an opponent do nothing", () => {
    const rival = card("rival", { bonus: 3 }, "Nemesi");
    expect(emergencyPowerNotes(rival, play(2), [])[0].effect).toBe("senza avversario non agisce");
  });
});
