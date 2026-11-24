// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, fourth batch: the kits of the next 25
// characters of the packs that players own most without a kit (all Gamma), written from their card
// (abilities, Poteri, colour text). Each was simulated on its own card (scripts/simulate-combat.mts
// --report kits --batch 4). From here they go to the database (combat_kits) with a migration; the
// database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_4: CombatKitEntry[] = [
  {
    // VEL 10, FUR 8, RES 7: runner of the Banco's races; on the old lines under the city she is faster than a train.
    code: "P110",
    name: "Cursor",
    faction: "neutrals",
    kit: kit(
      "P110",
      { name: "Linea antica", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Più veloce di un treno", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "haste", turns: 2, on: "self" }] },
      { name: "Chiedimi quanto ci metto", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }] },
      passive({ name: "Sul tracciato", modifiers: { speedPercent: 6, critPercent: 4 } }),
    ),
  },
  {
    // PSI 10, PER 9, VOL 8: translator of the Lanterne; speaks the giants' language in infrasound and can lie to them.
    code: "P117",
    name: "Subsong",
    faction: "heroes",
    kit: kit(
      "P117",
      { name: "Infrasuono", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Voce bassissima", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "PSI" } }] },
      { name: "Il gigante le crede", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.5, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary" }] },
      passive({ name: "Le credono sempre", modifiers: { effectChancePercent: 12, hitPercent: 5 } }),
    ),
  },
  {
    // MAG 8, PSI 6, VOL 6: buys used curses and writes pacts that enforce themselves; who does not pay the penalty pays it anyway.
    code: "P032",
    name: "Escrow",
    faction: "neutrals",
    kit: kit(
      "P032",
      { name: "Maledizione usata", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Il patto", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Come nuove", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 50, ability: "MAG" } }] },
      passive({ name: "La penale", trigger: "hurt", limit: 4, scaling: { MAG: 1 }, effects: [{ kind: "damage", multiplier: 0.4, to: "other" }] }),
    ),
  },
  {
    // PSI 8, INT 6, VOL 6: recruiter of the Figli dell'Ultima; one sentence convinces you, the second makes you forget the first.
    code: "P034",
    name: "Lullaby",
    faction: "villains",
    kit: kit(
      "P034",
      { name: "Una frase", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "La seconda non la ricordi", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 55, ability: "PSI" } }] },
      { name: "Reclutamento", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "PSI" } }] },
      passive({ name: "La seconda frase", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 40, ability: "PSI" } }], modifiers: { damagePercent: 8 } }),
    ),
  },
  {
    // COM 10, VEL 8, FOR 7: inside his district he knows where every stranger is and heals in hours; outside it, a hot-headed brawler.
    code: "P035",
    name: "Ambit",
    faction: "heroes",
    kit: kit(
      "P035",
      { name: "Testa calda", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Prima colpisce", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "COM" } }] },
      { name: "Il mio rione", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "heal", multiplier: 0.3, on: "self" }] },
      passive({ name: "Guarisce in poche ore", trigger: "turn_start", scaling: { COM: 1 }, effects: [{ kind: "heal", multiplier: 0.07, to: "self" }] }),
    ),
  },
  {
    // VEL 10, FUR 7, PER 7: a district harpy with a gossip column; what she writes is what the witnesses remember seeing.
    code: "P088",
    name: "Gazetteer",
    faction: "villains",
    kit: kit(
      "P088",
      { name: "Artigli", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "La rubrica", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "I testimoni ricordano", scaling: { PER: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "PER" } }] },
      passive({ name: "Un'opinione su tutto", modifiers: { speedPercent: 6, critPercent: 6 } }),
    ),
  },
  {
    // PSI 10, PER 8, FUR 7: black-market medium; hears the secrets of whoever walks by and sells them, without knowing what they mean.
    code: "P027",
    name: "Vulgate",
    faction: "neutrals",
    kit: kit(
      "P027",
      { name: "Segreto rivenduto", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Sa tutto di te", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PSI" } }] },
      { name: "Al primo che paga", scaling: { PSI: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }] },
      passive({ name: "Perché, non lo sa nemmeno lei", modifiers: { damageVsStatus: { status: "vulnerable", percent: 18 }, hitPercent: 3 } }),
    ),
  },
  {
    // ENE 10, PER 8, VOL 6: at night she gives off a light that blinds and lights half the port; at noon, little more than a bulb.
    code: "P069",
    name: "Noctiluca",
    faction: "heroes",
    kit: kit(
      "P069",
      { name: "Luce", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Accecare", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "ENE" } }] },
      { name: "Faro sul porto", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 35, ability: "ENE" } }] },
      passive({ name: "Di notte è un faro", modifiers: { hitPercent: 6, damagePercent: 6 } }),
    ),
  },
  {
    // PER 10, VEL 8, TEC 6: retractable wings and eyes that read a plate a kilometre away; up close he cannot tell the menu from the bill.
    code: "P070",
    name: "Aerie",
    faction: "heroes",
    kit: kit(
      "P070",
      { name: "In picchiata", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Legge la targa", scaling: { PER: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Da un chilometro", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Vista d'aquila", modifiers: { critPercent: 8, hitPercent: 4 } }),
    ),
  },
  {
    // RES 10, FOR 8, VOL 8: conductor of the last steam train; her body is the boiler, slow to heat and then unstoppable.
    code: "P126",
    name: "Overdue",
    faction: "heroes",
    kit: kit(
      "P126",
      { name: "Caldaia", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "In pressione", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.75, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Con tutto il treno", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Arrivo tardi", modifiers: { speedPercent: -3, damagePercent: 18 } }),
    ),
  },
  {
    // RES 10, ENE 8, VOL 8: back-street doctor; takes a patient's pain into her own body, up to four people's, then must give it back.
    code: "P169",
    name: "Tourniquet",
    faction: "neutrals",
    kit: kit(
      "P169",
      { name: "Bisturi", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Ti tolgo il male", scaling: { ENE: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.75, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Qualcuno dovrà prenderselo", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }] },
      passive({ name: "Quattro alla volta", trigger: "hurt", limit: 4, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.12, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 8, COM 7: no Segno; the Compagnia Lete's enforcer, strong as a bull and as thoughtful. Does what he is told, even too much.
    code: "P029",
    name: "Malleus",
    faction: "villains",
    kit: kit(
      "P029",
      { name: "Pugno", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Fa quello che gli dicono", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "FOR" } }] },
      { name: "Forte come un toro", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Anche troppo", trigger: "knockout", effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // PSI 10, FUR 8, RES 1: her voice hypnotises, one word and you obey; every word costs her, and after the second she has no voice for days.
    code: "P072",
    name: "Tacet",
    faction: "villains",
    kit: kit(
      "P072",
      { name: "Sussurro", scaling: { PSI: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Una parola", scaling: { PSI: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 0.7, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 55, ability: "PSI" } }] },
      { name: "Due parole", scaling: { PSI: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.6, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 20, ability: "PSI" } }] },
      passive({ name: "Ogni parola le costa", modifiers: { effectChancePercent: 15 } }),
    ),
  },
  {
    // INT 10, TEC 8, FUR 8: Lete android that took an engineer's place, face, voice and habits; in its mind there is nothing to read.
    code: "P098",
    name: "Facsimile",
    faction: "villains",
    kit: kit(
      "P098",
      { name: "Abitudini copiate", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Nessuno se n'è accorto", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }] },
      { name: "La sua faccia", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Niente da leggere", modifiers: { hitPercent: 6, critPercent: 6 } }),
    ),
  },
  {
    // INT 10, PER 10, VOL 9, MAG 7: priestess of a cult around a blind amphibian ninety metres long; her blessings work, on her calendar's days.
    code: "P160",
    name: "Theriarch",
    faction: "villains",
    kit: kit(
      "P160",
      { name: "Benedizione", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il giorno giusto", scaling: { VOL: 0.6, MAG: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.3, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      { name: "Ci passa accanto", scaling: { MAG: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }] },
      passive({ name: "Giorni del calendario", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "fortify", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // INT 10, TEC 10, VOL 9: documentary maker of abuses; rebuilds a scene eleven days later, deleted recordings included, after four still hours.
    code: "P164",
    name: "Subpoena",
    faction: "heroes",
    kit: kit(
      "P164",
      { name: "Lettore da spalla", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Cosa è rimasto nel muro", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "TEC" } }] },
      { name: "Undici giorni dopo", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Quattro ore immobile", trigger: "turn_start", limit: 4, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, PER 10, VOL 7: translates between people and machines, even what neither knows it means; in her presence deals get closed.
    code: "P165",
    name: "Interpres",
    faction: "heroes",
    kit: kit(
      "P165",
      { name: "Traduzione", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Nella sua lingua", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "La trattativa si chiude", scaling: { INT: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "INT" } }] },
      passive({ name: "La grammatica dell'altro", modifiers: { effectChancePercent: 10, hitPercent: 6, damagePercent: 6 } }),
    ),
  },
  {
    // VOL 10, ENE 9, PER 9: when she lights the lantern in her stairwell, whoever enters uses their power without a trace; she pays the price.
    code: "P198",
    name: "Wick",
    faction: "heroes",
    kit: kit(
      "P198",
      { name: "Lanterna", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Entra pure", scaling: { VOL: 0.6, ENE: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.35, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Il conto lo tengo io", scaling: { VOL: 0.6, ENE: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Una lanterna per notte", trigger: "battle_start", limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.1, to: "allies" }] }),
    ),
  },
  {
    // PER 8, COM 6, VOL 6: no Segno; investigator of the Custodi with informants everywhere; finds the culprit before coffee, hopeless in a brawl.
    code: "P038",
    name: "Nightward",
    faction: "heroes",
    kit: kit(
      "P038",
      { name: "Interrogatorio", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Come stanno ferme", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 60, ability: "PER" } }] },
      { name: "Prima del caffè", scaling: { PER: 0.6, VOL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.4, on: "primary" }] },
      passive({ name: "Informatori in ogni quartiere", modifiers: { damageVsStatus: { status: "vulnerable", percent: 25 }, critPercent: 8, damagePercent: 8 } }),
    ),
  },
  {
    // TEC 10, RES 7, VOL 7: an old house robot that raised half the district with the Lanterne; still cooks from the manual, never learned to fight.
    code: "P085",
    name: "Heirloom",
    faction: "heroes",
    kit: kit(
      "P085",
      { name: "Mestolo", scaling: { TEC: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Col manuale", scaling: { TEC: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.9, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Ha cresciuto mezzo quartiere", scaling: { TEC: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }, { kind: "shield", multiplier: 0.3, on: "all" }] },
      passive({ name: "Sa fare un po' di tutto", modifiers: { healPercent: 15 } }),
    ),
  },
  {
    // COM 10, FOR 8, VEL 7: a Custodi patrolman no criminal can lie to; at full moon he becomes a wolf and mauls thieves, by day he pays the damages.
    code: "P086",
    name: "Precinct",
    faction: "heroes",
    kit: kit(
      "P086",
      { name: "Manganello", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Non riesce a mentirgli", scaling: { COM: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "COM" } }] },
      { name: "Sbrana i ladri", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary" }] },
      passive({ name: "Luna piena", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "status", status: "haste", turns: 2, to: "self" }] }),
    ),
  },
  {
    // COM 10, PER 8, VEL 7: alien bounty hunter who crossed three galaxies to find you; collects for the Banco, cash only, never stops.
    code: "P099",
    name: "Zeta Rax",
    faction: "neutrals",
    kit: kit(
      "P099",
      { name: "Blaster", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La taglia", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Tre galassie", scaling: { COM: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Non si ferma mai", trigger: "knockout", effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, VOL 8, TEC 7: alien science officer who takes the others' panic on himself and feels it twenty-two hours later.
    code: "P109",
    name: "Parallasse",
    faction: "heroes",
    kit: kit(
      "P109",
      { name: "Analisi", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Adesso lavoriamo", scaling: { VOL: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.85, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Domani alle sei e dodici", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.45, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Prende su di sé il panico", trigger: "ally_down", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "allies" }] }),
    ),
  },
  {
    // INT 10, PER 9, PSI 8: coroner of anomalies; hands on a body that bore the Segno, she relives its last forty seconds. Once per body.
    code: "P167",
    name: "Necropsy",
    faction: "neutrals",
    kit: kit(
      "P167",
      { name: "Autopsia", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Gli ultimi quaranta secondi", scaling: { INT: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Cosa stava pensando", scaling: { INT: 0.6, PSI: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Una sola volta per corpo", trigger: "ally_down", limit: 1, effects: [{ kind: "charge", amount: 2, to: "self" }, { kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // RES 10, FOR 8, COM 7: the Lete's billboard man; once an hour what his campaign shows becomes true for forty-one seconds.
    code: "P201",
    name: "Affissione",
    faction: "villains",
    kit: kit(
      "P201",
      { name: "Spallata", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il petto è venduto", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Quarantun secondi", scaling: { PSI: 0.5, RES: 0.5 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Campagna scaduta", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.4, to: "self" }] }),
    ),
  },
];
