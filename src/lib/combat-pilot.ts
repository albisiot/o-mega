// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 3: the ten pilot characters with their
// real kits, written from their card (abilities, Poteri, colour text). Two teams: «Porto», the
// port's crew of the Storia (Delta and Gamma), and «Rivali» (Beta to Omega). Abilities and
// rarities are copied from card_definitions on 24 November 2026: from stage 4 the kits move to the
// database (combat_moves, admins only) and the abilities are read from the cards. Type imports
// only, so scripts/simulate-combat.mts can load this file with Node.
import type { CombatKit, CombatMove, CombatPassive } from "@o-mega/game-engine";

export type CombatPilot = {
  code: string;
  name: string;
  faction: "heroes" | "villains" | "neutrals";
  rarity: "delta" | "gamma" | "beta" | "alfa" | "omega";
  /** The card's 12 abilities. */
  stats: Record<string, number>;
  team: "porto" | "rivali";
  kit: CombatKit;
};

/** The ability budget of each rarity (rarity_definitions.ability_budget). */
export const PILOT_BUDGETS: Record<CombatPilot["rarity"], number> = { delta: 54, gamma: 55, beta: 57, alfa: 58, omega: 61 };

const ABILITIES = ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"];
const stats = (...values: number[]) => Object.fromEntries(ABILITIES.map((code, i) => [code, values[i]]));

type MoveSpec = Omit<CombatMove, "id" | "slot" | "cooldown" | "range" | "target"> & Partial<Pick<CombatMove, "cooldown" | "range" | "target">>;
function kit(code: string, base: MoveSpec, special: MoveSpec, supreme: MoveSpec, passive: Omit<CombatPassive, "id">): CombatKit {
  const move = (slot: CombatMove["slot"], spec: MoveSpec): CombatMove => ({
    id: `${code}-${slot}`,
    slot,
    range: "ranged",
    target: "enemy",
    ...spec,
    cooldown: slot === "special" ? (spec.cooldown ?? 3) : 0,
  });
  return { base: move("base", base), special: move("special", special), supreme: move("supreme", supreme), passive: { id: `${code}-passive`, ...passive } };
}
const passive = (spec: Partial<Omit<CombatPassive, "id">> & Pick<CombatPassive, "name">): Omit<CombatPassive, "id"> => ({ scaling: {}, trigger: null, limit: 0, effects: [], modifiers: {}, ...spec });

