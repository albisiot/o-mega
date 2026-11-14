import { describe, expect, it } from "vitest";
import { botView, chooseBotPlay } from "./bots.ts";
import { resolveEmergencyPlay } from "./emergency.ts";
import { resolveRound } from "./match.ts";
import { mulberry32 } from "./rng.ts";
import { hidesIdentity } from "./scoring.ts";
import { FAMILIES, newState, threatCatalog } from "./test-fixtures.ts";
import type { Character, MatchState, Power, Side, Threat, ThreatModifier } from "./types.ts";

// The fourteen characters of the backlog powers (P218-P231), with the values, factions,
// rarities and parameters of supabase/migrations/20261114230000_backlog_power_characters.sql,
// played in real rounds against cards of the catalog.

const ORDER = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];
const RANK = { delta: 1, gamma: 2, beta: 3, alfa: 4, omega: 5 } as const;

function card(
  code: string,
  faction: string,
  rarity: keyof typeof RANK,
  values: number[],
  power: Power | null = null,
): Character {
  return {
    id: code,
    definitionId: code,
    faction,
    rarityRank: RANK[rarity],
    stats: Object.fromEntries(ORDER.map((ability, i) => [ability, values[i]])),
    power,
  };
}

const p = (code: string, params: Power["params"] = {}): Power => ({ code, params });

// The new characters.
const upkeep = card("P218", "heroes", "gamma", [3, 2, 5, 7, 9, 8, 6, 0, 0, 2, 9, 4], p("scrappy", { min_value: 3 }));
const reus = card("P219", "villains", "gamma", [5, 4, 6, 8, 10, 4, 0, 0, 9, 4, 1, 4], p("vendetta", { bonus: 3 }));
const statera = card("P220", "neutrals", "gamma", [5, 1, 8, 7, 10, 10, 0, 9, 0, 3, 1, 1], p("counterpunch", { bonus: 1, max: 3 }));
const normal = card("P221", "heroes", "gamma", [3, 2, 5, 8, 10, 10, 9, 0, 0, 1, 3, 4], p("adaptable", { bonus: 4 }));
const billable = card("P222", "villains", "gamma", [4, 4, 4, 7, 5, 8, 9, 0, 0, 2, 7, 5], p("opportunist", { bonus: 3 }));
const insula = card("P223", "neutrals", "beta", [3, 2, 8, 10, 10, 7, 0, 0, 9, 1, 4, 3], p("lone_wolf", { bonus: 5 }));
const recesso = card("P224", "heroes", "beta", [5, 7, 6, 6, 4, 1, 0, 10, 0, 10, 1, 7], p("reflect"));
const dittograph = card("P225", "villains", "beta", [3, 4, 5, 10, 2, 3, 0, 10, 0, 4, 10, 6], p("eclectic", { bonus: 3, min_families: 3 }));
const praesidium = card("P226", "neutrals", "beta", [8, 5, 8, 2, 8, 6, 7, 0, 0, 8, 0, 5], p("main_event", { bonus: 3 }));
const residuo = card("P227", "heroes", "alfa", [7, 5, 10, 5, 3, 4, 0, 7, 0, 10, 1, 6], p("sacrifice", { bonus: 5 }));
const afterimage = card("P228", "heroes", "alfa", [4, 8, 5, 6, 3, 7, 0, 0, 5, 8, 3, 9], p("echo"));
const gymnasiarch = card("P229", "neutrals", "alfa", [5, 3, 6, 8, 10, 8, 0, 0, 1, 7, 4, 6], p("catalyst", { multiplier: 2 }));
const matins = card("P230", "villains", "omega", [3, 0, 10, 6, 9, 10, 2, 3, 10, 2, 1, 5], p("pack_leader", { bonus: 1 }));
const thicket = card("P231", "villains", "omega", [10, 1, 10, 6, 9, 7, 0, 10, 0, 5, 0, 3], p("fog"));

