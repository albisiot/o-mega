// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, tenth batch: the first 25 characters that
// do not come out of the packs (the three somebody owns, then in code order: 12 Delta, 9 Gamma,
// 3 Beta, 1 Alfa), written from their card (abilities, Poteri, colour text). Each was simulated on
// its own card (scripts/simulate-combat.mts --report kits --batch 10). From here they go to the
// database (combat_kits) with a migration; the database is then the reference and the EDITOR
// changes them. Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_10: CombatKitEntry[] = [
  {
    // VEL 8, TEC 7, VOL 7 (Delta): a rookie in costume flying on sheet-metal wings welded in a garage; flies very well, still learning to land.
    code: "P061",
    name: "Nadir",
    faction: "heroes",
    kit: kit(
      "P061",
      { name: "Ali di lamiera", scaling: { VEL: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "In picchiata", scaling: { VEL: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "VEL" } }] },
      { name: "L'atterraggio", scaling: { VEL: 0.6, VOL: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Vola benissimo", modifiers: { speedPercent: 8, damagePercent: 10 } }),
    ),
  },
  {
    // FUR 8, MAG 7, VEL 6 (Delta): turns into fog and slips under any door; where she comes back together, she finds out at the last moment.
    code: "P068",
    name: "Nimbus",
    faction: "neutrals",
    kit: kit(
      "P068",
      { name: "Nebbia", scaling: { MAG: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Sotto la porta", scaling: { MAG: 0.6, FUR: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Dove si ricompone", scaling: { FUR: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.4, on: "primary" }] },
      passive({ name: "Sparisce in un attimo", trigger: "hurt", limit: 2, scaling: { MAG: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "self" }] }),
    ),
  },
  {
    // ENE 10, VEL 10, COM 7 (Beta): commands the wind and gets wherever he is needed before anyone; cannot stay still, gone before the thanks.
    code: "P074",
    name: "Tempestas",
    faction: "heroes",
    kit: kit(
      "P074",
      { name: "Raffica di vento", scaling: { ENE: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Prima di chiunque", scaling: { VEL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 1, on: "all" }] },
      { name: "Arriva col vento", scaling: { ENE: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 30, ability: "ENE" } }] },
      passive({ name: "Riparte prima del grazie", trigger: "hit", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // ENE 10, FOR 10, VEL 10 (Alfa): the strength of a star burns inside her, enough to stop any threat; each use consumes her a little, and she knows it.
    code: "P078",
    name: "Novissima",
    faction: "heroes",
    kit: kit(
      "P078",
      { name: "Luce di stella", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Fermare qualsiasi minaccia", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }] },
      { name: "Supernova", scaling: { ENE: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 35, ability: "ENE" } }] },
      passive({ name: "Prima o poi si spegne", modifiers: { damagePercent: 6, critPercent: 4 } }),
    ),
  },
  {
    // TEC 10, INT 8, RES 7 (Delta): mechanic of the rebel ship that fell from the tear into the gulf; keeps the port's fishing boats afloat with salvage.
    code: "P232",
    name: "Calafato",
    faction: "heroes",
    kit: kit(
      "P232",
      { name: "Chiave inglese", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Pezzi dal relitto", scaling: { TEC: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Tenere a galla", scaling: { TEC: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.35, on: "all" }, { kind: "heal", multiplier: 0.2, on: "all" }] },
      passive({ name: "Il cielo a pezzi", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "allies" }] }),
    ),
  },
  {
    // PER 10, COM 8 (Delta): turret gunner from the border worlds, now on lookout on the port tower; never misses a moving target.
    code: "P233",
    name: "Raffica",
    faction: "heroes",
    kit: kit(
      "P233",
      { name: "Torretta", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Fuoco di sbarramento", scaling: { PER: 0.6, COM: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "Ho finito i colpi una volta sola", scaling: { PER: 0.6, COM: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }] },
      passive({ name: "Non sbaglia un bersaglio", modifiers: { hitPercent: 12 } }),
    ),
  },
  {
    // RES 9, TEC 9, PER 8 (Delta): an eight-legged magnetic hull robot from the rebel ship; clings where there is a breach and seals it, even under fire.
    code: "P234",
    name: "Patella",
    faction: "heroes",
    kit: kit(
      "P234",
      { name: "Zampe magnetiche", scaling: { TEC: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Sigilla la falla", scaling: { TEC: 0.6, RES: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }] },
      { name: "Tre colpi per tutto bene", scaling: { TEC: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Anche sotto i colpi", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // COM 9, RES 9, FOR 8 (Delta): a garrison soldier of the Novecielo still on guard after the orders stopped; the Lete rents him as its tower's doorman.
    code: "P235",
    name: "Sentinella",
    faction: "villains",
    kit: kit(
      "P235",
      { name: "Alabarda", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Ancora di guardia", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Nessuno mi ha dato il cambio", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Rumoroso come la corazza", modifiers: { hitPercent: 6, damagePercent: 4 } }),
    ),
  },
  {
    // VEL 10, PER 9, TEC 8 (Delta): the empire's interceptor pilot, fastest of her flight; sees everything from the cockpit, panics when things go bad.
    code: "P236",
    name: "Sortita",
    faction: "villains",
    kit: kit(
      "P236",
      { name: "Intercettore", scaling: { VEL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Vede tutto", scaling: { PER: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "La più veloce dello stormo", scaling: { VEL: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Anche in ritirata", trigger: "low_vita", thresholdPercent: 40, limit: 1, effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }] }),
    ),
  },
  {
    // INT 9, VOL 9, PER 8 (Delta): collector of the imperial tithes, now docking taxes for the Lete; never loses a count, never leaves her desk.
    code: "P237",
    name: "Gabella",
    faction: "villains",
    kit: kit(
      "P237",
      { name: "La decima", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Tassa d'attracco", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 60, ability: "INT" } }] },
      { name: "La decima dell'impero", scaling: { INT: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 50, ability: "INT" } }] },
      passive({ name: "Non perde mai un conto", trigger: "hit", limit: 3, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, VEL 9, TEC 7 (Delta): a brass and porcelain tracker drone of the Novecielo; scents whoever came from the tear days later. Light and fragile.
    code: "P238",
    name: "Bracco",
    faction: "villains",
    kit: kit(
      "P238",
      { name: "Fiuta l'aria", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La traccia", scaling: { PER: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Si gira verso di te", scaling: { PER: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Tre volte l'aria", modifiers: { damageVsStatus: { status: "vulnerable", percent: 20 }, speedPercent: 4 } }),
    ),
  },
  {
    // PER 9, PSI 8, VOL 7 (Delta): an alien musician in a port tavern who has played the same song with his three throats for eleven years; it calms whoever hears it.
    code: "P239",
    name: "Ostinato",
    faction: "neutrals",
    kit: kit(
      "P239",
      { name: "Tre gole", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "La stessa canzone", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "PSI" } }] },
      { name: "Ne conosco un'altra", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Chi la sente si calma", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 30, ability: "PSI" } }] }),
    ),
  },
  {
    // RES 9, FOR 8, TEC 8 (Delta): a four-armed alien junk dealer who buys whatever falls from the sky; rebuilds an engine in a night. Her shell keeps her at the stall.
    code: "P240",
    name: "Ferraglia",
    faction: "neutrals",
    kit: kit(
      "P240",
      { name: "Cannello", scaling: { TEC: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "TEC" } }] },
      { name: "Un motore in una notte", scaling: { TEC: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "I pezzi di nave, il doppio", scaling: { FOR: 0.6, TEC: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Non si muove dal banco", modifiers: { speedPercent: -4, damagePercent: 10 } }),
    ),
  },
  {
    // TEC 8, VOL 8, FOR 7 (Delta): a Route Guild tug pilot who hooks the wrecks fallen in the gulf with ninety metres of cable and drags them ashore.
    code: "P241",
    name: "Alaggio",
    faction: "neutrals",
    kit: kit(
      "P241",
      { name: "Cavo", scaling: { TEC: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Aggancia", scaling: { TEC: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "TEC" } }] },
      { name: "Lo porto io", scaling: { FOR: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Novanta metri di cavo", modifiers: { hitPercent: 6, damagePercent: 6 } }),
    ),
  },
  {
    // VEL 10, PER 9, TEC 8 (Gamma): the rebels' fighter ace; bored in small duels, but in the decisive battle flies better than anyone.
    code: "P242",
    name: "Virata",
    faction: "heroes",
    kit: kit(
      "P242",
      { name: "Duello", scaling: { VEL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Avvitamento", scaling: { VEL: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "Il bersaglio più grosso", scaling: { VEL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 2.15, on: "primary" }] },
      passive({ name: "La battaglia decisiva", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // VOL 9, ENE 7, INT 6 (Gamma): a border-world saboteur; the empire destroyed the moon she was born on, and she strikes back after every defeat.
    code: "P243",
    name: "Rivalsa",
    faction: "heroes",
    kit: kit(
      "P243",
      { name: "Detonatore", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "I depositi, uno alla volta", scaling: { ENE: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }] },
      { name: "Mi ha tolto una luna", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Torna a colpire", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // VEL 10, FUR 8, PER 7 (Gamma): the Custodi's scout on a hover bike, fastest of them all; gets there first unseen. Thinking before leaving is not his strength.
    code: "P244",
    name: "Folata",
    faction: "heroes",
    kit: kit(
      "P244",
      { name: "Moto a levitazione", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Senza farsi vedere", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Prima arrivo", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Poi capisco dove sono", modifiers: { speedPercent: 7, hitPercent: -3 } }),
    ),
  },
  {
    // COM 10, RES 10, FOR 9 (Gamma): a heavy assault soldier of the Novecielo, a mountain of lacquer and bronze behind a tower shield; where he stands the front holds.
    code: "P245",
    name: "Testuggine",
    faction: "villains",
    kit: kit(
      "P245",
      { name: "Scudo a torre", scaling: { COM: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Il fronte non arretra", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Davanti a me, sì", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Lacca e bronzo", trigger: "hurt", limit: 3, scaling: { COM: 1 }, effects: [{ kind: "shield", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // PER 10, INT 9, VOL 8 (Gamma): an inquisitor of the Novecielo; with her listening trumpets she hears the breath of a liar a room away. Never fought.
    code: "P246",
    name: "Udienza",
    faction: "villains",
    kit: kit(
      "P246",
      { name: "Trombe d'ascolto", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Come respiri", scaling: { PER: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Non mi serve la risposta", scaling: { PSI: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 45, ability: "PSI" } }] },
      passive({ name: "Prima di darla", modifiers: { effectChancePercent: 10, hitPercent: 6 } }),
    ),
  },
  {
    // PER 9, COM 8, VEL 8 (Gamma): an alien bounty hunter who wears the badges of those she caught on her cloak; always works alone.
    code: "P247",
    name: "Taglia",
    faction: "villains",
    kit: kit(
      "P247",
      { name: "Rete", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Cattura", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "PER" } }] },
      { name: "I distintivi", scaling: { COM: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.85, on: "primary" }] },
      passive({ name: "Chi divide la taglia", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PER 10, INT 8, PSI 8 (Gamma): an alien informer of the port taverns; her fan ears hear every whisper and she always knows who is worth most in a room.
    code: "P248",
    name: "Soffiata",
    faction: "neutrals",
    kit: kit(
      "P248",
      { name: "Sussurro", scaling: { PER: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Chi vale di più", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 40, ability: "PSI" } }] },
      { name: "Solo uno vale la pena", scaling: { PER: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Orecchie a ventaglio", modifiers: { damageVsStatus: { status: "weaken", percent: 20 }, hitPercent: 4 } }),
    ),
  },
  {
    // FOR 10, RES 9, COM 7 (Gamma): copilot of a smugglers' freighter, a huge kind amphibian who lifts an engine alone and fixes it bare-handed.
    code: "P249",
    name: "Stazza",
    faction: "neutrals",
    kit: kit(
      "P249",
      { name: "Mani nude", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Va tutto bene", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Solleva un motore", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Brontola con le bolle", trigger: "hurt", limit: 3, scaling: { FOR: 1 }, effects: [{ kind: "heal", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // INT 9, PER 9, VOL 8 (Gamma): a gambler of the Banco di Kest; reads tables and faces, and when she is behind she stops making mistakes.
    code: "P250",
    name: "Azzardo",
    faction: "neutrals",
    kit: kit(
      "P250",
      { name: "Legge il tavolo", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Rilancio", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }] },
      { name: "Smetto di sbagliare", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Quando perdo", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "empower", turns: 3, to: "self" }] }),
    ),
  },
  {
    // COM 9, VEL 9, MAG 7 (Beta): a novice of the Order of the Silent Blade, arrived from the tear mid-training; with every blow she learns from those stronger than her.
    code: "P251",
    name: "Novizia",
    faction: "heroes",
    kit: kit(
      "P251",
      { name: "Lama", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Piega la Trama", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "MAG" } }] },
      { name: "Più sei forte", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "self" }] },
      passive({ name: "Più imparo in fretta", modifiers: { damageVsStatus: { status: "empower", percent: 20 }, critPercent: 4 } }),
    ),
  },
  {
    // RES 10, VOL 10, FOR 8 (Beta): a knight of the border worlds who raises a shield of light on her forearm that stops lightning. Slow.
    code: "P252",
    name: "Egida",
    faction: "heroes",
    kit: kit(
      "P252",
      { name: "Avambraccio", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Scudo di luce", scaling: { VOL: 0.6, RES: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.85, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Li conto", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.45, on: "all" }] },
      passive({ name: "Tira pure i tuoi fulmini", trigger: "hurt", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.2, to: "self" }] }),
    ),
  },
];
