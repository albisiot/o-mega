import { describe, expect, it } from "vitest";
import type { MatchCard } from "./match";
import { carriedInto, playedBefore, roundPowerNotes, tieBreakReason, tieWonByRelentless } from "./round-powers";

const card = (power: MatchCard["power"], faction = "heroes", rank = 2): MatchCard => ({
  definition_id: "d1",
  code: "P001",
  name: "Prova",
  faction,
  flavor: "",
  art_url: null,
  stats: { FOR: 5 },
  rarity: { code: "gamma", name: "Gamma", rank, color: "#000" },
  power,
});
const threat = { level: 2, abilities: ["FOR", "COM"], modifier: null };
const calm = { carried: 0, lost: false, wonTie: false };

describe("roundPowerNotes", () => {
  it("is empty for a card without power", () => {
    expect(roundPowerNotes(card(null), { bonus: 0 }, threat, calm)).toEqual([]);
  });

  it("shows the points a power added, or dims it when it did nothing", () => {
    const underdog = card({ code: "underdog", params: { bonus: 3 }, name: "Sfavorito", text: "" });
    expect(roundPowerNotes(underdog, { bonus: 3 }, threat, calm)).toEqual([{ name: "Sfavorito", effect: "+3", active: true, points: 3 }]);
    expect(roundPowerNotes(underdog, { bonus: 0 }, threat, calm)).toEqual([{ name: "Sfavorito", effect: null, active: false }]);
  });

  it("leaves out the Riscossa received and the modifier's points", () => {
    const opener = card({ code: "opener", params: { bonus: 2, max_round: 2 }, name: "Apripista", text: "" });
    const hostile = {
      ...threat,
      modifier: { code: "hostile_ground" as const, favored: "heroes", hindered: "villains", bonus: 2, malus: 2 },
    };
    const notes = roundPowerNotes(opener, { bonus: 2 + 3 + 2 }, hostile, { ...calm, carried: 3 });
    expect(notes).toEqual([
      { name: "Apripista", effect: "+2", active: true, points: 2 },
      { name: "Riscossa", effect: "+3", active: true, points: 3 },
    ]);
  });

  it("describes the powers that do not add points", () => {
    const sabotage = card({ code: "sabotage", params: { malus: 2 }, name: "Sabotatore", text: "" });
    expect(roundPowerNotes(sabotage, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "−2 a ogni abilità rivale", active: true });
    const relentless = card({ code: "relentless", params: {}, name: "Implacabile", text: "" });
    expect(roundPowerNotes(relentless, { bonus: 0 }, threat, { ...calm, wonTie: true })[0].effect).toBe("vince la parità");
    expect(roundPowerNotes(relentless, { bonus: 0 }, threat, calm)[0].active).toBe(false);
    expect(roundPowerNotes(relentless, { bonus: 0 }, threat, calm)[0].timing).toBe("tie");
    const comeback = card({ code: "comeback", params: { bonus: 2 }, name: "Riscossa", text: "" });
    expect(roundPowerNotes(comeback, { bonus: 0 }, threat, { ...calm, lost: true })[0].effect).toBe("+2 al prossimo");
    expect(roundPowerNotes(comeback, { bonus: 0 }, threat, calm)[0].active).toBe(false);
    expect(roundPowerNotes(comeback, { bonus: 0 }, threat, calm)[0].timing).toBe("after");
  });
});

describe("carriedInto", () => {
  it("passes Riscossa on only after a lost round", () => {
    const comeback = card({ code: "comeback", params: { bonus: 2 }, name: "Riscossa", text: "" });
    expect(carriedInto(comeback, "lost")).toEqual({ points: 2, from: "Riscossa", code: "comeback" });
    expect(carriedInto(comeback, "won").points).toBe(0);
    expect(carriedInto(null, "lost").points).toBe(0);
  });

  it("passes Slancio on only after a won round, and nothing past an Annullatore", () => {
    const momentum = card({ code: "momentum", params: { bonus: 2 }, name: "Slancio", text: "" });
    const nullifier = card({ code: "nullifier", params: {}, name: "Annullatore", text: "" });
    expect(carriedInto(momentum, "won")).toEqual({ points: 2, from: "Slancio", code: "momentum" });
    expect(carriedInto(momentum, "void").points).toBe(0);
    expect(carriedInto(momentum, "won", nullifier).points).toBe(0);
  });
});

