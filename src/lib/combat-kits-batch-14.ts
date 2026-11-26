// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, fourteenth and last batch: the last 24
// characters that do not come out of the packs, in code order (P328 to P351: 12 Beta, 8 Alfa,
// 4 Omega), written from their card (abilities, Poteri, colour text). Each was simulated on its own
// card (scripts/simulate-combat.mts --report kits --batch 14). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_14: CombatKitEntry[] = [
  {
    // PER 10, PSI 10, INT 8 (Beta): a former switchboard operator of the Faro squad who, headset on, hears the murmur of the whole city's thoughts and knows who is still out there.
    code: "P328",
    name: "Brusio",
    faction: "heroes",
    kit: kit(
      "P328",
      { name: "La cuffia", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Ti sento benissimo", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Il brusio della città", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Chi c'è ancora in giro", modifiers: { hitPercent: 8, effectChancePercent: 6 } }),
    ),
  },
  {
    // ENE 10, PER 8, VEL 7 (Beta): a glassmaker of the Faro squad who splits light into rays of seven colours to cut smoke and blind; believes in teams that bring everyone together.
    code: "P329",
    name: "Caleido",
    faction: "heroes",
    kit: kit(
      "P329",
      { name: "Raggio", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Acceca", scaling: { ENE: 0.6, PER: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Tutti i colori insieme", scaling: { ENE: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Anche le persone", trigger: "ally_down", limit: 1, effects: [{ kind: "status", status: "empower", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // VOL 10, COM 8, RES 8 (Beta): a Custodi agent who switches off the Signs around him: near him nobody, friend or foe, enjoys the advantages they had prepared.
    code: "P330",
    name: "Antidoto",
    faction: "heroes",
    kit: kit(
      "P330",
      { name: "Mani nude", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Qui niente trucchi", scaling: { VOL: 1 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.35, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "VOL" } }] },
      { name: "Né i tuoi né i miei", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Le spegne e basta", modifiers: { damageVsStatus: { status: "empower", percent: 20 }, effectChancePercent: 4 } }),
    ),
  },
  {
    // FOR 10, RES 10, COM 8 (Beta): a harbour docker, the strongest of the Faro squad, who throws cars and holds up collapsing bridges; arrives when the fight is half won, and closes it.
    code: "P331",
    name: "Argano",
    faction: "heroes",
    kit: kit(
      "P331",
      { name: "Lancia le auto", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.4, on: "primary" }] },
      { name: "Regge i ponti", scaling: { RES: 0.6, FOR: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.65, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Chiudo io", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Arrivo per ultima", trigger: "knockout", limit: 2, effects: [{ kind: "charge", amount: 2, to: "self" }] }),
    ),
  },
  {
    // FOR 10, INT 9, RES 9 (Beta): a Lete chemist who drinks his own serum: for a few minutes a swollen brute with amber veins, then he collapses for hours. Every time a gamble.
    code: "P332",
    name: "Siero",
    faction: "villains",
    kit: kit(
      "P332",
      { name: "Pugno gonfio", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Un sorso", scaling: { INT: 0.6, FOR: 0.4 }, target: "self", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Poi si vede", scaling: { FOR: 0.6, INT: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.35, on: "primary" }] },
      passive({ name: "Ogni volta è una scommessa", modifiers: { damagePercent: 10, hitPercent: -4 } }),
    ),
  },
  {
    // MAG 10, VOL 8, INT 7 (Beta): a preacher of the Figli who opens tears to places beyond Nuova Megara and plunders them; knows all about magic and has no need to fight.
    code: "P333",
    name: "Varco",
    faction: "villains",
    kit: kit(
      "P333",
      { name: "Lo strappo", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Ve lo porto io", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.8, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Oltre lo strappo", scaling: { MAG: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Fuori città è più forte", modifiers: { damagePercent: 6, effectChancePercent: 6 } }),
    ),
  },
  {
    // FOR 10, RES 10, VOL 8 (Beta): a former foundry worker in a Lete hydraulic exoskeleton who always strikes the same way; slow, noisy, impossible to stop.
    code: "P334",
    name: "Pressa",
    faction: "villains",
    kit: kit(
      "P334",
      { name: "Stesso passo", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Stessa forza", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "FOR" } }] },
      { name: "Tutti i giorni", scaling: { FOR: 0.6, VOL: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.75, on: "primary" }, { kind: "damage", multiplier: 0.55, on: "adjacent" }] },
      passive({ name: "Impossibile da fermare", trigger: "hurt", limit: 3, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // FUR 10, PER 8, INT 7 (Beta): a Lete saboteur with cuttlefish skin who takes the colour and grain of any place, brick, marble or dark; adapts to every ground and prefers to wait.
    code: "P335",
    name: "Seppia",
    faction: "villains",
    kit: kit(
      "P335",
      { name: "Ero il muro", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Sabotaggio", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Ora sono qui", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.25, on: "primary" }] },
      passive({ name: "Prende il colore del posto", trigger: "battle_start", limit: 1, scaling: { FUR: 1 }, effects: [{ kind: "shield", multiplier: 0.2, to: "self" }] }),
    ),
  },
  {
    // FUR 10, RES 10, VEL 7 (Beta): an elastic smuggler of the Sciolti who slips through pipes and under doors; once she finds what she does best, she is unbeatable.
    code: "P336",
    name: "Lattice",
    faction: "neutrals",
    kit: kit(
      "P336",
      { name: "Elastica", scaling: { FUR: 0.6, RES: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Sotto le porte", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Ci passo sempre", scaling: { FUR: 0.6, RES: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "La cosa che sa fare meglio", trigger: "hit", limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // ENE 10, VOL 9, INT 8 (Beta): a Banco collector who bends gravity, crushing, lifting and weighing debtors to settle the accounts; at her best when the match is even.
    code: "P337",
    name: "Baricentro",
    faction: "neutrals",
    kit: kit(
      "P337",
      { name: "Peso", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Schiaccia", scaling: { ENE: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "Rimette in pari i conti", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Tutto deve pesare quanto deve", modifiers: { hitPercent: 6, damagePercent: 4 } }),
    ),
  },
  {
    // ENE 10, TEC 8, VOL 8 (Beta): a scrap dealer of the Sciolti who commands iron: clouds of filings, bent beams, cars taken apart in a minute. Arrives when the match is decided, to close it.
    code: "P338",
    name: "Limatura",
    faction: "neutrals",
    kit: kit(
      "P338",
      { name: "Limatura", scaling: { ENE: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Travi piegate", scaling: { ENE: 0.6, TEC: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "Nuvola di ferro", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }] },
      passive({ name: "Il ferro mi ascolta", trigger: "knockout", effects: [{ kind: "charge", amount: 2, to: "self" }, { kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FUR 9, INT 9, MAG 8, PER 8 (Beta): a thief of the Sciolti who erases with his hand: what he touches turns to blank paper, flames, doors and others' advantages included.
    code: "P339",
    name: "Bianchetto",
    faction: "neutrals",
    kit: kit(
      "P339",
      { name: "Carta bianca", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Non c'era niente", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }] },
      { name: "Guarda: niente", scaling: { FUR: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Cancella i vantaggi", modifiers: { damageVsStatus: { status: "empower", percent: 20 }, critPercent: 4 } }),
    ),
  },
  {
    // COM 8, PER 7, VEL 7, VOL 7 (Alfa): an old fencing master of the Fosse gym, without a Sign, who teaches the Lanterne's youngsters; against great dangers two strikes are enough.
    code: "P340",
    name: "Stoccata",
    faction: "heroes",
    kit: kit(
      "P340",
      { name: "Sciabola", scaling: { COM: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Prima stoccata", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 50, ability: "COM" } }] },
      { name: "Seconda stoccata", scaling: { COM: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.45, on: "primary" }] },
      passive({ name: "Due bastano", modifiers: { damageVsStatus: { status: "vulnerable", percent: 25 } } }),
    ),
  },
  {
    // RES 10, VOL 10, FOR 8 (Alfa): an old harbour diver, the only one to go down into the rift under the gulf after Hour Zero; brings up a light of the deep that charges whoever fights after him.
    code: "P341",
    name: "Batiscafo",
    faction: "heroes",
    kit: kit(
      "P341",
      { name: "Scafandro", scaling: { RES: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Una luce degli abissi", scaling: { VOL: 0.6, RES: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.3, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Per chi viene dopo", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.15, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "La porto su", trigger: "turn_start", limit: 1, effects: [{ kind: "charge", amount: 1, to: "allies" }] }),
    ),
  },
  {
    // ENE 10, VOL 10, RES 9 (Alfa): a priestess of the Figli who carries the cold of the end, freezing waves, cobbles and breath; near her nobody gives their best.
    code: "P342",
    name: "Galaverna",
    faction: "villains",
    kit: kit(
      "P342",
      { name: "Respiro gelato", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Congela il selciato", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "ENE" } }] },
      { name: "È l'ultima ora che arriva", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Fa freddo, vero?", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 35, ability: "VOL" } }] }),
    ),
  },
  {
    // COM 10, PER 10, FOR 9, INT 9 (Alfa): the Lete's head of security, who sees the crack in every thing and every person and strikes there; whoever has a weak spot can no longer use it.
    code: "P343",
    name: "Falla",
    faction: "villains",
    kit: kit(
      "P343",
      { name: "La crepa", scaling: { PER: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Eccola", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Tutto ha una crepa", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }] },
      passive({ name: "Colpisce lì", modifiers: { damageVsStatus: { status: "vulnerable", percent: 20 }, critPercent: 4 } }),
    ),
  },
  {
    // INT 10, VOL 10, PER 9 (Alfa): a Lete collector for whom every weakness of whoever stands before her becomes a debt, whose interest she collects with a chain of glowing coins.
    code: "P344",
    name: "Mora",
    faction: "villains",
    kit: kit(
      "P344",
      { name: "Catena di monete", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Ogni debolezza è un debito", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }] },
      { name: "Incasso gli interessi", scaling: { INT: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "INT" } }] },
      passive({ name: "E io incasso", modifiers: { damageVsStatus: { status: "weaken", percent: 25 } } }),
    ),
  },
  {
    // COM 10, FOR 9, RES 9, VEL 9 (Alfa): the unbeaten champion of the Banco's arena, without a Sign; wants only fair duels and makes anyone fight with the best they have, nothing more.
    code: "P345",
    name: "Cintura",
    faction: "neutrals",
    kit: kit(
      "P345",
      { name: "Io e te", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Senza trucchi", scaling: { COM: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "status", status: "taunt", turns: 2, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Imbattuta", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Solo duelli alla pari", modifiers: { hitPercent: 6, critPercent: 6 } }),
    ),
  },
  {
    // RES 10, VOL 10, COM 9, PER 9 (Alfa): an old judo master of the Fosse; the stronger the opponent, the harder he throws him, and when it seems over he brings him down.
    code: "P346",
    name: "Rimonta",
    faction: "neutrals",
    kit: kit(
      "P346",
      { name: "Presa", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Più spingi", scaling: { COM: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "COM" } }] },
      { name: "Più cadi lontano", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "COM" } }] },
      passive({ name: "Quando sembra finita", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.2, to: "self" }, { kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PER 10, PSI 10, VEL 9 (Alfa): a getaway driver of the Sciolti who sees the next danger a moment before it comes, and is paid to get there before everyone else.
    code: "P347",
    name: "Preavviso",
    faction: "neutrals",
    kit: kit(
      "P347",
      { name: "Gira a sinistra", scaling: { PER: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Fra tre secondi", scaling: { PSI: 0.6, PER: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.4, on: "primary" }, { kind: "status", status: "haste", turns: 2, on: "primary" }] },
      { name: "Ci arriva prima", scaling: { VEL: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Sa già dove guarderanno", modifiers: { speedPercent: 8, critPercent: 6 } }),
    ),
  },
  {
    // ENE 10, FOR 9, RES 9, VOL 9 (Omega): the driver of the tram line under the temple; on the night of Hour Zero the shockwave got inside him and stayed. When he lets it out, all he has becomes one force.
    code: "P348",
    name: "Boato",
    faction: "heroes",
    kit: kit(
      "P348",
      { name: "Onda d'urto", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La trattiene", scaling: { RES: 0.6, VOL: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Stavolta la lascio uscire tutta", scaling: { ENE: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.1, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "ENE" } }] },
      passive({ name: "Una forza sola", trigger: "hurt", limit: 3, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // ENE 10, RES 10, VOL 10 (Omega): a firefighter who died on the night of Hour Zero in the power-plant collapse; every time he falls he rebuilds himself from the embers and fights again.
    code: "P349",
    name: "Favilla",
    faction: "heroes",
    kit: kit(
      "P349",
      { name: "Getto", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 25, ability: "ENE" } }] },
      { name: "Arriva col fumo", scaling: { RES: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }] },
      { name: "Dalle braci", scaling: { ENE: 0.6, VOL: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Mi avete già spento una volta", trigger: "low_vita", thresholdPercent: 25, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.4, to: "self" }] }),
    ),
  },
  {
    // ENE 10, INT 10, PSI 10 (Omega): the Lete's head of research, who strips Signs with his palm and keeps them under his skin as scars of light; takes for himself the advantages of whoever faces him.
    code: "P350",
    name: "Prelievo",
    faction: "villains",
    kit: kit(
      "P350",
      { name: "Il palmo", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Il tuo Segno è un prestito", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "PSI" } }, { kind: "status", status: "empower", turns: 1, on: "self" }] },
      { name: "Lo rivoglio", scaling: { PSI: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Cicatrici di luce", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PER 10, VEL 10, INT 9 (Omega): a photographer of the temple dig who came out of Hour Zero in negative, her values reversed: strong where she looks weak, weak where she looks strong.
    code: "P351",
    name: "Controluce",
    faction: "neutrals",
    kit: kit(
      "P351",
      { name: "In negativo", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Luce nera", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }] },
      { name: "Dove ti sembro debole", scaling: { VEL: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Valori rovesciati", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
];
