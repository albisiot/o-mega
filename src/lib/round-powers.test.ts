import { describe, expect, it } from "vitest";
import type { MatchCard } from "./match";
import { carriedInto, roundPowerNotes } from "./round-powers";

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
    expect(roundPowerNotes(underdog, { bonus: 3 }, threat, calm)).toEqual([{ name: "Sfavorito", effect: "+3", active: true }]);
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
      { name: "Apripista", effect: "+2", active: true },
      { name: "Riscossa", effect: "+3", active: true },
    ]);
  });

  it("describes the powers that do not add points", () => {
    const sabotage = card({ code: "sabotage", params: { malus: 2 }, name: "Sabotatore", text: "" });
    expect(roundPowerNotes(sabotage, { bonus: 0 }, threat, calm)[0]).toMatchObject({ effect: "−2 a ogni abilità rivale", active: true });
    const relentless = card({ code: "relentless", params: {}, name: "Implacabile", text: "" });
    expect(roundPowerNotes(relentless, { bonus: 0 }, threat, { ...calm, wonTie: true })[0].effect).toBe("vince la parità");
    expect(roundPowerNotes(relentless, { bonus: 0 }, threat, calm)[0].active).toBe(false);
    const comeback = card({ code: "comeback", params: { bonus: 2 }, name: "Riscossa", text: "" });
    expect(roundPowerNotes(comeback, { bonus: 0 }, threat, { ...calm, lost: true })[0].effect).toBe("+2 al prossimo");
    expect(roundPowerNotes(comeback, { bonus: 0 }, threat, calm)[0].active).toBe(false);
  });
});

describe("carriedInto", () => {
  it("passes Riscossa on only after a lost round", () => {
    const comeback = card({ code: "comeback", params: { bonus: 2 }, name: "Riscossa", text: "" });
    expect(carriedInto(comeback, "lost")).toEqual({ points: 2, from: "Riscossa" });
    expect(carriedInto(comeback, "won").points).toBe(0);
    expect(carriedInto(null, "lost").points).toBe(0);
  });

  it("passes Slancio on only after a won round, and nothing past an Annullatore", () => {
    const momentum = card({ code: "momentum", params: { bonus: 2 }, name: "Slancio", text: "" });
    const nullifier = card({ code: "nullifier", params: {}, name: "Annullatore", text: "" });
    expect(carriedInto(momentum, "won")).toEqual({ points: 2, from: "Slancio" });
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
      { name: "Slancio", effect: "+2", active: true },
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
