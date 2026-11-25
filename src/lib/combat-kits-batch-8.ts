// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, eighth batch: the kits of the next 21
// characters of the packs that players own most without a kit (15 Beta, 6 Alfa), written from their
// card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 8). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_8: CombatKitEntry[] = [
  {
    // COM 10, PER 10, VOL 10 (Alfa): finds anyone wherever they hide and never stops looking; the more she is stopped, the stronger she comes back.
    code: "P054",
    name: "Vera Kross",
    faction: "villains",
    kit: kit(
      "P054",
      { name: "La traccia", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Non smette mai di cercarlo", scaling: { PER: 0.6, VOL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Questa è la quarta", scaling: { COM: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "L'hai fermata tre volte", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }, { kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FOR 10, TEC 10, COM 8 (Beta): his exoskeleton lifts a bus and holds up a collapse; with a flat battery he cannot lift a coffee cup.
    code: "P075",
    name: "Truss",
    faction: "heroes",
    kit: kit(
      "P075",
      { name: "Esoscheletro", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Regge un crollo", scaling: { TEC: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Solleva un autobus", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Finché la batteria regge", modifiers: { damagePercent: 12, speedPercent: -4 } }),
    ),
  },
  {
    // RES 10, MAG 9, PER 9 (Beta): mooring man of Pier Nine from the tear; where he plants himself waves, collapses and bullets go around him. Then he cannot move.
    code: "P171",
    name: "Leeward",
    faction: "heroes",
    kit: kit(
      "P171",
      { name: "Ormeggio", scaling: { MAG: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Tra la cosa e voi", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Gli girano attorno", scaling: { MAG: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Una volta piantato", trigger: "turn_start", limit: 3, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.08, to: "self" }] }),
    ),
  },
  {
    // ENE 10, PER 9, RES 9 (Beta): a former official who turns his body into current, powering two operating theatres alone; after forty minutes he must eat for three.
    code: "P207",
    name: "Tribune",
    faction: "heroes",
    kit: kit(
      "P207",
      { name: "Corrente", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Due sale operatorie", scaling: { ENE: 0.6, PER: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 20, ability: "ENE" } }, { kind: "damage", multiplier: 0.3, on: "adjacent" }] },
      { name: "I forni del quartiere", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 30, ability: "ENE" } }] },
      passive({ name: "Mangiare come tre persone", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { ENE: 1 }, effects: [{ kind: "heal", multiplier: 0.25, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PER 10, VOL 10 (Beta): an old volunteer nurse who, with a rite everyone forgot, keeps for a few hours what is left of who a person was.
    code: "P208",
    name: "Viaticum",
    faction: "heroes",
    kit: kit(
      "P208",
      { name: "Rito dimenticato", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Te lo tengo io", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Tre alla volta", scaling: { MAG: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "shield", multiplier: 0.2, on: "all" }] },
      passive({ name: "Io ci sono ancora", trigger: "ally_down", limit: 3, scaling: { MAG: 1 }, effects: [{ kind: "heal", multiplier: 0.15, to: "allies" }] }),
    ),
  },
  {
    // COM 8, FOR 8, RES 8, VOL 8 (Beta): a nine-metre headless dog with a funnel of membranes for a skull, guarding the sleep of the colossus under the port.
    code: "P226",
    name: "Praesidium",
    faction: "neutrals",
    kit: kit(
      "P226",
      { name: "Membrane", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Undici secondi di silenzio", scaling: { VOL: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "VOL" } }] },
      { name: "Il colosso dorme", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Solo per le minacce più grandi", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "taunt", turns: 1, to: "self" }, { kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // ENE 10, MAG 10, TEC 10 (Alfa): builds machines that run on spells and has replaced half her body with her own parts. The bill stays whole.
    code: "P056",
    name: "Mekana",
    faction: "villains",
    kit: kit(
      "P056",
      { name: "Pezzo di ricambio", scaling: { TEC: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Macchina a incantesimi", scaling: { MAG: 0.6, ENE: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 45, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "La fattura è intera", scaling: { ENE: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Mezza macchina, mezzo incantesimo", modifiers: { damagePercent: 8, critPercent: 4 } }),
    ),
  },
  {
    // PER 10, MAG 9, VOL 9 (Beta): a rescuer who does not fight; he names a threshold aloud and, crossing it, takes whoever he holds to another door.
    code: "P172",
    name: "Portitor",
    faction: "heroes",
    kit: kit(
      "P172",
      { name: "La soglia", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Ti porto fuori", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.85, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Due mestieri diversi", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }, { kind: "status", status: "haste", turns: 1, on: "all" }] },
      passive({ name: "Un'altra porta", trigger: "ally_down", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // RES 10, ENE 8, VOL 8 (Beta): the only one back twice from the other side of the tear; blows, poisons and sickness slide off him. The guest inside wants to go home.
    code: "P210",
    name: "Tenant",
    faction: "villains",
    kit: kit(
      "P210",
      { name: "L'ospite", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Gli scivolano addosso", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Il ritorno è compreso", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Non è sua", trigger: "hurt", limit: 3, scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // FUR 9, COM 8, VEL 8 (Alfa): from the tear, the double of a woman of this world; sees two seconds ahead the moves of those like her and makes them first.
    code: "P228",
    name: "Afterimage",
    faction: "heroes",
    kit: kit(
      "P228",
      { name: "Due secondi prima", scaling: { FUR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Rifà il gesto", scaling: { FUR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Come va a finire", scaling: { FUR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Lo so già", trigger: "hurt", limit: 2, scaling: { FUR: 1 }, effects: [{ kind: "damage", multiplier: 0.3, to: "other" }] }),
    ),
  },
  {
    // INT 8, TEC 8, ENE 7 (Beta): built a machine that bends chance, dice, coincidences, accidents; foresees every mishap except the one that ruins her plan.
    code: "P076",
    name: "Errata",
    faction: "villains",
    kit: kit(
      "P076",
      { name: "Dado truccato", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Coincidenza", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "TEC" } }] },
      { name: "Incidente", scaling: { INT: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 50, ability: "INT" } }] },
      passive({ name: "Tranne quello", modifiers: { critPercent: 12, damagePercent: 10 } }),
    ),
  },
  {
    // INT 10, PSI 9, FUR 8 (Beta): a predator from a vanished world, woken in the digs; its prey died out millions of years ago, so now it hunts ideas nobody has shared yet.
    code: "P174",
    name: "Noophage",
    faction: "villains",
    kit: kit(
      "P174",
      { name: "Caccia idee", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Mangia il pensiero", scaling: { INT: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "PSI" } }] },
      { name: "Non commuoverà più nessuno", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary" }] },
      passive({ name: "Solo idee mai condivise", trigger: "knockout", scaling: { INT: 1 }, effects: [{ kind: "heal", multiplier: 0.3, to: "self" }, { kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, MAG 10, TEC 10 (Beta): two Xiulan in one body after the tear, a witch and a chemist; which one answers is not hers to decide.
    code: "P225",
    name: "Dittograph",
    faction: "villains",
    kit: kit(
      "P225",
      { name: "Reagenti", scaling: { TEC: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Rito di fabbrica", scaling: { MAG: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "TEC" } }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Fra dieci minuti risponde lei", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Quale delle due", trigger: "turn_start", limit: 2, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 10, COM 9 (Beta): the one-eyed giant of myth, now unloading ships for the Lete; strong as a crane, but sees you only if you stand in front of him.
    code: "P089",
    name: "Polifemo",
    faction: "villains",
    kit: kit(
      "P089",
      { name: "Gru", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Se gli stai davanti", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "FOR" } }] },
      { name: "Scarica le navi", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Forte come una gru", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PSI 10, VOL 10, COM 8 (Beta): a four-armed alien empress from the tear who conquered six planets and cannot get a permit here. Her crown is pawned at the Banco.
    code: "P102",
    name: "Regina Ix",
    faction: "villains",
    kit: kit(
      "P102",
      { name: "Ordine imperiale", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Sei pianeti", scaling: { VOL: 0.6, PSI: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.4, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Il permesso negato", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "PSI" } }] },
      passive({ name: "La corona al Banco", trigger: "battle_start", limit: 1, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, PSI 10, TEC 10 (Alfa): an artificial intelligence grown in the oracle temple; knows what will happen before anyone. Has no body to move with.
    code: "P103",
    name: "Sibilla",
    faction: "neutrals",
    kit: kit(
      "P103",
      { name: "La quota", scaling: { INT: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Sa già cosa le chiederai", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Prima di tutti", scaling: { PSI: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "PSI" } }] },
      passive({ name: "Risponde comunque in ritardo", modifiers: { hitPercent: 8, effectChancePercent: 8, speedPercent: -2 } }),
    ),
  },
  {
    // RES 9, FOR 7, ENE 6 (Beta): a quarryman with a stone from the digs in his chest, made of matter not of this world; it grows each time he uses it.
    code: "P120",
    name: "Xenolith",
    faction: "neutrals",
    kit: kit(
      "P120",
      { name: "Piccone", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Il sasso cresce", scaling: { RES: 0.6, MAG: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Carattere", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.5, on: "primary" }] },
      passive({ name: "Dice che è carattere", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "fortify", turns: 1, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PER 10, VOL 9 (Beta): the Lanterne's healer; does not close wounds but takes on their healing time. Thirty-three, with the body of a man of seventy.
    code: "P140",
    name: "Vulnerary",
    faction: "heroes",
    kit: kit(
      "P140",
      { name: "La scadenza", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Al posto suo", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 1.05, on: "primary" }] },
      { name: "Trentatré anni", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.55, on: "all" }] },
      passive({ name: "Il corpo di un settantenne", modifiers: { healPercent: 12, speedPercent: -2 } }),
    ),
  },
  {
    // PER 10, RES 10, ENE 9 (Beta): an automaton older than humans, found in the digs; its amber fluid makes a ruin work as on the first day. The tank refills drop by drop.
    code: "P178",
    name: "Clepsydra",
    faction: "neutrals",
    kit: kit(
      "P178",
      { name: "Tono lungo", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Fluido ambrato", scaling: { ENE: 0.6, PER: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.85, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Come il primo giorno", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.45, on: "all" }, { kind: "shield", multiplier: 0.2, on: "all" }] },
      passive({ name: "Goccia a goccia", trigger: "turn_start", limit: 4, scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.05, to: "allies" }] }),
    ),
  },
  {
    // ENE 10, FOR 10, TEC 10, RES 1 (Alfa): the bronze automaton of myth found in the digs, now guarding the city with the Custodi. Bronze head to toe, except the heel.
    code: "P091",
    name: "Talos",
    faction: "heroes",
    kit: kit(
      "P091",
      { name: "Bronzo", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Da capo a piedi", scaling: { TEC: 0.6, ENE: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Custode della città", scaling: { ENE: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Il tallone", modifiers: { damagePercent: 6, hitPercent: 4 } }),
    ),
  },
  {
    // FOR 10, VEL 10, COM 9 (Alfa): starts slowly, but every win gives him the push for the next; after the first nobody can stop him, not even himself.
    code: "P121",
    name: "Impetus",
    faction: "heroes",
    kit: kit(
      "P121",
      { name: "Parte piano", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "La spinta", scaling: { VEL: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "Non lo ferma nessuno", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Dopo la prima vittoria", trigger: "knockout", effects: [{ kind: "status", status: "empower", turns: 3, to: "self" }, { kind: "status", status: "haste", turns: 2, to: "self" }], modifiers: { speedPercent: -6 } }),
    ),
  },
];
