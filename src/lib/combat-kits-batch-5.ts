// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, fifth batch: the kits of the next 25
// characters of the packs that players own most without a kit (16 Gamma, 5 Beta, 4 Alfa), written
// from their card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 5). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_5: CombatKitEntry[] = [
  {
    // TEC 10, VOL 8, ENE 7 (Gamma): astronaut back from space in an armour; finds her way by the stars even underground, never by stealth.
    code: "P097",
    name: "Sextant",
    faction: "heroes",
    kit: kit(
      "P097",
      { name: "Guanto dell'armatura", scaling: { TEC: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Rotta sulle stelle", scaling: { TEC: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "TEC" } }] },
      { name: "Rientro dall'orbita", scaling: { TEC: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }] },
      passive({ name: "Si orienta anche sotto terra", modifiers: { hitPercent: 8, damagePercent: 6 } }),
    ),
  },
  {
    // INT 10, TEC 8, PER 7 (Gamma): old hero come from the future with a jetpack; feels the pain of a wound before it lands.
    code: "P100",
    name: "Retrograde",
    faction: "heroes",
    kit: kit(
      "P100",
      { name: "Jetpack", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Lo sentivo arrivare", scaling: { INT: 0.6, TEC: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Prima si stava meglio", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.35, on: "primary" }] },
      passive({ name: "Il dolore prima della ferita", trigger: "battle_start", limit: 1, scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "self" }] }),
    ),
  },
  {
    // ENE 10, MAG 9, VEL 9 (Alfa): the wind down from the volcano, a being of air sold by the Lete as a climate service; disturbed, it blows forty below.
    code: "P122",
    name: "Katabatic",
    faction: "villains",
    kit: kit(
      "P122",
      { name: "Vento che scende", scaling: { ENE: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Aria gelata", scaling: { ENE: 0.6, MAG: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "ENE" } }, { kind: "damage", multiplier: 0.3, on: "adjacent" }] },
      { name: "Quaranta sotto zero", scaling: { MAG: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 35, ability: "MAG" } }] },
      passive({ name: "Più scende, più corre", trigger: "hit", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, MAG 9, FUR 8 (Gamma): the city's official portraitist; nothing she paints stays ugly, the work corrects itself within forty minutes.
    code: "P170",
    name: "Pentimento",
    faction: "neutrals",
    kit: kit(
      "P170",
      { name: "Pennellata", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Ritocco", scaling: { MAG: 0.6, PER: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.95, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Guardi cos'è venuto fuori", scaling: { MAG: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }, { kind: "shield", multiplier: 0.2, on: "all" }] },
      passive({ name: "Si corregge da sola", trigger: "hurt", limit: 2, scaling: { MAG: 1 }, effects: [{ kind: "heal", multiplier: 0.2, to: "self" }] }),
    ),
  },
  {
    // PER 10, VOL 10, MAG 9 (Gamma): the Banco's steelyard; weighs what a person is worth in nine seconds and evens out, taking from who weighs too much.
    code: "P220",
    name: "Statera",
    faction: "neutrals",
    kit: kit(
      "P220",
      { name: "Il peso", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Compensa lo scarto", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }] },
      { name: "La Misura", scaling: { VOL: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "VOL" } }] },
      passive({ name: "Toglie a chi pesa troppo", modifiers: { damageVsStatus: { status: "empower", percent: 25 }, hitPercent: 4 } }),
    ),
  },
  {
    // VEL 8, FUR 6, PER 6 (Gamma): no Segno; the Lanterne's runner, crosses the city from roof to roof without touching the street.
    code: "P030",
    name: "Milewright",
    faction: "heroes",
    kit: kit(
      "P030",
      { name: "Di tetto in tetto", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Staffetta", scaling: { VEL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 1, on: "all" }] },
      { name: "Ogni tegola rotta", scaling: { VEL: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.4, on: "primary" }] },
      passive({ name: "Conosce ogni tetto", modifiers: { speedPercent: 8, hitPercent: 4, damagePercent: 6 } }),
    ),
  },
  {
    // INT 10, TEC 8, PER 7 (Gamma): no Segno; the Lete's hacker, empties your account in a second and is vain enough to always sign.
    code: "P031",
    name: "Byline",
    faction: "villains",
    kit: kit(
      "P031",
      { name: "Accesso", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Conto svuotato", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "In un secondo", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.4, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Lascia la firma", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "other", chance: { base: 40, ability: "TEC" } }] }),
    ),
  },
  {
    // PSI 10, VOL 10, INT 8 (Beta): the Custodi's negotiator; every sentence reaches you in the voice you trust most. Stopped three massacres talking.
    code: "P050",
    name: "Parley",
    faction: "heroes",
    kit: kit(
      "P050",
      { name: "La voce di cui ti fidi", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Ti arrendi", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.75, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      { name: "Tre stragi fermate", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.65, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 55, ability: "PSI" } }] },
      passive({ name: "Non alza mai la voce", modifiers: { effectChancePercent: 14, critPercent: 3 } }),
    ),
  },
  {
    // COM 8, FOR 6, TEC 6 (Gamma): bounty hunter with a chrome arm that grips like a vice; works for the Banco until the arm is paid, so forever.
    code: "P073",
    name: "Collateral",
    faction: "neutrals",
    kit: kit(
      "P073",
      { name: "Braccio cromato", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Morsa", scaling: { COM: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "TEC" } }] },
      { name: "Le rate al Banco", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "In ritardo con le rate", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // RES 10, FOR 9, VOL 9 (Gamma): a square's statue woken by the Ora Zero; its bronze megaphone carries across the city. Feet still on the pedestal.
    code: "P127",
    name: "Stentore",
    faction: "heroes",
    kit: kit(
      "P127",
      { name: "Megafono di bronzo", scaling: { VOL: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Avviso del Comune", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Da un capo all'altro", scaling: { VOL: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "VOL" } }] },
      passive({ name: "Duemila anni in piazza", trigger: "hurt", limit: 3, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // INT 10, PSI 10, PER 8 (Gamma): state TV anchor; live, her voice rewrites the last seventy-two hours of whoever listens. Recorded, it is air.
    code: "P159",
    name: "Erasure",
    faction: "villains",
    kit: kit(
      "P159",
      { name: "In diretta", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Quello che ricordate è sbagliato", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "PSI" } }] },
      { name: "Ora sistemiamo tutto", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Solo dal vivo", modifiers: { effectChancePercent: 6, damagePercent: 6 } }),
    ),
  },
  {
    // PER 10, RES 9, VOL 9, MAG 8 (Gamma): ferryman of the sunken dock under the metro; his barge always arrives, and the toll is something that weighed on you.
    code: "P205",
    name: "Ballast",
    faction: "neutrals",
    kit: kit(
      "P205",
      { name: "Remo", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il pedaggio", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.75, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Quanto pesava", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.45, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "La chiatta arriva sempre", trigger: "ally_down", limit: 1, scaling: { MAG: 1 }, effects: [{ kind: "heal", multiplier: 0.25, to: "allies" }] }),
    ),
  },
  {
    // TEC 9, VOL 9, PER 8 (Gamma): for nineteen years she has kept the low districts' last water plant running; her key puts a machine back as it was a shift ago.
    code: "P218",
    name: "Upkeep",
    faction: "heroes",
    kit: kit(
      "P218",
      { name: "Chiave di taratura", scaling: { TEC: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Com'era un turno prima", scaling: { TEC: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.95, on: "primary" }] },
      { name: "Ricostruisco la pompa", scaling: { TEC: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.4, on: "all" }, { kind: "heal", multiplier: 0.25, on: "all" }] },
      passive({ name: "Quattrocento ore a mano", modifiers: { healPercent: 10, hitPercent: 4 } }),
    ),
  },
  {
    // ENE 8, FOR 6, MAG 6 (Gamma): the Lanterne's electrician; grabs cut cables bare-handed and carries the current until the district lights up. Slow runner.
    code: "P028",
    name: "Juncture",
    faction: "heroes",
    kit: kit(
      "P028",
      { name: "A mani nude", scaling: { ENE: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Corrente nel corpo", scaling: { ENE: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Il quartiere torna acceso", scaling: { ENE: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Correre non è il suo forte", modifiers: { damagePercent: 12, speedPercent: -6 } }),
    ),
  },
  {
    // ENE 10, RES 8, FOR 7 (Gamma): former plant worker rebuilt with pistons and valves; more energy than a substation, never threw a punch.
    code: "P033",
    name: "Cathode",
    faction: "heroes",
    kit: kit(
      "P033",
      { name: "Stretta di mano", scaling: { ENE: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }] },
      { name: "Cabina elettrica", scaling: { ENE: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 45, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Valvole al massimo", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 45, ability: "ENE" } }] },
      passive({ name: "Basta stringergli la mano", trigger: "hurt", scaling: { ENE: 1 }, effects: [{ kind: "damage", multiplier: 0.15, to: "other" }] }),
    ),
  },
  {
    // COM 10, FOR 10, VEL 10, RES 1 (Alfa): the fastest fighter in the city, with glass bones that break at the first real blow; the shards keep hitting.
    code: "P051",
    name: "Vetrix",
    faction: "villains",
    kit: kit(
      "P051",
      { name: "Colpo fulmineo", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Raffica", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "In pezzi", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Le schegge continuano a colpire", trigger: "low_vita", thresholdPercent: 25, limit: 1, scaling: { COM: 1 }, effects: [{ kind: "damage", multiplier: 0.6, to: "enemies" }] }),
    ),
  },
  {
    // PSI 10, FUR 9, INT 8 (Gamma): an actor playing a real hero on film; while the camera rolls he truly has part of the hero's powers.
    code: "P166",
    name: "Histrio",
    faction: "neutrals",
    kit: kit(
      "P166",
      { name: "Battuta", scaling: { PSI: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Motore!", scaling: { PSI: 1 }, target: "self", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Per dodici secondi", scaling: { PSI: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Costume, luci e troupe", trigger: "battle_start", limit: 1, effects: [{ kind: "charge", amount: 2, to: "self" }] }),
    ),
  },
  {
    // ENE 9, PER 8, INT 7 (Gamma): in his forearm lives a creature from the tear that welds anything to anything; he rents it by the hour, with receipt.
    code: "P222",
    name: "Billable",
    faction: "villains",
    kit: kit(
      "P222",
      { name: "Saldatura", scaling: { ENE: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Tariffa notturna", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "ENE" } }] },
      { name: "Quaranta minuti", scaling: { ENE: 0.6, TEC: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.5, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Le do fattura", modifiers: { critPercent: 8, effectChancePercent: 6 } }),
    ),
  },
  {
    // INT 10, VOL 10, PSI 9 (Beta): lives alone in a 240-flat building in the closed zone; while he is there, the block behaves as if still inhabited.
    code: "P223",
    name: "Insula",
    faction: "neutrals",
    kit: kit(
      "P223",
      { name: "Passeggiata quotidiana", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "L'isolato è abitato", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.25, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Ho deciso di restare", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.35, on: "all" }, { kind: "shield", multiplier: 0.2, on: "all" }] },
      passive({ name: "Le luci accese", trigger: "turn_start", scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.05, to: "self" }] }),
    ),
  },
  {
    // RES 10, COM 8, VOL 7 (Gamma): no Segno; Custodi officer with a riot shield, always in the front row. Cannot hide and does not try.
    code: "P025",
    name: "Bulwark",
    faction: "heroes",
    kit: kit(
      "P025",
      { name: "Scudo antisommossa", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "In prima fila", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Non si nasconde", scaling: { RES: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Sempre davanti", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "fortify", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 10, COM 8 (Beta): former wrestling champion; can lend his Segno to someone else for eleven minutes and meanwhile is an ordinary man.
    code: "P045",
    name: "Apostate",
    faction: "heroes",
    kit: kit(
      "P045",
      { name: "Presa", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Presta il Segno", scaling: { FOR: 1 }, target: "ally", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Apre le porte", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Muscoli che bruciano", modifiers: { damagePercent: 10, critPercent: 5 } }),
    ),
  },
  {
    // ENE 10, INT 10, TEC 10 (Alfa): no Segno; the engineer who designed the Ora Zero plant, the brightest mind in Nuova Megara, for sale to the highest bidder.
    code: "P052",
    name: "Auctor",
    faction: "neutrals",
    kit: kit(
      "P052",
      { name: "Progetto", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Al miglior offerente", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "La centrale dell'Ora Zero", scaling: { ENE: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Il cervello più brillante", modifiers: { critPercent: 6, effectChancePercent: 8 } }),
    ),
  },
  {
    // FUR 10, INT 10, VEL 10 (Alfa): in the dark she sees the light things give off, fresh traces and the spot where someone lied; nobody can see her.
    code: "P053",
    name: "Moth",
    faction: "heroes",
    kit: kit(
      "P053",
      { name: "Al buio", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il punto in cui hai mentito", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Hai visto chi è stato?", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Nessuno riesce a vederla", modifiers: { critPercent: 5, hitPercent: 5 } }),
    ),
  },
  {
    // FUR 10, PSI 10, MAG 8, RES 0 (Beta): vampire and Lete executive; sucks blood and money in instalments, interest apart. A stake ends the meeting.
    code: "P090",
    name: "Lamprey",
    faction: "villains",
    kit: kit(
      "P090",
      { name: "Morso", scaling: { FUR: 0.6, PSI: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "A rate", scaling: { PSI: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "PSI" } }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "PSI" } }] },
      { name: "Gli interessi sono a parte", scaling: { FUR: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "heal", multiplier: 0.5, on: "self" }] },
      passive({ name: "Sangue a rate", trigger: "hit", scaling: { FUR: 1 }, effects: [{ kind: "heal", multiplier: 0.08, to: "self" }] }),
    ),
  },
  {
    // INT 8, VOL 7, MAG 6 (Beta): city archivist; she adds a clause aloud to what is happening and it ends there. The collapse stops at the third floor.
    code: "P115",
    name: "Codicil",
    faction: "heroes",
    kit: kit(
      "P115",
      { name: "Comma", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Una clausola", scaling: { INT: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 1, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "E la cosa finisce lì", scaling: { INT: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 55, ability: "INT" } }] },
      passive({ name: "Si ferma al terzo piano", trigger: "ally_down", limit: 1, scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.35, to: "allies" }] }),
    ),
  },
];
