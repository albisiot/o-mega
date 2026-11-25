// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, seventh batch: the kits of the next 25
// characters of the packs that players own most without a kit (the last 5 Gamma, 10 Beta, 10 Alfa),
// written from their card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 7). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_7: CombatKitEntry[] = [
  {
    // RES 8, VOL 8, FOR 6 (Gamma): the Banco's porter, carries clients up eleven floors; every flight costs him a memory and gives him strength.
    code: "P119",
    name: "Gradus",
    faction: "neutrals",
    kit: kit(
      "P119",
      { name: "In spalla", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Undici piani", scaling: { RES: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "La vista migliora", scaling: { FOR: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Ogni rampa costa un ricordo", trigger: "turn_start", limit: 3, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // RES 10, FOR 9, VOL 9 (Gamma): union leader of the rune bearers; can carry the magical load of nine colleagues at once, so a strike brings nothing down.
    code: "P137",
    name: "Collegium",
    faction: "heroes",
    kit: kit(
      "P137",
      { name: "Il carico", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Non è la magia a tenere su", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Sciopero", scaling: { RES: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Vuole essere pagato", trigger: "hurt", limit: 2, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // COM 10, RES 10, FOR 7 (Alfa): the Banco's guarantee collector; dies in place of clients in good standing and is back at window 9 forty minutes later.
    code: "P227",
    name: "Residuo",
    faction: "heroes",
    kit: kit(
      "P227",
      { name: "Sportello 9", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Al posto loro", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Quaranta minuti dopo", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "heal", multiplier: 0.25, on: "self" }] },
      passive({ name: "Si ricompone", trigger: "low_vita", thresholdPercent: 20, limit: 1, scaling: { COM: 1 }, effects: [{ kind: "heal", multiplier: 0.6, to: "self" }] }),
    ),
  },
  {
    // FUR 10, ENE 9, VEL 9 (Gamma): feels wounds a minute or two before they happen, a few blocks away, and gets there first to move people a metre.
    code: "P162",
    name: "Praecursor",
    faction: "heroes",
    kit: kit(
      "P162",
      { name: "Arriva prima", scaling: { FUR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Un metro più in là", scaling: { VEL: 0.6, ENE: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Non ho più scuse", scaling: { FUR: 0.6, ENE: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }] },
      passive({ name: "Un minuto prima", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, VOL 10, INT 9 (Beta): heritage inspector; where her seal suspends the works, the ground can no longer be dug and the digs close at night.
    code: "P179",
    name: "Injunction",
    faction: "neutrals",
    kit: kit(
      "P179",
      { name: "Sigillo", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Sospensione lavori", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "PER" } }] },
      { name: "È ancora acceso", scaling: { PER: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "vulnerable", turns: 2, on: "all", chance: { base: 45, ability: "PER" } }] },
      passive({ name: "Un unico giro", modifiers: { effectChancePercent: 10, critPercent: 4 } }),
    ),
  },
  {
    // VOL 10, RES 8, MAG 7 (Gamma): no Segno; a Figli dell'Ultima fanatic with a faith no threat dents and a body that takes anything.
    code: "P039",
    name: "Credo",
    faction: "villains",
    kit: kit(
      "P039",
      { name: "Giuramento", scaling: { VOL: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Fede che non si scalfisce", scaling: { VOL: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Arrivare alla fine", scaling: { VOL: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Non ha detto di cosa", trigger: "low_vita", thresholdPercent: 30, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 10, VOL 10 (Alfa): a driverless combine harvester that has ploughed the same fields for years; where it passes the land turns fertile.
    code: "P113",
    name: "Harrow",
    faction: "neutrals",
    kit: kit(
      "P113",
      { name: "Lame", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Ara e semina", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      { name: "Resa prevista: sufficiente", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "shield", multiplier: 0.2, on: "all" }] },
      passive({ name: "Lo stampa ogni alba", trigger: "turn_start", scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.06, to: "self" }] }),
    ),
  },
  {
    // INT 9, PER 9, VOL 9 (Beta): customs officer from the tear hired by the Banco; her stamp switches off the powers of anyone without papers. Chained to the desk.
    code: "P130",
    name: "Gauger",
    faction: "neutrals",
    kit: kit(
      "P130",
      { name: "Timbro", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Modulo B", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 60, ability: "INT" } }] },
      { name: "In triplice copia", scaling: { INT: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 55, ability: "INT" } }] },
      passive({ name: "Motivo della visita?", modifiers: { effectChancePercent: 12, damagePercent: 10 } }),
    ),
  },
  {
    // COM 10, RES 10, VOL 8 (Beta): the Lete's collector; takes every blow without blinking, then presents the bill. Nearly blind, finds the debtor anyway.
    code: "P041",
    name: "Gavel",
    faction: "villains",
    kit: kit(
      "P041",
      { name: "Incasso", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Senza battere ciglio", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Il conto", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Presenta il conto", trigger: "hurt", limit: 2, effects: [{ kind: "charge", amount: 1, to: "self" }, { kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // ENE 8, RES 8, FOR 7 (Beta): Lete executive and walking reactor; absorbs every light and radiation and can only discharge by touch.
    code: "P049",
    name: "Blackbody",
    faction: "villains",
    kit: kit(
      "P049",
      { name: "Stretta che scotta", scaling: { ENE: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "Assorbe ogni luce", scaling: { ENE: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Contatore Geiger", scaling: { ENE: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Ogni stretta di mano", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "burn", turns: 2, to: "other", chance: { base: 40, ability: "ENE" } }] }),
    ),
  },
  {
    // MAG 10, PSI 10, VOL 10 (Alfa): turns to stone whoever meets her eyes; the stone is climbing her own skin, and she has avoided mirrors for years.
    code: "P079",
    name: "Effigy",
    faction: "villains",
    kit: kit(
      "P079",
      { name: "Sguardo", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Ti ferma con uno sguardo", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "MAG" } }] },
      { name: "Pietra", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary" }] },
      passive({ name: "Evita gli specchi", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "stun", turns: 1, to: "other", chance: { base: 20, ability: "MAG" } }] }),
    ),
  },
  {
    // FOR 10, RES 10, ENE 8 (Beta): a mechanical buffalo built to plough the Piana; defends the farmers' fields, above all from Lete lorries. Charges and cannot brake.
    code: "P129",
    name: "Bubalus",
    faction: "heroes",
    kit: kit(
      "P129",
      { name: "Corna", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Alla carica", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }] },
      { name: "Ara chiunque la tocchi", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Non sa frenare", modifiers: { damagePercent: 10, speedPercent: 4 } }),
    ),
  },
  {
    // ENE 10, RES 10, PER 9 (Alfa): for generations one of her family has hung in the Palladium Hall holding a shield over the city; when one gives way, the next takes over.
    code: "P141",
    name: "Palladium",
    faction: "heroes",
    kit: kit(
      "P141",
      { name: "Lo scudo", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Devia tutto", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }] },
      { name: "Tocca al prossimo", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.45, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Non ha lasciato cadere niente", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // PER 10, PSI 10, INT 9 (Beta): the Lete's curator of public happiness; takes suffering from millions and stores it all in a few registered volunteers.
    code: "P175",
    name: "Eudaemon",
    faction: "villains",
    kit: kit(
      "P175",
      { name: "Il contenitore", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Sposto", scaling: { PSI: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.85, on: "primary" }] },
      { name: "La città è felice", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.35, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "I contenitori no", trigger: "hit", limit: 3, scaling: { PSI: 1 }, effects: [{ kind: "heal", multiplier: 0.08, to: "allies" }] }),
    ),
  },
  {
    // MAG 10, VOL 10, RES 9 (Beta): once invited into a house he is its master, nothing happens there without his consent; uninvited, he cannot enter anywhere.
    code: "P176",
    name: "Hospes",
    faction: "villains",
    kit: kit(
      "P176",
      { name: "Bussare", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Porte che non si aprono", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Siete miei ospiti", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "MAG" } }] },
      passive({ name: "Mi avete fatto entrare", trigger: "hit", limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PER 10, VOL 10, ENE 9 (Gamma): from the tear, her species becomes what surrounds it; since the Ora Zero she has chosen to be human, and no instrument can tell.
    code: "P221",
    name: "Normal",
    faction: "heroes",
    kit: kit(
      "P221",
      { name: "Una passante", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Allenta la forma", scaling: { VOL: 0.6, ENE: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.55, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Una forma nuova", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Diventa ciò che la circonda", trigger: "hurt", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "self" }] }),
    ),
  },
  {
    // MAG 10, RES 10, VOL 10 (Alfa): the rock under the oracle temple, now an old man standing at the door; holds loads, closes cracks, and never moves from there.
    code: "P055",
    name: "Keelstone",
    faction: "heroes",
    kit: kit(
      "P055",
      { name: "Masso", scaling: { MAG: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Da qui non si passa", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Chiude le crepe", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "heal", multiplier: 0.2, on: "all" }] },
      passive({ name: "E nemmeno lui", trigger: "hurt", limit: 2, scaling: { MAG: 1 }, effects: [{ kind: "shield", multiplier: 0.08, to: "allies" }] }),
    ),
  },
  {
    // FOR 10, RES 10, MAG 9 (Beta): a boundary stone woken by the Ora Zero; exists only along borders, walls and thresholds, solid as stone, never a step away.
    code: "P139",
    name: "Herma",
    faction: "villains",
    kit: kit(
      "P139",
      { name: "Cippo", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Numero di particella", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }] },
      { name: "Soglia", scaling: { MAG: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Solido come la pietra", trigger: "turn_start", scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.06, to: "self" }] }),
    ),
  },
  {
    // MAG 10, RES 10, PER 9 (Alfa): the register of every spell cast in the city since the 1400s, now walking; where it passes, the debt is paid and magic goes out.
    code: "P181",
    name: "Principal",
    faction: "villains",
    kit: kit(
      "P181",
      { name: "Registro", scaling: { MAG: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Debito saldato", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }] },
      { name: "Quattrocentotrenta anni di interessi", scaling: { MAG: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 45, ability: "MAG" } }] },
      passive({ name: "Restate al caldo", trigger: "turn_start", limit: 2, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 25, ability: "MAG" } }] }),
    ),
  },
  {
    // FOR 10, RES 10, MAG 9 (Alfa): a colossus 140 metres tall, still above a mountain village for four generations; its weight turns aside landslides and other colossi.
    code: "P183",
    name: "Mainstay",
    faction: "heroes",
    kit: kit(
      "P183",
      { name: "Il peso", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Devia le frane", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Quando si muove", scaling: { FOR: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "FOR" } }] },
      passive({ name: "Quattro generazioni", modifiers: { speedPercent: -5, damagePercent: 10 } }),
    ),
  },
  {
    // FOR 10, RES 10, MAG 9 (Alfa): the city's oldest sovereign, woken in the temple digs; awake forty-one minutes every six days, a breathing statue the rest.
    code: "P184",
    name: "Antecessor",
    faction: "neutrals",
    kit: kit(
      "P184",
      { name: "Pietra che regge", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Il pavimento in file", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Quarantun minuti", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.55, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Una statua che respira", trigger: "battle_start", limit: 1, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.25, to: "self" }] }),
    ),
  },
  {
    // INT 10, MAG 10, PER 9 (Beta): someone's double from the tear, reality tries to erase her like a typo; she turns the correction onto whoever she touches.
    code: "P209",
    name: "Emendatio",
    faction: "villains",
    kit: kit(
      "P209",
      { name: "Refuso", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Corretto al posto suo", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }] },
      { name: "Variante d'autore", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary" }] },
      passive({ name: "Non sono un errore", trigger: "low_vita", thresholdPercent: 50, limit: 1, scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.35, to: "self" }] }),
    ),
  },
  {
    // FUR 10, VEL 9, VOL 9 (Beta): sixty dogs, crows, rats and two wolves with a single mind, grown in the dark of the metro. Forty minutes of sun and they scatter.
    code: "P212",
    name: "Warren",
    faction: "neutrals",
    kit: kit(
      "P212",
      { name: "Il branco", scaling: { FUR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Due lunghi, uno corto", scaling: { FUR: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 35, ability: "FUR" } }] },
      { name: "Territorio", scaling: { FUR: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }] },
      passive({ name: "Una mente sola", trigger: "hit", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PER 9, INT 8 (Alfa): the city's founding heroine, eighty-one, on her throne; around her every hostility dies down. She cannot tell a war from an objection.
    code: "P214",
    name: "Clementia",
    faction: "villains",
    kit: kit(
      "P214",
      { name: "Tesoro", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Il brutto tempo passa", scaling: { MAG: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 55, ability: "MAG" } }] },
      { name: "Le liti si chiudono", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.45, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Non distingue una guerra", modifiers: { effectChancePercent: 10, healPercent: 10 } }),
    ),
  },
  {
    // PSI 10, INT 9, PER 7 (Alfa): remembers the next forty-one hours as others remember yesterday, and forgets anything older than a minute.
    code: "P215",
    name: "Contromano",
    faction: "neutrals",
    kit: kit(
      "P215",
      { name: "Ci siamo già salutati", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Domani lei mi ha detto", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Ricorda ciò che vedrà", scaling: { PSI: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Le prossime quarantun ore", modifiers: { critPercent: 6, hitPercent: 10 } }),
    ),
  },
];