export const COMBAT_PILOTS: CombatPilot[] = [
  {
    // FOR 10, RES 9, COM 9: the crane man. Front line, hits the neighbours, a container on everyone.
    code: "P001",
    name: "Gantry",
    faction: "heroes",
    rarity: "delta",
    stats: stats(10, 5, 9, 2, 6, 3, 4, 0, 1, 9, 3, 2),
    team: "porto",
    kit: kit(
      "P001",
      { name: "Spallata", scaling: { FOR: 0.7, COM: 0.3 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Carico pesante", scaling: { FOR: 0.7, COM: 0.3 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "damage", multiplier: 0.35, on: "adjacent" }] },
      { name: "Container in caduta", scaling: { FOR: 0.7, COM: 0.3 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "FOR" } }] },
      passive({ name: "Uomo del porto", trigger: "battle_start", limit: 1, scaling: { COM: 1 }, effects: [{ kind: "shield", multiplier: 0.5, to: "self" }] }),
    ),
  },
  {
    // RES 9, PER 9, FOR 7: the beast of the port; slow and clumsy out of the water, but he lets nothing go.
    code: "P125",
    name: "Lagan",
    faction: "villains",
    rarity: "delta",
    stats: stats(7, 1, 9, 2, 6, 9, 2, 5, 1, 6, 0, 6),
    team: "porto",
    kit: kit(
      "P125",
      { name: "Presa", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 40, ability: "FOR" } }] },
      { name: "Fondale", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 1, on: "primary" }] },
      { name: "Risacca", scaling: { FOR: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "FOR" } }] },
      passive({ name: "Non molla niente", trigger: "hurt", limit: 3, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, INT 8, ENE 8: the smuggler who takes the weight off things: off herself, then off her friends.
    code: "P204",
    name: "Deadweight",
    faction: "neutrals",
    rarity: "gamma",
    stats: stats(2, 1, 4, 8, 7, 10, 8, 1, 1, 3, 7, 3),
    team: "porto",
    kit: kit(
      "P204",
      { name: "Bilancia truccata", scaling: { PER: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Senza peso", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "haste", turns: 2, on: "self" }] },
      { name: "Cassa vuota", scaling: { INT: 0.5, ENE: 0.5 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 2, on: "all" }, { kind: "shield", multiplier: 0.5, on: "all" }] },
      passive({ name: "La bilancia non mente", modifiers: { hitPercent: 6, critPercent: 4 } }),
    ),
  },
  {
    // RES 10, VOL 9, INT 8: the pedlar whose cart keeps the air of home. He mends and he holds.
    code: "P152",
    name: "Higgler",
    faction: "neutrals",
    rarity: "delta",
    stats: stats(6, 3, 10, 8, 9, 7, 0, 1, 0, 1, 4, 5),
    team: "porto",
    kit: kit(
      "P152",
      { name: "Mercanzia", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] },
      { name: "Aria di casa", scaling: { VOL: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.85, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Il carro", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.6, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Sette giorni", trigger: "ally_down", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.4, to: "allies" }] }),
    ),
  },
  {
    // PSI 10, PER 8, FUR 8: one song, the right one. It calms the crowd; he never learnt to fight.
    code: "P123",
    name: "Busker",
    faction: "neutrals",
    rarity: "delta",
    stats: stats(0, 5, 4, 5, 7, 8, 3, 3, 10, 0, 1, 8),
    team: "porto",
    kit: kit(
      "P123",
      { name: "Strimpellata", scaling: { PSI: 0.7, PER: 0.3 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "PSI" } }] },
      { name: "La canzone giusta", scaling: { PSI: 0.7, PER: 0.3 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.35, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 40, ability: "PSI" } }] },
      { name: "Ninna nanna", scaling: { PSI: 0.7, PER: 0.3 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 20, ability: "PSI" } }] },
      passive({ name: "Una canzone sola", modifiers: { effectChancePercent: 10 } }),
    ),
  },
  {
    // PER 10, PSI 10, FUR 8: she hears every thought around her. She knows where you will be.
    code: "P043",
    name: "Fathom",
    faction: "heroes",
    rarity: "beta",
    stats: stats(6, 7, 2, 1, 1, 10, 3, 2, 10, 3, 4, 8),
    team: "rivali",
    kit: kit(
      "P043",
      { name: "Rumore di fondo", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Pensiero letto", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Tutte le voci", scaling: { PSI: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }] },
      passive({ name: "Prima di te", modifiers: { hitPercent: 8, critPercent: 6 } }),
    ),
  },
  {
    // ENE 8, MAG 8, FOR 7: he takes the heat out of the air and lets it out of his hands, or leaves the room frozen.
    code: "P044",
    name: "Kiln",
    faction: "villains",
    rarity: "beta",
    stats: stats(7, 3, 2, 1, 3, 5, 8, 8, 4, 4, 5, 7),
    team: "rivali",
    kit: kit(
      "P044",
      { name: "Mani roventi", scaling: { ENE: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "Serratura fusa", scaling: { ENE: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 60, ability: "ENE" } }] },
      { name: "Stanza gelata", scaling: { MAG: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 25, ability: "MAG" } }] },
      passive({ name: "Il primo fuoco", modifiers: { damageVsStatus: { status: "burn", percent: 30 } } }),
    ),
  },
  {
    // FUR 10, INT 8, VEL 7: the spy for hire. She gets behind the line, reads you, and vanishes.
    code: "P037",
    name: "Sordina",
    faction: "neutrals",
    rarity: "gamma",
    stats: stats(4, 7, 3, 8, 2, 2, 4, 1, 5, 6, 3, 10),
    team: "rivali",
    kit: kit(
      "P037",
      { name: "Lama silenziosa", scaling: { FUR: 0.7, INT: 0.3 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Fascicolo", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 60, ability: "INT" } }] },
      { name: "Chi paga di più", scaling: { FUR: 0.7, INT: 0.3 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "La lealtà si vende a parte", trigger: "knockout", effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }], modifiers: { critPercent: 8 } }),
    ),
  },
  {
    // TEC 10, ENE 9, INT 9: an old district system that decided to protect people, with forty arms of scrap.
    code: "P213",
    name: "Unbidden",
    faction: "heroes",
    rarity: "alfa",
    stats: stats(0, 5, 4, 9, 9, 9, 9, 1, 1, 1, 10, 0),
    team: "rivali",
    kit: kit(
      "P213",
      { name: "Braccio di scarto", scaling: { TEC: 0.7, INT: 0.3 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] },
      { name: "Quaranta braccia", scaling: { TEC: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.4, on: "all" }] },
      { name: "Nessuno me l'ha chiesto", scaling: { TEC: 0.6, VOL: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      passive({ name: "Solo ciò che è di scarto", trigger: "ally_down", limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "allies" }] }),
    ),
  },
  {
    // INT 10, ENE 10, PSI 10, RES 1: from the point where everything has already ended. Fragile, and bored.
    code: "P104",
    name: "Aion",
    faction: "villains",
    rarity: "omega",
    stats: stats(0, 1, 1, 10, 6, 8, 10, 8, 10, 1, 5, 1),
    team: "rivali",
    kit: kit(
      "P104",
      { name: "Eco della fine", scaling: { PSI: 0.5, ENE: 0.5 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Tempo fermo", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.7, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "PSI" } }] },
      { name: "È già finito", scaling: { ENE: 0.5, INT: 0.5 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }] },
      passive({ name: "Si annoia", trigger: "turn_start", limit: 3, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
];