// Cards of the catalog they meet.
const gantry = card("P001", "heroes", "delta", [10, 5, 9, 2, 6, 4, 1, 0, 1, 7, 5, 4]);
const strata = card("P188", "heroes", "delta", [4, 2, 7, 10, 8, 6, 1, 0, 0, 2, 9, 5]);
const sottovento = card("P195", "villains", "delta", [2, 4, 4, 8, 8, 7, 1, 0, 0, 10, 0, 10]);
const onorario = card("P196", "villains", "delta", [4, 6, 5, 6, 7, 8, 1, 0, 0, 10, 1, 6]);
const portineria = card("P193", "neutrals", "delta", [4, 4, 6, 9, 10, 9, 1, 0, 1, 3, 3, 4]);
const clementia = card("P214", "villains", "alfa", [3, 3, 4, 8, 8, 9, 1, 10, 1, 3, 4, 4], p("sabotage", { malus: 1 }));
const codicil = card("P115", "heroes", "beta", [1, 4, 5, 9, 9, 8, 2, 2, 2, 5, 7, 3], p("nullifier"));
const scion = card("P200", "heroes", "gamma", [9, 4, 8, 7, 1, 2, 6, 1, 1, 6, 0, 10], p("ability_bonus", { ability: "FOR", bonus: 2 }));

function t(id: string, abilities: string[], modifier: ThreatModifier | null = null, level = abilities.length): Threat {
  return { id, level, abilities, modifier };
}

function match(teamA: Character[], teamB: Character[], threats: Threat[]): MatchState {
  return newState(teamA, teamB, threats);
}

function play(state: MatchState, a: Character, b: Character) {
  return resolveRound(state, { a: { characterId: a.id, autoPlayed: false }, b: { characterId: b.id, autoPlayed: false } }, FAMILIES);
}

const FILLER = [t("f1", ["COM"]), t("f2", ["COM", "FUR"]), t("f3", ["COM", "FUR", "TEC"]), t("f4", ["FOR", "VEL", "RES", "INT"])];

describe("Arte di arrangiarsi: Upkeep", () => {
  it("counts its abilities below 3 as 3", () => {
    // VEL 2, MAG 0, COM 2: three below the floor, worth 1 + 3 + 1.
    const state = match([upkeep, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], [
      t("x", ["VEL", "MAG", "COM", "TEC"]),
      ...FILLER,
    ]);
    const { round } = play(state, upkeep, onorario);
    expect(round.plays.a.base).toBe(13);
    expect(round.plays.a.parts?.power).toBe(5);
    expect(round.plays.a.total).toBe(18);
  });

  it("counts the floor after the opposing Sabotatore", () => {
    const state = match([upkeep, gantry, strata, portineria, scion], [clementia, onorario, gantry, strata, portineria], [
      t("x", ["VEL", "TEC"]),
      ...FILLER,
    ]);
    const { round } = play(state, upkeep, clementia);
    // VEL 2-1 = 1 counts 3, TEC 9-1 = 8.
    expect(round.plays.a.total).toBe(11);
  });
});

