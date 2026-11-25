// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, twelfth batch: the next 25 characters
// that do not come out of the packs, in code order (P278 to P302: 11 Delta, 3 Gamma, 6 Beta, 3 Alfa,
// 2 Omega), written from their card (abilities, Poteri, colour text). Each was simulated on its own
// card (scripts/simulate-combat.mts --report kits --batch 12). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_12: CombatKitEntry[] = [
  {
    // FUR 10, PER 8, VEL 8 (Gamma): a thief of the Hill Folk who gets in wherever a cat does, and is the first into the enemy camp to see who is there. Quick hands, little strength.
    code: "P278",
    name: "Pertugio",
    faction: "neutrals",
    kit: kit(
      "P278",
      { name: "Mani svelte", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "A vedere chi c'è", scaling: { PER: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Ero già dentro", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Dove passa un gatto", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // INT 8, PER 8, RES 6, VOL 6 (Gamma): the last two Rifratti, an old people of the Marches split in two: one cuts, the other forgives. The Banco pays them to say who is worth what.
    code: "P279",
    name: "Bifora",
    faction: "neutrals",
    kit: kit(
      "P279",
      { name: "Asse Rapido", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Asse Lento", scaling: { INT: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 1, on: "primary" }] },
      { name: "Uno taglia, l'altro perdona", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "heal", multiplier: 0.4, on: "self" }] },
      passive({ name: "Chi vale quanto", modifiers: { hitPercent: 6, healPercent: 8 } }),
    ),
  },
  {
    // FOR 9, RES 8, TEC 7, VOL 7 (Gamma): a granite-skinned miner of the Ferrigni who opens the first gallery where others see only rock; in the city she digs for whoever pays.
    code: "P280",
    name: "Picozza",
    faction: "neutrals",
    kit: kit(
      "P280",
      { name: "Piccone", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "La prima galleria", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "FOR" } }] },
      { name: "Le altre costano di più", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Pelle di granito", trigger: "hurt", limit: 3, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // RES 10, VOL 10, PER 7 (Beta): the bearer of the Seal, carrying it in a wicker basket ever farther from home; the longer the road, the harder he holds on.
    code: "P281",
    name: "Gerla",
    faction: "heroes",
    kit: kit(
      "P281",
      { name: "Bastone da viaggio", scaling: { RES: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il Sigillo nella gerla", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.35, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Se lo poso, lo raccoglie un altro", scaling: { VOL: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.65, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "self" }] },
      passive({ name: "Più la strada è lunga", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.1, to: "self" }, { kind: "status", status: "fortify", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 9, VOL 9, COM 8 (Beta): chief of the Ferrigni; every promise said aloud near him weighs, and whoever breaks it cracks. Slow and impossible not to see.
    code: "P282",
    name: "Concordato",
    faction: "heroes",
    kit: kit(
      "P282",
      { name: "Contrappeso di ghisa", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Impossibile da non vedere", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Chi rompe il patto si incrina", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Finché i conti sono pari", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "other", chance: { base: 45, ability: "COM" } }] }),
    ),
  },
  {
    // FUR 8, VEL 8, VOL 8, MAG 7 (Beta): one of the Sovereign's Erased, a face of scraped parchment; whoever meets her forgets who helped them a moment ago. No body to hit.
    code: "P283",
    name: "Rasura",
    faction: "villains",
    kit: kit(
      "P283",
      { name: "La riga rossa", scaling: { MAG: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Chi ti ha aiutato?", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }] },
      { name: "Non te lo ricordi, vero?", scaling: { MAG: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Niente da colpire", trigger: "hurt", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "self" }] }),
    ),
  },
  {
    // INT 10, MAG 9, TEC 9 (Beta): principal of the Academy of Syllables, gone over to the Lete with the archive keys; builds brass machines that say the formulas for whoever pays.
    code: "P284",
    name: "Decana",
    faction: "villains",
    kit: kit(
      "P284",
      { name: "Formula a rate", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Macchina d'ottone", scaling: { TEC: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.3, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Con gli interessi", scaling: { INT: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 35, ability: "INT" } }] },
      passive({ name: "Sa quasi tutto di quasi tutto", modifiers: { effectChancePercent: 12, damagePercent: 4 } }),
    ),
  },
  {
    // TEC 10, FOR 8, RES 8, VOL 8 (Beta): the lame Third Smith who forged the Seal; everything from his hands holds more than it should, even the weak pieces. Now works for the Banco.
    code: "P285",
    name: "Tempra",
    faction: "neutrals",
    kit: kit(
      "P285",
      { name: "Martello", scaling: { TEC: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Regge più del dovuto", scaling: { TEC: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Forgiato sotto la montagna", scaling: { TEC: 1 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.35, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "Anche i pezzi deboli", trigger: "battle_start", limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "allies" }] }),
    ),
  },
  {
    // PER 10, FOR 9, RES 9 (Beta): a blind creature of the Ferrigni's deepest galleries, «the dark that eats»; lives in the metro tunnels eating the lamps' light, out only when the earth shakes.
    code: "P286",
    name: "Cunicolo",
    faction: "neutrals",
    kit: kit(
      "P286",
      { name: "Il buio che mangia", scaling: { FOR: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Le lampade si spengono", scaling: { PER: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.35, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "PER" } }] },
      { name: "Una alla volta, verso di te", scaling: { FOR: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Quando la terra trema", trigger: "ally_down", limit: 2, effects: [{ kind: "charge", amount: 2, to: "self" }] }),
    ),
  },
  {
    // INT 10, MAG 10, VOL 9 (Alfa): a wandering mage of the Academy, a bronze collar locking her voice; so she writes, walking ahead and chalking on the walls the danger to come.
    code: "P287",
    name: "Epigrafe",
    faction: "heroes",
    kit: kit(
      "P287",
      { name: "Gesso", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Sta arrivando, spostatevi", scaling: { INT: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.2, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "La parola sbagliata", scaling: { MAG: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "MAG" } }] },
      passive({ name: "Scritto sul muro", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "other", chance: { base: 45, ability: "INT" } }] }),
    ),
  },
  {
    // MAG 10, VOL 10, INT 9 (Alfa): the Sovereign of the eastern Marches, who erases a subject's name with hot wax; writes herself onto her own to make them stronger, and less of her is left.
    code: "P288",
    name: "Nomina",
    faction: "villains",
    kit: kit(
      "P288",
      { name: "Cera calda", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Si scrive addosso ai suoi", scaling: { VOL: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.4, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Smetto di scriverti", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.75, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Di lei resta sempre meno", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // ENE 10, FOR 10, RES 8 (Alfa): an old dragon of the Marches with a heron's neck and scales of cooled lava, nesting in the volcano's fumaroles; when he wins, the road is clear for whoever follows.
    code: "P289",
    name: "Fumarola",
    faction: "neutrals",
    kit: kit(
      "P289",
      { name: "Scaglie di lava", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }] },
      { name: "Fiato di fumarola", scaling: { ENE: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.45, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 45, ability: "ENE" } }] },
      { name: "Il collo d'airone", scaling: { FOR: 0.6, ENE: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "La strada spianata", trigger: "knockout", effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "enemies", chance: { base: 40, ability: "ENE" } }] }),
    ),
  },
  {
    // FOR 10, RES 10, VOL 10, PER 9 (Omega): the olive tree that walked the Marches on its roots for two thousand years; has seen every storm and feels the greatest coming. Very slow, never hides.
    code: "P290",
    name: "Millenario",
    faction: "heroes",
    kit: kit(
      "P290",
      { name: "Radici", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Non si nasconde", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Ha visto ogni tempesta", scaling: { VOL: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Qualcosa sta arrivando", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "fortify", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // FUR 10, MAG 10, VOL 10, INT 9 (Omega): the nameless patron who ordered the Seal, made of ink that never dries and written in no register; whoever faces him has a piece of name less.
    code: "P291",
    name: "Apocrifo",
    faction: "villains",
    kit: kit(
      "P291",
      { name: "Inchiostro che non si asciuga", scaling: { MAG: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Mi avete letto", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }] },
      { name: "Timbrato addosso al mondo", scaling: { MAG: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Un pezzo di nome in meno", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 35, ability: "MAG" } }] }),
    ),
  },
  {
    // VEL 10, FUR 8, VOL 8 (Delta): a delivery rider of the Lanterne who since Hour Zero outruns his scooter and beats the ambulances to the Fosse; never learned to brake.
    code: "P292",
    name: "Volata",
    faction: "heroes",
    kit: kit(
      "P292",
      { name: "Consegna a domicilio", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "In tre minuti", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "Frenare non l'ha mai imparato", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Prima dei soccorsi", modifiers: { speedPercent: 8, critPercent: 4 } }),
    ),
  },
  {
    // FUR 9, PER 8, VOL 7 (Delta): a skyscraper window cleaner whose palms stick to anything since Hour Zero; at night she climbs for the Lanterne and looks into the right windows.
    code: "P293",
    name: "Ventosa",
    faction: "heroes",
    kit: kit(
      "P293",
      { name: "Palmi sul vetro", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Le finestre giuste", scaling: { PER: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Da vicino, meno", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Da quassù", modifiers: { damageVsStatus: { status: "vulnerable", percent: 15 }, critPercent: 6 } }),
    ),
  },
  {
    // FOR 10, RES 9, VOL 8, COM 7 (Delta): a removals porter with a Sign of strength who stops a van with his shoulder; takes every instruction literally.
    code: "P294",
    name: "Trasloco",
    faction: "heroes",
    kit: kit(
      "P294",
      { name: "Spallata", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Mi avevano detto di fermarlo", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "FOR" } }] },
      { name: "Sei piani senza ascensore", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Alla lettera", modifiers: { damagePercent: 5, hitPercent: 5 } }),
    ),
  },
  {
    // PER 9, INT 7, VEL 7 (Delta): a PE teacher on patrol with the Custodi who glides over the roofs when calm and falls when upset; so she teaches the whole squad to breathe.
    code: "P295",
    name: "Aliante",
    faction: "heroes",
    kit: kit(
      "P295",
      { name: "Planata", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Respira", scaling: { PER: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.95, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Un, due", scaling: { PER: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }] },
      passive({ name: "Adesso guarda giù", modifiers: { healPercent: 8, speedPercent: 4 } }),
    ),
  },
  {
    // ENE 9, VOL 7, PER 6 (Delta): an opera chorister whose high note shatters glass and floors thieves ten metres away; sings for the Lanterne where silence is needed.
    code: "P296",
    name: "Acuto",
    faction: "heroes",
    kit: kit(
      "P296",
      { name: "Do di petto", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Silenzio in piazza", scaling: { ENE: 0.6, VOL: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Anche ai vetri", scaling: { ENE: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Zitto non sa stare", modifiers: { effectChancePercent: 8, damagePercent: 4 } }),
    ),
  },
  {
    // ENE 10, RES 7 (Delta): a city electrician who carries the current in his body, fixing the substations after Hour Zero's blackouts; every device he touches burns out.
    code: "P297",
    name: "Tensione",
    faction: "heroes",
    kit: kit(
      "P297",
      { name: "Arco dal traliccio", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Ho staccato io", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 45, ability: "ENE" } }] },
      { name: "Blackout", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 35, ability: "ENE" } }] },
      passive({ name: "Era già bruciato", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "burn", turns: 1, to: "other", chance: { base: 35, ability: "ENE" } }] }),
    ),
  },
  {
    // VEL 9, COM 7, FOR 7 (Delta): a youngster of the Fosse with spring legs who jumps buildings carrying the Lanterne's messages; cannot keep still for a minute.
    code: "P298",
    name: "Molla",
    faction: "heroes",
    kit: kit(
      "P298",
      { name: "Salto", scaling: { VEL: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Da un tetto all'altro", scaling: { VEL: 0.6, COM: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.4, on: "primary" }, { kind: "status", status: "haste", turns: 2, on: "primary" }] },
      { name: "Il salto dopo", scaling: { VEL: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Non sta fermo un minuto", trigger: "turn_start", limit: 2, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FUR 9, VEL 8, PER 7 (Delta): a writer of the Figli dell'Ultima whose spray paint hardens into bridges, hands and walls; writes the last hour on every metro train.
    code: "P299",
    name: "Vernice",
    faction: "villains",
    kit: kit(
      "P299",
      { name: "Spruzzo", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Mani di vernice", scaling: { FUR: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "FUR" } }] },
      { name: "L'ultima ora sui muri", scaling: { FUR: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "FUR" } }] },
      passive({ name: "In grande, così la leggete", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 35, ability: "FUR" } }] }),
    ),
  },
  {
    // ENE 9, RES 9, VOL 7 (Delta): a circus fire-eater turned arsonist of the Figli dell'Ultima; spits ten-metre flames and stands heat like an oven. Never thinks of consequences.
    code: "P300",
    name: "Zolfo",
    faction: "villains",
    kit: kit(
      "P300",
      { name: "Fiammata", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }] },
      { name: "Dieci metri di fuoco", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 45, ability: "ENE" } }] },
      { name: "Accendere l'ultima ora", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary" }] },
      passive({ name: "Il fuoco non mente", modifiers: { damageVsStatus: { status: "burn", percent: 20 }, hitPercent: 4 } }),
    ),
  },
  {
    // FUR 10, VEL 8, PER 7 (Delta): a chimney thief who turns to soot, comes down any flue and takes shape in the living room; steals the old houses' carved stones for the Figli.
    code: "P301",
    name: "Fuliggine",
    faction: "villains",
    kit: kit(
      "P301",
      { name: "Dal camino", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Riprende forma in salotto", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Le pietre incise", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Le porte sono per chi entra", modifiers: { critPercent: 6, speedPercent: 4 } }),
    ),
  },
  {
    // VEL 10, FUR 8, PER 7 (Delta): a bag-snatcher with a flea's legs who leaps over buildings clutching the bag and is gone before anyone shouts; steals Alphabet stones for the Figli.
    code: "P302",
    name: "Pulce",
    faction: "villains",
    kit: kit(
      "P302",
      { name: "Scippo", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Hai visto dov'è andata?", scaling: { VEL: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "haste", turns: 2, on: "primary" }] },
      { name: "Sopra i palazzi", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Appunto", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
];
