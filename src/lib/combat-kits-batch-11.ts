// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, eleventh batch: the next 25 characters
// that do not come out of the packs, in code order (P253 to P277: 10 Delta, 6 Gamma, 4 Beta, 3 Alfa,
// 2 Omega), written from their card (abilities, Poteri, colour text). Each was simulated on its own
// card (scripts/simulate-combat.mts --report kits --batch 11). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_11: CombatKitEntry[] = [
  {
    // INT 10, VOL 10, PER 9 (Beta): an admiral of the Novecielo left without a fleet by the tear; alone an old man in a heavy coat, with a team around him he commands again.
    code: "P253",
    name: "Plancia",
    faction: "villains",
    kit: kit(
      "P253",
      { name: "Cappotto pesante", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Datemi una squadra", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "empower", turns: 1, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Ordini della flotta", scaling: { INT: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "INT" } }] },
      passive({ name: "Un uomo con un cappotto", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // COM 9, VEL 8, MAG 7 (Beta): a duellist hunter of the Silent Blade over a thousand years old; every blade that fails to kill him he records, and it never wounds him again.
    code: "P254",
    name: "Legatura",
    faction: "villains",
    kit: kit(
      "P254",
      { name: "Registro delle lame", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Vieni a uccidermi", scaling: { COM: 0.6, MAG: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }, { kind: "status", status: "taunt", turns: 1, on: "primary" }] },
      { name: "Ho ancora spazio in fondo", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Ogni lama che non lo uccide", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "fortify", turns: 1, to: "self" }], modifiers: { damageVsStatus: { status: "empower", percent: 20 } } }),
    ),
  },
  {
    // PER 8, TEC 8, VEL 8 (Beta): a smuggler captain, at home on strange routes, in storms and in places with crooked rules; as soon as it turns bad, he runs.
    code: "P255",
    name: "Franchigia",
    faction: "neutrals",
    kit: kit(
      "P255",
      { name: "Rotta storta", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Le faccio pagare", scaling: { PER: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "PER" } }] },
      { name: "Le altre le faccio io", scaling: { VEL: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.35, on: "primary" }] },
      passive({ name: "Appena si mette male", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { VEL: 1 }, effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }, { kind: "shield", multiplier: 0.3, to: "self" }] }),
    ),
  },
  {
    // INT 10, PER 9, TEC 9 (Beta): the Novecielo's court interpreter robot, now at the Banco; speaks four hundred languages and understands anything written, cannot throw a punch.
    code: "P256",
    name: "Glossa",
    faction: "neutrals",
    kit: kit(
      "P256",
      { name: "Quattrocento lingue", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Capisce tutto ciò che è scritto", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "In nessuna suona meglio", scaling: { INT: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "INT" } }] },
      passive({ name: "Non sa tirare un pugno", modifiers: { effectChancePercent: 10, critPercent: 6, damagePercent: 3 } }),
    ),
  },
  {
    // VOL 10, INT 9, PER 8 (Alfa): a teacher leading the border worlds' refugee column; puts every decision to the vote, and when the column is losing she always finds a way.
    code: "P257",
    name: "Appello",
    faction: "heroes",
    kit: kit(
      "P257",
      { name: "L'appello", scaling: { VOL: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Ai voti", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.25, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Una strada", scaling: { VOL: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.45, on: "all" }, { kind: "status", status: "haste", turns: 1, on: "all" }] },
      passive({ name: "Quando la colonna sta perdendo", trigger: "ally_down", limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.25, to: "allies" }] }),
    ),
  },
  {
    // COM 10, MAG 10, VEL 9 (Alfa): a fallen duellist of the Silent Blade with a whip of Trama crackling with lightning; after each win, terror walks ahead of her.
    code: "P258",
    name: "Sferza",
    faction: "villains",
    kit: kit(
      "P258",
      { name: "Frusta di Trama", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Fulmini", scaling: { MAG: 0.6, COM: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "MAG" } }, { kind: "damage", multiplier: 0.3, on: "adjacent" }] },
      { name: "Il prossimo ha già paura", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Ogni volta che vinco", trigger: "knockout", effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 30, ability: "MAG" } }] }),
    ),
  },
  {
    // MAG 10, VOL 10, PER 8 (Alfa): an old exiled master of the Silent Blade; knows his task is to step aside, and when he fades into the Trama his companions fight harder.
    code: "P259",
    name: "Commiato",
    faction: "neutrals",
    kit: kit(
      "P259",
      { name: "Lezione", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Insegnare", scaling: { VOL: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.4, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "L'ultima lezione", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.3, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "Farsi da parte", trigger: "low_vita", thresholdPercent: 30, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // PSI 10, MAG 9, VOL 9 (Omega): the last great master of the Silent Blade; wraps whoever looks at her in a fog of Trama, and they come out not remembering whom they saw.
    code: "P260",
    name: "Caligine",
    faction: "heroes",
    kit: kit(
      "P260",
      { name: "Nebbia di Trama", scaling: { PSI: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Non hai visto nessuno", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "PSI" } }] },
      { name: "Ricordatelo", scaling: { PSI: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 45, ability: "PSI" } }] },
      passive({ name: "Chi ne esce non ricorda", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 45, ability: "PSI" } }] }),
    ),
  },
  {
    // ENE 10, PSI 10, VOL 10 (Omega): the regent who has held the Novecielo's empty throne by proxy for nineteen years; lightning runs between his fingers, and his servants grow twice as strong.
    code: "P261",
    name: "Interregno",
    faction: "villains",
    kit: kit(
      "P261",
      { name: "Fulmini tra le dita", scaling: { ENE: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Chi lo serve", scaling: { PSI: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Il trono vuoto", scaling: { ENE: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "ENE" } }] },
      passive({ name: "Non si alza mai dal trono", modifiers: { speedPercent: -4, damagePercent: 8 } }),
    ),
  },
  {
    // RES 9, VOL 9, TEC 7 (Delta): cook of the Hill Folk's company out of the tear in the temple crypts; feeds the refugees in the necropolis. Endures what bends a soldier.
    code: "P262",
    name: "Stoppia",
    faction: "heroes",
    kit: kit(
      "P262",
      { name: "Mestolo di ferro", scaling: { RES: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Prima si mangia", scaling: { VOL: 0.6, TEC: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.95, on: "primary" }] },
      { name: "Il mondo si salva dopo", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.55, on: "all" }] },
      passive({ name: "Le gambe corte", modifiers: { healPercent: 12, hitPercent: 4 } }),
    ),
  },
  {
    // RES 10, VOL 9, COM 8 (Delta): a squire of the Gorge garrison in the Marches of Arcadia; held the temple pass while the company fled, and still guards the arch.
    code: "P263",
    name: "Torrione",
    faction: "heroes",
    kit: kit(
      "P263",
      { name: "Il varco", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Indietro di un passo?", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Il turno non è mai finito", scaling: { RES: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.35, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Non me l'hanno mai insegnato", trigger: "hurt", limit: 4, effects: [{ kind: "status", status: "fortify", turns: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, VEL 7, FUR 6 (Delta): a young tracker of the Forest Folk with wood-grained skin; reads a trail in the moss three days on, and finds those lost in the ruins' parks.
    code: "P264",
    name: "Muschio",
    faction: "heroes",
    kit: kit(
      "P264",
      { name: "Traccia nel muschio", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Le impronte non mentono", scaling: { PER: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Ritrova chi si perde", scaling: { PER: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.15, on: "primary" }] },
      passive({ name: "Tre giorni dopo", modifiers: { damageVsStatus: { status: "vulnerable", percent: 20 }, hitPercent: 4 } }),
    ),
  },
  {
    // COM 9, RES 9, FOR 8 (Delta): a soldier of the Sovereign Nomina with a wax seal pressed on his forehead; obeys whoever holds the stamp, and the Figli dell'Ultima found one.
    code: "P265",
    name: "Ceralacca",
    faction: "villains",
    kit: kit(
      "P265",
      { name: "Obbedisce", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Il timbro", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "COM" } }] },
      { name: "Aspetta che il sigillo parli", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Una volontà sua non ce l'ha", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 9, COM 8 (Delta): a granite-skinned quarryman of the Ferrigni; Nomina erased his name with wax and he forgot everything else. The Lete rents him for demolitions.
    code: "P266",
    name: "Macigno",
    faction: "villains",
    kit: kit(
      "P266",
      { name: "Granito", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Per spostare un muro", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Dove la porto, questa?", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.15, on: "primary" }] },
      passive({ name: "C'era una montagna", trigger: "hurt", limit: 2, scaling: { FOR: 1 }, effects: [{ kind: "shield", multiplier: 0.12, to: "self" }] }),
    ),
  },
  {
    // INT 9, PER 9, VOL 7 (Delta): the Sovereign's collector of names, who wrote who was to be remembered; now the Lete pays him to register whoever arrives from the tear.
    code: "P267",
    name: "Anagrafe",
    faction: "villains",
    kit: kit(
      "P267",
      { name: "Il registro", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Chi va ricordato", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Il resto lo dirà il registro", scaling: { INT: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "PER" } }] },
      passive({ name: "Nome, provenienza, giorno", modifiers: { effectChancePercent: 8, hitPercent: 8 } }),
    ),
  },
  {
    // PER 8, FOR 7, FUR 7 (Delta): a boatwoman of the canals under the necropolis who ferried the company out of the crypts without a question; knows every passage in the dark.
    code: "P268",
    name: "Guado",
    faction: "neutrals",
    kit: kit(
      "P268",
      { name: "Remo nel buio", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Senza fare domande", scaling: { PER: 0.6, FOR: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Quante candele avete", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Ogni passaggio al buio", modifiers: { hitPercent: 6, speedPercent: 6 } }),
    ),
  },
  {
    // INT 8, PER 8, MAG 6 (Delta): a Forest Folk herbalist with a stall at the covered market; her tinctures heal what the city's doctors cannot recognise. It stings, that's why it works.
    code: "P269",
    name: "Ortica",
    faction: "neutrals",
    kit: kit(
      "P269",
      { name: "Tintura", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "INT" } }] },
      { name: "Brucia, lo so", scaling: { INT: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 1, on: "primary" }] },
      { name: "Per questo funziona", scaling: { INT: 0.6, MAG: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.55, on: "all" }] },
      passive({ name: "Quello che i medici non riconoscono", modifiers: { healPercent: 12 } }),
    ),
  },
  {
    // PER 9, FUR 8, INT 8, VEL 8 (Delta): a chancellor who held the Seal for a year and stamped himself all over; now trails the company through the alleys, always a step behind.
    code: "P270",
    name: "Postilla",
    faction: "neutrals",
    kit: kit(
      "P270",
      { name: "Un passo indietro", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Ho timbrato tutto", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      { name: "Ridatemelo", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Era mio", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 40, ability: "INT" } }] }),
    ),
  },
  {
    // PER 9, RES 9, VOL 8 (Delta): a guide of the Marches' passes, white-haired since an avalanche held her a whole night; now leads night groups to the volcano's rim. Tireless.
    code: "P271",
    name: "Brina",
    faction: "neutrals",
    kit: kit(
      "P271",
      { name: "Piccozza", scaling: { PER: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Su in cima comando io", scaling: { VOL: 0.6, PER: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "La valanga", scaling: { PER: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "PER" } }] },
      passive({ name: "Non la stanca niente", trigger: "turn_start", scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.05, to: "self" }] }),
    ),
  },
  {
    // PER 10, VEL 8 (Gamma): the Forest Folk's archer; nobody in the city sees farther, and when the perfect shot is needed she finds it.
    code: "P272",
    name: "Cocca",
    faction: "heroes",
    kit: kit(
      "P272",
      { name: "Freccia", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Vede più lontano", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Quella giusta", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Una freccia basta", modifiers: { critPercent: 6, hitPercent: 4 } }),
    ),
  },
  {
    // VEL 10, COM 8, FOR 8 (Gamma): a knight of the Marches' plains who led the first charge of every battle; in Nuova Megara she clears the avenues when the Custodi must hurry.
    code: "P273",
    name: "Sperone",
    faction: "heroes",
    kit: kit(
      "P273",
      { name: "Lancia", scaling: { VEL: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "La prima carica", scaling: { VEL: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "VEL" } }] },
      { name: "Apre la strada", scaling: { VEL: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Qualcuno deve partire per primo", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // COM 9, VOL 9, PER 7 (Gamma): heir of a fallen kingdom of the Marches, interdicted by the Academy: her name cannot be said, and whoever hears it forgets. After each win, for a moment, all remember.
    code: "P274",
    name: "Vessillo",
    faction: "heroes",
    kit: kit(
      "P274",
      { name: "Stendardo strappato", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Sotto lo stendardo", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Chiedimelo dopo una vittoria", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Per un momento tutti ricordano", trigger: "knockout", effects: [{ kind: "status", status: "empower", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // FOR 10, COM 9, RES 8 (Gamma): the Sovereign Nomina's executioner, arms tattooed with the accounts he closed; the Lete sends him to collect debts, and he comes when it is almost done.
    code: "P275",
    name: "Scure",
    faction: "villains",
    kit: kit(
      "P275",
      { name: "La scure", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Conto chiuso", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "FOR" } }] },
      { name: "Il resto lo finisco io", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Arriva quando è quasi finita", trigger: "knockout", limit: 2, effects: [{ kind: "charge", amount: 2, to: "self" }, { kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FUR 9, MAG 7, VEL 7 (Gamma): one of Nomina's Erased, who lost name and body; what is left of her is the last light of evening, stronger as things calm and the light falls.
    code: "P276",
    name: "Imbrunire",
    faction: "villains",
    kit: kit(
      "P276",
      { name: "Ultima luce", scaling: { FUR: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Spegnete pure le luci", scaling: { MAG: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.35, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      { name: "Il buio lo porto io", scaling: { FUR: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Quando la luce cala", modifiers: { damageVsStatus: { status: "weaken", percent: 20 }, critPercent: 4 } }),
    ),
  },
  {
    // ENE 10, FOR 9, RES 9 (Gamma): an automaton of the Sovereign's forges with two bellows for lungs and a furnace in its chest; the Lete bought it for the power plant.
    code: "P277",
    name: "Mantice",
    faction: "villains",
    kit: kit(
      "P277",
      { name: "Scintilla", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "Due mantici", scaling: { ENE: 0.6, FOR: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "La fornace", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "A ogni respiro", trigger: "turn_start", limit: 3, effects: [{ kind: "status", status: "burn", turns: 1, to: "enemies", chance: { base: 20, ability: "ENE" } }] }),
    ),
  },
];
