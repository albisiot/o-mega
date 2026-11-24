// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, first batch: the kits of the 25
// characters of the packs that players own most (all Delta), written from their card (abilities,
// Poteri, colour text). Each was simulated on its own card (scripts/simulate-combat.mts --report
// kits --batch 1). From here they go to the database (combat_kits) with a migration; the database
// is then the reference and the EDITOR changes them. Imports with their extension, so the
// simulator can load this file with Node.
import type { CombatKit } from "@o-mega/game-engine";
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";

export type CombatKitEntry = { code: string; name: string; faction: "heroes" | "villains" | "neutrals"; kit: CombatKit };

export const COMBAT_KITS_BATCH_1: CombatKitEntry[] = [
  {
    // INT 10, PER 9, TEC 9, FOR 0: solves equations at a glance, builds tools for the Lanterne out of the bins.
    code: "P003",
    name: "Kelvin",
    faction: "heroes",
    kit: kit(
      "P003",
      { name: "Calcolo al volo", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Attrezzo di fortuna", scaling: { TEC: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Equazione risolta", scaling: { INT: 0.7, PER: 0.3 }, effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 70, ability: "INT" } }] },
      passive({ name: "Dai cassonetti", trigger: "battle_start", limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "allies" }] }),
    ),
  },
  {
    // ENE 10, FOR 9, RES 9: stores energy in his body until it bursts; you hear him coming by the heat.
    code: "P005",
    name: "Pyrrhic",
    faction: "villains",
    kit: kit(
      "P005",
      { name: "Calore", scaling: { ENE: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Pressione", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Botto", scaling: { ENE: 0.7, FOR: 0.3 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Lo annuncia il calore", modifiers: { damagePercent: 12, hitPercent: -3 } }),
    ),
  },
  {
    // COM 8, VEL 7, TEC 7: drives the Custodi's armoured van and keeps it going with a wrench and tape.
    code: "P007",
    name: "Macadam",
    faction: "heroes",
    kit: kit(
      "P007",
      { name: "Chiave inglese", scaling: { COM: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Nastro adesivo", scaling: { TEC: 0.6, COM: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.9, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Blindato", scaling: { COM: 0.5, VEL: 0.5 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.55, on: "adjacent" }] },
      passive({ name: "Calci ben assestati", trigger: "hurt", scaling: { COM: 1 }, effects: [{ kind: "damage", multiplier: 0.45, to: "other" }] }),
    ),
  },
  {
    // FUR 8, INT 7, PER 7: learns voices, habits and signatures, and works for the Compagnia Lete from inside.
    code: "P008",
    name: "Understudy",
    faction: "villains",
    kit: kit(
      "P008",
      { name: "Firma falsa", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Voce imitata", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 60, ability: "INT" } }] },
      { name: "Dall'interno", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "vulnerable", turns: 2, on: "all", chance: { base: 55, ability: "INT" } }] },
      passive({ name: "Nessuno ricorda l'ufficio senza di lei", modifiers: { effectChancePercent: 10, critPercent: 8, damagePercent: 10 } }),
    ),
  },
  {
    // FOR 6, VOL 6, all-round: alone on the Custodi's night shift, he reads the next emergency six minutes early.
    code: "P009",
    name: "Dogwatch",
    faction: "heroes",
    kit: kit(
      "P009",
      { name: "Ronda", scaling: { FOR: 0.5, VOL: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Sei minuti d'anticipo", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 2, on: "all" }, { kind: "status", status: "haste", turns: 2, on: "all" }] },
      { name: "Turno di notte", scaling: { FOR: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "La condensa sui vetri", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "allies" }, { kind: "status", status: "fortify", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // VEL 6, TEC 6: always knows the way out, even in the strait's mad currents; the way back is extra.
    code: "P010",
    name: "Ferryman",
    faction: "neutrals",
    kit: kit(
      "P010",
      { name: "Remo", scaling: { VEL: 0.5, TEC: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Traghetto", scaling: { TEC: 0.6, VEL: 0.4 }, target: "ally", effects: [{ kind: "status", status: "haste", turns: 2, on: "primary" }, { kind: "shield", multiplier: 0.7, on: "primary" }] },
      { name: "Oltre il porto", scaling: { VEL: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "VEL" } }] },
      passive({ name: "Sa dov'è l'uscita", trigger: "low_vita", thresholdPercent: 50, limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 1.4, to: "self" }, { kind: "status", status: "haste", turns: 2, to: "self" }], modifiers: { speedPercent: 10, damagePercent: 8 } }),
    ),
  },
  {
    // PER 6, COM 6: comes with her lantern when the lights go out; machines tell her everything.
    code: "P012",
    name: "Vigil",
    faction: "heroes",
    kit: kit(
      "P012",
      { name: "Lanterna", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Luce nel buio", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 60, ability: "PER" } }] },
      { name: "Ancora qualche ora", scaling: { PER: 0.5, ENE: 0.5 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.7, on: "all" }, { kind: "shield", multiplier: 0.35, on: "all" }] },
      passive({ name: "Si fa dire tutto", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "empower", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // FOR 10, RES 9, COM 9, VEL 0: his knots never give; he does not run, he waits for you.
    code: "P013",
    name: "Hawser",
    faction: "heroes",
    kit: kit(
      "P013",
      { name: "Nodo", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] },
      { name: "Bitta", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.65, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Cima tesa", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "FOR" } }, { kind: "damage", multiplier: 0.35, on: "adjacent" }] },
      passive({ name: "Il carico passa alla bitta", trigger: "hurt", limit: 4, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.25, to: "self" }] }),
    ),
  },
  {
    // VEL 6, FUR 6: a minute after you saw him, nobody remembers his face, his voice or his name.
    code: "P014",
    name: "Lacuna",
    faction: "villains",
    kit: kit(
      "P014",
      { name: "Colpo dimenticato", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Faccia qualunque", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "FUR" } }] },
      { name: "Mai stato qui", scaling: { FUR: 0.7, INT: 0.3 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Pagato in contanti", modifiers: { critPercent: 10, damagePercent: 10, damageVsStatus: { status: "weaken", percent: 25 } } }),
    ),
  },
  {
    // PSI 8, INT 7, VOL 7: a teacher who hears the whole class think, so nobody copies.
    code: "P018",
    name: "Hornbook",
    faction: "heroes",
    kit: kit(
      "P018",
      { name: "Interrogazione", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Nessuno copia", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "PSI" } }] },
      { name: "Silenzio in classe", scaling: { PSI: 0.7, INT: 0.3 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 60, ability: "PSI" } }] },
      passive({ name: "Sente tutta la classe", modifiers: { hitPercent: 6, effectChancePercent: 6 } }),
    ),
  },
  {
    // COM 10, FOR 9, VEL 9, RES 0: the Compagnia Lete's boxer floors anyone; the first punch he takes is his last.
    code: "P019",
    name: "Cullet",
    faction: "villains",
    kit: kit(
      "P019",
      { name: "Diretto", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Gancio", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "COM" } }] },
      { name: "Al tappeto", scaling: { COM: 0.5, FOR: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "Mascella di vetro", modifiers: { damagePercent: 8, critPercent: 3 } }),
    ),
  },
  {
    // PER 10, VOL 9, COM 9: a bounty hunter who never loses a trail, and never hides it.
    code: "P022",
    name: "Warrant",
    faction: "neutrals",
    kit: kit(
      "P022",
      { name: "Pista", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Taglia", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Preso", scaling: { PER: 0.6, COM: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Non molla una pista", modifiers: { hitPercent: 5, damageVsStatus: { status: "vulnerable", percent: 20 } } }),
    ),
  },
  {
    // MAG 8, ENE 7, TEC 7: an apprentice whose spells work perfectly, just never as he meant them.
    code: "P024",
    name: "Typo",
    faction: "villains",
    kit: kit(
      "P024",
      { name: "Formula sbagliata", scaling: { MAG: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Bottone a caso", scaling: { MAG: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 35, ability: "MAG" } }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 30, ability: "MAG" } }] },
      { name: "Non era questo", scaling: { MAG: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 20, ability: "MAG" } }] },
      passive({ name: "Non legge le istruzioni", modifiers: { effectChancePercent: 10, hitPercent: -5 } }),
    ),
  },
  {
    // VEL 10, TEC 9: a backpack of extinguishers shoots her into the air; to stop she asks a wall.
    code: "P062",
    name: "Headway",
    faction: "heroes",
    kit: kit(
      "P062",
      { name: "Getto", scaling: { TEC: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Schiuma", scaling: { TEC: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.35, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "TEC" } }] },
      { name: "In aria", scaling: { VEL: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "Chiede aiuto a un muro", modifiers: { speedPercent: 10 } }),
    ),
  },
  {
    // ENE 8, COM 7: her hands melt locks, bars, armoured doors; and gloves, one pair a day.
    code: "P065",
    name: "Quicklime",
    faction: "villains",
    kit: kit(
      "P065",
      { name: "Mani che sciolgono", scaling: { ENE: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "Serratura sciolta", scaling: { ENE: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }] },
      { name: "Porta blindata", scaling: { ENE: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.65, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 40, ability: "ENE" } }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      passive({ name: "Un paio al giorno", trigger: "hit", effects: [{ kind: "status", status: "burn", turns: 1, to: "other", chance: { base: 25, ability: "ENE" } }] }),
    ),
  },
  {
    // TEC 9, FOR 8, RES 7: a robot made of the port's scraps, looking for a job; he loses parts at interviews.
    code: "P081",
    name: "Derelict",
    faction: "neutrals",
    kit: kit(
      "P081",
      { name: "Braccio meccanico", scaling: { TEC: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Pezzo di ricambio", scaling: { TEC: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Colloquio andato male", scaling: { TEC: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }] },
      passive({ name: "Paga a giornata", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "heal", multiplier: 0.6, to: "self" }] }),
    ),
  },
  {
    // RES 9, VEL 8, FUR 8: half gecko since the Ora Zero: she climbs walls and her tail grows back.
    code: "P083",
    name: "Cicatrix",
    faction: "heroes",
    kit: kit(
      "P083",
      { name: "Colpo di coda", scaling: { VEL: 0.5, FUR: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Sul muro", scaling: { RES: 1 }, target: "self", effects: [{ kind: "status", status: "haste", turns: 2, on: "primary" }, { kind: "shield", multiplier: 0.5, on: "primary" }] },
      { name: "Dall'alto", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "La coda ricresce", trigger: "turn_start", scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.16, to: "self" }] }),
    ),
  },
  {
    // RES 10, FUR 9, VOL 8: living mould from the metro tunnels; it spreads, corrodes, and never leaves.
    code: "P084",
    name: "Patina",
    faction: "villains",
    kit: kit(
      "P084",
      { name: "Muffa", scaling: { MAG: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 45, ability: "MAG" } }] },
      { name: "Si allarga sui muri", scaling: { MAG: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.25, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 35, ability: "MAG" } }] },
      { name: "Non se ne va mai", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 1, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      passive({ name: "Corrode chi la tocca", trigger: "hurt", effects: [{ kind: "status", status: "burn", turns: 1, to: "other", chance: { base: 30, ability: "MAG" } }] }),
    ),
  },
  {
    // PSI 9, INT 8: a small tourist from beyond the tear, on the wrong planet, queueing at the post office; he makes everyone wait.
    code: "P093",
    name: "Glip",
    faction: "neutrals",
    kit: kit(
      "P093",
      { name: "Domanda allo sportello", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Fila alle Poste", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Sportello chiuso", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 35, ability: "PSI" } }] },
      passive({ name: "Pianeta sbagliato", trigger: "battle_start", limit: 1, scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.6, to: "self" }] }),
    ),
  },
  {
    // ENE 10, VOL 7: shoots lasers from her eyes; every beam burns her sight a little, three pairs of glasses so far.
    code: "P095",
    name: "Raster",
    faction: "heroes",
    kit: kit(
      "P095",
      { name: "Sguardo", scaling: { ENE: 0.7, VOL: 0.3 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Laser", scaling: { ENE: 0.7, VOL: 0.3 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 40, ability: "ENE" } }] },
      { name: "Fascio pieno", scaling: { ENE: 0.8, VOL: 0.2 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Tre paia di occhiali", modifiers: { damagePercent: 8, hitPercent: -4 } }),
    ),
  },
  {
    // FUR 10, RES 8: a jelly from beyond the tear that slips under the door to sell you an insurance policy.
    code: "P096",
    name: "Huckster",
    faction: "villains",
    kit: kit(
      "P096",
      { name: "Sotto la porta", scaling: { FUR: 0.7, PSI: 0.3 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Polizza", scaling: { INT: 0.5, FUR: 0.5 }, target: "ally", effects: [{ kind: "shield", multiplier: 1, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Clausola in piccolo", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.5, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 45, ability: "PSI" } }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 35, ability: "PSI" } }] },
      passive({ name: "Gelatina", trigger: "hurt", effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 35, ability: "PSI" } }] }),
    ),
  },
  {
    // INT 10, VOL 10: a crime reporter who finds where a witness's memory was rewritten; the scar, not what was under it.
    code: "P150",
    name: "Blotter",
    faction: "neutrals",
    kit: kit(
      "P150",
      { name: "Intervista", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "La cicatrice", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "In prima pagina", scaling: { INT: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.65, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 40, ability: "INT" } }] },
      passive({ name: "Lo scoop", trigger: "hit", limit: 3, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, TEC 9, VOL 8: twenty-three years in recovered records and eleven thousand pages copied in secret.
    code: "P153",
    name: "Recusant",
    faction: "neutrals",
    kit: kit(
      "P153",
      { name: "Nastro", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Undicimila pagine", scaling: { INT: 0.6, TEC: 0.4 }, target: "all_allies", effects: [{ kind: "status", status: "empower", turns: 1, on: "all" }, { kind: "shield", multiplier: 0.25, on: "all" }] },
      { name: "Archivio aperto", scaling: { INT: 0.7, TEC: 0.3 }, effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 70, ability: "INT" } }] },
      passive({ name: "Il tesserino lo traccia", modifiers: { critPercent: 5, speedPercent: -5 } }),
    ),
  },
  {
    // VOL 10, INT 9, TEC 9: his garden's plants drink the pain already settled in someone's body.
    code: "P155",
    name: "Almoner",
    faction: "villains",
    kit: kit(
      "P155",
      { name: "Spina", scaling: { VOL: 0.5, TEC: 0.5 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] },
      { name: "Radici", scaling: { VOL: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 1, on: "primary" }] },
      { name: "Il giardino", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.6, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Dolore già depositato", modifiers: { healPercent: 20 } }),
    ),
  },
  {
    // INT 10, VOL 10, TEC 8: knows whose cup is whose and which step to avoid; took a man's place in eleven days.
    code: "P197",
    name: "Ademption",
    faction: "villains",
    kit: kit(
      "P197",
      { name: "Abitudine", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Il gradino da evitare", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.6, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      { name: "Al suo posto", scaling: { INT: 0.7, TEC: 0.3 }, effects: [{ kind: "damage", multiplier: 1.45, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "INT" } }] },
      passive({ name: "Undici giorni", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 30, ability: "INT" } }] }),
    ),
  },
];