describe("Vendetta: Reus", () => {
  it("gains its bonus only after the side lost the round before", () => {
    const threats = [t("x1", ["FOR"]), t("x2", ["VOL", "PSI"]), ...FILLER.slice(1)];
    let state = match([sottovento, reus, onorario, portineria, strata], [gantry, strata, portineria, scion, codicil], threats);
    state = play(state, sottovento, gantry).state; // 2 against 10: lost
    const { round } = play(state, reus, strata);
    expect(round.plays.a.parts?.power).toBe(3);
    expect(round.plays.a.total).toBe(10 + 9 + 3);

    let won = match([gantry, reus, onorario, portineria, strata], [sottovento, strata, portineria, scion, codicil], threats);
    won = play(won, gantry, sottovento).state;
    expect(play(won, reus, strata).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Contrattacco: Statera", () => {
  it("gains 1 for each required ability where the opponent is higher, up to 3", () => {
    const state = match([statera, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], [
      t("x", ["VEL", "COM", "FUR", "TEC"]),
      ...FILLER,
    ]);
    // Sottovento is higher in VEL, COM, FUR (not TEC 0 against 1): +3.
    expect(play(state, statera, sottovento).round.plays.a.parts?.power).toBe(3);
  });
});

describe("Adattabile: Normal", () => {
  it("gains 4 against a threat with a rule, and Sottovalutati does not take from it", () => {
    const underdogs: ThreatModifier = { code: "underdogs", commonMaxRank: 1, eliteMinRank: 2, bonus: 3, malus: 3 };
    const state = match([normal, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], [
      t("x", ["INT", "PER"], underdogs),
      ...FILLER,
    ]);
    const { round } = play(state, normal, sottovento);
    expect(round.plays.a.parts).toMatchObject({ power: 4, modifier: 0 });
    expect(round.plays.a.total).toBe(18 + 4);
    const plain = match([normal, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], [
      t("x", ["INT", "PER"]),
      ...FILLER,
    ]);
    expect(play(plain, normal, sottovento).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Opportunista: Billable", () => {
  it("gains 3 against a card without a power, nothing against one with it", () => {
    const threats = [t("x", ["ENE", "PER"]), ...FILLER];
    const team = [billable, gantry, strata, portineria, onorario];
    expect(play(match(team, [gantry, strata, portineria, scion, codicil], threats), billable, gantry).round.plays.a.parts?.power).toBe(3);
    expect(play(match(team, [scion, strata, portineria, gantry, codicil], threats), billable, scion).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Lupo solitario: Insula", () => {
  it("gains 5 only when no other card of the team is neutral", () => {
    const threats = [t("x", ["INT", "VOL"]), ...FILLER];
    const alone = match([insula, gantry, strata, sottovento, onorario], [gantry, strata, portineria, scion, codicil], threats);
    expect(play(alone, insula, gantry).round.plays.a.parts?.power).toBe(5);
    const crowded = match([insula, gantry, strata, portineria, onorario], [gantry, strata, portineria, scion, codicil], threats);
    expect(play(crowded, insula, gantry).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Riflesso: Recesso", () => {
  it("is not touched by Clementia's Sabotatore, which takes 1 from her own abilities instead", () => {
    const state = match([recesso, gantry, strata, portineria, scion], [clementia, onorario, gantry, strata, portineria], [
      t("x", ["MAG", "COM"]),
      ...FILLER,
    ]);
    const { round } = play(state, recesso, clementia);
    expect(round.plays.a.total).toBe(20);
    expect(round.plays.b.total).toBe(9 + 2);
  });
});

describe("Eclettico: Dittograph", () => {
  it("gains 3 when the required abilities come from three families", () => {
    const team = [dittograph, gantry, strata, portineria, onorario];
    const opponents = [gantry, strata, portineria, scion, codicil];
    expect(play(match(team, opponents, [t("x", ["INT", "MAG", "TEC"]), ...FILLER]), dittograph, gantry).round.plays.a.parts?.power).toBe(3);
    expect(play(match(team, opponents, [t("x", ["INT", "VOL", "TEC"]), ...FILLER]), dittograph, gantry).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Grande prova: Praesidium", () => {
  it("gains 3 on the highest threat of the match, nothing on the others", () => {
    const threats = [t("l1", ["FOR"]), t("l5", ["FOR", "RES", "VOL", "COM", "ENE"]), t("l2", ["COM", "FUR"]), t("l3", ["FOR", "RES", "COM"]), t("l4", ["FOR", "VEL", "RES", "COM"])];
    const team = [praesidium, gantry, strata, portineria, onorario];
    let state = match(team, [gantry, strata, portineria, scion, codicil], threats);
    state = play(state, gantry, gantry).state;
    expect(play(state, praesidium, strata).round.plays.a.parts?.power).toBe(3);
    expect(play(match(team, [gantry, strata, portineria, scion, codicil], threats), praesidium, gantry).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Sacrificio: Residuo", () => {
  it("scores 0 and gives the next card 5, whatever happened", () => {
    const threats = [t("x1", ["RES", "COM"]), t("x2", ["FOR"]), ...FILLER.slice(1)];
    let state = match([residuo, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], threats);
    const first = play(state, residuo, sottovento);
    expect(first.round.plays.a.total).toBe(0);
    expect(first.round.winner).toBe("b");
    state = first.state;
    const second = play(state, gantry, onorario);
    expect(second.round.plays.a.parts?.carried).toBe(5);
    expect(second.round.plays.a.total).toBe(15);
  });

  it("wins under Rovescio: its 0 is the lowest score", () => {
    const state = match([residuo, gantry, strata, portineria, scion], [sottovento, onorario, gantry, strata, portineria], [
      t("x", ["RES", "COM"], { code: "reverse" }),
      ...FILLER,
    ]);
    expect(play(state, residuo, sottovento).round.winner).toBe("a");
  });
});

describe("Riverbero: Afterimage", () => {
  it("copies the points power of the card played the round before", () => {
    const threats = [t("x1", ["FOR"]), t("x2", ["FOR", "VEL"]), ...FILLER.slice(1)];
    let state = match([scion, afterimage, gantry, strata, portineria], [sottovento, onorario, gantry, strata, portineria], threats);
    state = play(state, scion, sottovento).state;
    // Scion's Specialità: +2 when FOR is required.
    expect(play(state, afterimage, onorario).round.plays.a.parts?.power).toBe(2);
  });

  it("copies nothing from a card an Annullatore switched off", () => {
    const threats = [t("x1", ["FOR"]), t("x2", ["FOR", "VEL"]), ...FILLER.slice(1)];
    let state = match([scion, afterimage, gantry, strata, portineria], [codicil, onorario, gantry, strata, portineria], threats);
    state = play(state, scion, codicil).state;
    expect(play(state, afterimage, onorario).round.plays.a.parts?.power).toBe(0);
  });
});

describe("Catalizzatore: Gymnasiarch", () => {
  it("doubles the power bonus of the next card", () => {
    const threats = [t("x1", ["VOL"]), t("x2", ["FOR", "COM"]), ...FILLER.slice(1)];
    let state = match([gymnasiarch, scion, gantry, strata, portineria], [sottovento, onorario, gantry, strata, portineria], threats);
    state = play(state, gymnasiarch, sottovento).state;
    const { round } = play(state, scion, onorario);
    expect(round.plays.a.parts?.power).toBe(4);
    expect(round.plays.a.total).toBe(9 + 6 + 4);
  });
});

describe("Capobranco: Matins", () => {
  it("gives +1 to every later villain of the team, not to the others", () => {
    const threats = [t("x1", ["PSI"]), t("x2", ["COM"]), t("x3", ["COM", "FUR"]), ...FILLER.slice(2)];
    let state = match([matins, sottovento, gantry, onorario, strata], [gantry, strata, portineria, scion, codicil], threats);
    state = play(state, matins, gantry).state;
    const villain = play(state, sottovento, strata);
    expect(villain.round.plays.a.parts?.pack).toBe(1);
    const hero = play(villain.state, gantry, portineria);
    expect(hero.round.plays.a.parts?.pack).toBe(0);
  });
});

describe("Nebbia: Thicket", () => {
  it("adds no points and keeps the bot from counting it among the cards it saw", () => {
    expect(hidesIdentity(thicket)).toBe(true);
    const state = match([thicket, sottovento, onorario, matins, reus], [gantry, strata, portineria, scion, codicil], [
      t("x", ["FOR", "MAG"]),
      ...FILLER,
    ]);
    const { round, state: after } = play(state, thicket, gantry);
    expect(round.plays.a.parts?.power).toBe(0);
    expect(round.plays.a.total).toBe(20);
    // The bot on side b still plays a legal card after facing the hidden one.
    const side: Side = "b";
    const view = botView(after, side, {
      characters: [thicket, sottovento, onorario, matins, reus, gantry, strata, portineria, scion, codicil],
      threatCatalog: threatCatalog(),
      families: FAMILIES,
      abilityMeans: Object.fromEntries(ORDER.map((a) => [a, 4])),
    });
    // The bot does not see who was played under Nebbia.
    expect(view.opponentSeen.map((c) => c.id)).not.toContain("P231");
    const choice = chooseBotPlay("hard", view, mulberry32(7));
    expect(["P188", "P193", "P200", "P115"]).toContain(choice);
  });
});

describe("in Emergenza", () => {
  const rules = { targets: { 1: 7, 2: 13, 3: 18, 4: 23, 5: 28, 6: 32 }, threatsPerRun: 8, maxFailures: 3 } as never;
  const squad = [insula, gantry, strata, sottovento, onorario, scion, codicil, clementia];

  it("Lupo solitario counts the 8 of the squad, Contrattacco and Opportunista do nothing", () => {
    const threat = t("e", ["INT", "VOL"]);
    expect(resolveEmergencyPlay({ character: insula, threat, squad, attempts: [], rules, families: FAMILIES }).score.parts?.power).toBe(5);
    expect(resolveEmergencyPlay({ character: statera, threat, squad: [statera], attempts: [], rules, families: FAMILIES }).score.parts?.power).toBe(0);
    expect(resolveEmergencyPlay({ character: billable, threat, squad: [billable], attempts: [], rules, families: FAMILIES }).score.parts?.power).toBe(0);
  });

  it("Adattabile does nothing on the threats of Nuova Megara, which have no rule", () => {
    const threat = t("e", ["INT", "PER"]);
    expect(resolveEmergencyPlay({ character: normal, threat, squad: [normal], attempts: [], rules, families: FAMILIES }).score.parts?.power).toBe(0);
  });
});