describe("roundPowerNotes for Annullatore and Slancio", () => {
  it("dims a power an Annullatore took away, and tells what the Annullatore did", () => {
    const opener = card({ code: "opener", params: { bonus: 3, max_round: 2 }, name: "Apripista", text: "" });
    expect(roundPowerNotes(opener, { bonus: 0 }, threat, { ...calm, nullified: true })).toEqual([
      { name: "Apripista", effect: "annullato", active: false },
    ]);
    const nullifier = card({ code: "nullifier", params: {}, name: "Annullatore", text: "" });
    expect(roundPowerNotes(nullifier, { bonus: 0 }, threat, { ...calm, opponentHasPower: true })[0]).toMatchObject({
      effect: "annulla il potere rivale",
      active: true,
    });
    expect(roundPowerNotes(nullifier, { bonus: 0 }, threat, calm)[0].active).toBe(false);
  });

  it("names the power that passed the bonus", () => {
    const momentum = card({ code: "momentum", params: { bonus: 2 }, name: "Slancio", text: "" });
    expect(roundPowerNotes(momentum, { bonus: 0 }, threat, { ...calm, won: true })[0].effect).toBe("+2 al prossimo");
    const plain = card(null);
    expect(roundPowerNotes(plain, { bonus: 2 }, threat, { ...calm, carried: 2, carriedFrom: "Slancio" })).toEqual([
      { name: "Slancio", effect: "+2", active: true, points: 2 },
    ]);
  });
});

describe("roundPowerNotes for Spia and Schermato", () => {
  it("tells what Spia does, and dims Sabotatore against Schermato", () => {
    const spy = card({ code: "spy", params: {}, name: "Spia", text: "" });
    expect(roundPowerNotes(spy, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "svela un personaggio rivale", active: true });
    const sabotage = card({ code: "sabotage", params: { malus: 1 }, name: "Sabotatore", text: "" });
    expect(roundPowerNotes(sabotage, { bonus: 0 }, threat, { ...calm, opponentShielded: true })[0].active).toBe(false);
  });

  it("counts Schermato's point like any other bonus", () => {
    const shielded = card({ code: "shielded", params: { bonus: 1 }, name: "Schermato", text: "" });
    expect(roundPowerNotes(shielded, { bonus: 1 }, threat, calm)[0]).toMatchObject({ effect: "+1", active: true });
  });
});

describe("roundPowerNotes for the backlog powers", () => {
  const power = (code: string, name: string, params: Record<string, number> = {}) => card({ code, params, name, text: "" });

  it("tells what Riflesso sends back, and nothing without a Sabotatore", () => {
    const reflect = power("reflect", "Riflesso");
    expect(roundPowerNotes(reflect, { bonus: 0 }, threat, { ...calm, opponentSabotage: 1 })[0]).toMatchObject({
      effect: "rimanda −1 a ogni abilità",
      active: true,
    });
    expect(roundPowerNotes(reflect, { bonus: 0 }, threat, calm)[0].active).toBe(false);
  });

  it("tells Sacrificio, Catalizzatore, Capobranco and Nebbia", () => {
    expect(roundPowerNotes(power("sacrifice", "Sacrificio", { bonus: 5 }), { bonus: -10 }, threat, calm)[0].effect).toBe("+5 al prossimo");
    expect(roundPowerNotes(power("catalyst", "Catalizzatore", { multiplier: 2 }), { bonus: 0 }, threat, calm)[0].effect).toBe(
      "×2 al potere del prossimo",
    );
    expect(roundPowerNotes(power("pack_leader", "Capobranco", { bonus: 1 }), { bonus: 0 }, threat, calm)[0].active).toBe(true);
    expect(roundPowerNotes(power("fog", "Nebbia"), { bonus: 0 }, threat, calm)[0].active).toBe(true);
  });

  it("shows the Capobranco bonus apart from the card's own power", () => {
    const opener = power("opener", "Apripista", { bonus: 3, max_round: 2 });
    expect(roundPowerNotes(opener, { bonus: 4 }, threat, { ...calm, pack: 1 })).toEqual([
      { name: "Apripista", effect: "+3", active: true, points: 3 },
      { name: "Capobranco", effect: "+1", active: true, points: 1 },
    ]);
    expect(roundPowerNotes(card(null), { bonus: 1 }, threat, { ...calm, pack: 1 })).toEqual([
      { name: "Capobranco", effect: "+1", active: true, points: 1 },
    ]);
  });

  it("lists a side's played cards in order, without powers an Annullatore took", () => {
    const leader = { ...power("pack_leader", "Capobranco", { bonus: 1 }), instance_id: "i1" };
    const second = { ...card(null), instance_id: "i2" };
    const play = { base: 0, bonus: 0, score: 0, highest: 0, auto_played: false };
    const round = (n: number, mine: string, opponent: typeof leader | null) => ({
      round: n,
      level: 1,
      modifier: null,
      threat: { name: "", abilities: [], flavor: "" },
      deadline_at: "",
      resolved: true,
      winner: null,
      my_play: { ...play, instance_id: mine, definition_id: "d1" },
      opponent_play: opponent && { ...opponent, ...play },
      my_pending_instance_id: null,
      opponent_has_chosen: false,
    });
    const nullifier = { ...power("nullifier", "Annullatore"), instance_id: "x" };
    const rounds = [round(2, "i2", null), round(1, "i1", null)];
    expect(playedBefore(rounds, [leader, second], 3, "me").map((c) => c.power?.code ?? null)).toEqual(["pack_leader", null]);
    expect(playedBefore(rounds, [leader, second], 2, "me")).toHaveLength(1);
    const stopped = [round(1, "i1", nullifier)];
    expect(playedBefore(stopped, [leader, second], 2, "me")[0].power).toBeNull();
    expect(playedBefore(stopped, [leader, second], 2, "opponent")[0].power?.code).toBe("nullifier");
  });
});

