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
    expect(carriedInto(comeback, true)).toBe(2);
    expect(carriedInto(comeback, false)).toBe(0);
    expect(carriedInto(null, true)).toBe(0);
  });
});