describe("tieBreakReason", () => {
  it("names the highest values that settled the tie", () => {
    expect(tieBreakReason({ highest: 9 }, { highest: 7 }, null)).toBe("vince il valore più alto, 9 contro 7");
  });

  it("says when nobody won", () => {
    expect(tieBreakReason(null, { highest: 8 }, null)).toBe("stesso valore più alto (8): round nullo");
  });

  it("names Implacabile when it settled the tie", () => {
    expect(tieBreakReason({ highest: 5 }, { highest: 8 }, null, "Gantry")).toBe("vince Gantry con Implacabile");
  });

  it("explains Rovescio and Negativo", () => {
    expect(tieBreakReason({ highest: 3 }, { highest: 6 }, { code: "reverse" })).toContain("più basso, 3 contro 6");
    expect(tieBreakReason({ highest: 7 }, { highest: 5 }, { code: "negative", max: 10 })).toContain("Negativo: 7 contro 5");
  });
});

describe("tieWonByRelentless", () => {
  const relentless = card({ code: "relentless", name: "Implacabile", text: "", params: {} });
  const plain = card(null);

  it("is true only when the winner alone has Implacabile", () => {
    expect(tieWonByRelentless(relentless, plain, null)).toBe(true);
    expect(tieWonByRelentless(plain, relentless, null)).toBe(false);
    expect(tieWonByRelentless(relentless, relentless, null)).toBe(false);
  });

  it("is false when Implacabile was taken away", () => {
    const nullifier = card({ code: "nullifier", name: "Annullatore", text: "", params: {} });
    expect(tieWonByRelentless(relentless, nullifier, null)).toBe(false);
    expect(tieWonByRelentless(relentless, plain, { code: "tomb_silence" })).toBe(false);
  });
});

describe("roundPowerNotes with annotate", () => {
  it("adds each note's power code and where it comes from", () => {
    const allRounder = card({ code: "all_rounder", params: { bonus: 3, min_value: 5 }, name: "Tuttofare", text: "" });
    const notes = roundPowerNotes(allRounder, { bonus: 3 + 2 + 1 }, threat, { ...calm, carried: 2, carriedFrom: "Slancio", carriedCode: "momentum", pack: 1 }, true);
    expect(notes.map((n) => [n.code, n.source])).toEqual([
      ["all_rounder", "own"],
      ["momentum", "carried"],
      ["pack_leader", "pack"],
    ]);
  });

  it("says why a power did nothing", () => {
    const opener = card({ code: "opener", params: { bonus: 2, max_round: 2 }, name: "Apripista", text: "" });
    expect(roundPowerNotes(opener, { bonus: 0 }, threat, { ...calm, nullified: true }, true)[0].cancelled).toBe("nullified");
    expect(roundPowerNotes(opener, { bonus: 0 }, threat, { ...calm, silenced: true }, true)[0].cancelled).toBe("silenced");
    expect(roundPowerNotes(opener, { bonus: 2 }, threat, calm)[0].code).toBeUndefined();
  });
});

describe("roundPowerNotes with annotate, against a shield", () => {
  it("lets a stopped Sabotatore speak as stopped", () => {
    const sabotage = card({ code: "sabotage", params: { malus: 1 }, name: "Sabotatore", text: "" });
    const plain = roundPowerNotes(sabotage, { bonus: 0 }, threat, { ...calm, opponentShielded: true });
    expect(plain).toEqual([{ name: "Sabotatore", effect: null, active: false }]);
    const annotated = roundPowerNotes(sabotage, { bonus: 0 }, threat, { ...calm, opponentShielded: true }, true);
    expect(annotated[0]).toMatchObject({ effect: "fermato dallo scudo", cancelled: "blocked", active: false });
  });
});
