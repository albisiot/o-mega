// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, third batch: the kits of the next 25
// characters of the packs that players own most without a kit (the last 18 Delta and the first 7
// Gamma), written from their card (abilities, Poteri, colour text). Each was simulated on its own
// card (scripts/simulate-combat.mts --report kits --batch 3). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_3: CombatKitEntry[] = [
  {
    // COM 10, FUR 9, VEL 7: no Segno; fights with home-made blades she sharpens herself, as her plasters show.
    code: "P066",
    name: "Falx",
    faction: "villains",
    kit: kit(
      "P066",
      { name: "Lama fatta in casa", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Taglio profondo", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 40, ability: "COM" } }] },
      { name: "Affilate da sola", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Si vede dai cerotti", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, TEC 10, VOL 9: digging engineer of the new metro; a bare hand on the rock tells her where a tunnel holds.
    code: "P134",
    name: "Heading",
    faction: "neutrals",
    kit: kit(
      "P134",
      { name: "Mano sulla roccia", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Qui non regge", scaling: { TEC: 0.6, INT: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 35, ability: "TEC" } }, { kind: "damage", multiplier: 0.35, on: "adjacent" }] },
      { name: "Crollo della galleria", scaling: { TEC: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }] },
      passive({ name: "Sedici ore", trigger: "battle_start", limit: 1, scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.08, to: "allies" }] }),
    ),
  },
  {
    // INT 10, VOL 10, TEC 9: butler and archivist of a noble house; knows ninety years of records and can forge any of them.
    code: "P149",
    name: "Custos",
    faction: "neutrals",
    kit: kit(
      "P149",
      { name: "Registro di famiglia", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Documento falso", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      { name: "Una sala a cui lei non ha accesso", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.45, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "Novant'anni di registri", modifiers: { effectChancePercent: 10, hitPercent: 4 } }),
    ),
  },
  {
    // VOL 10, INT 9: admiral of the port's fleet; hers is the only signature that makes a Lete order at sea binding. Reads very slowly.
    code: "P156",
    name: "Signatory",
    faction: "villains",
    kit: kit(
      "P156",
      { name: "La penna", scaling: { VOL: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Ordine esecutivo", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "empower", turns: 2, on: "all" }] },
      { name: "Firma in calce", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "VOL" } }] },
      passive({ name: "Legge molto lentamente", modifiers: { speedPercent: -8, effectChancePercent: 12 } }),
    ),
  },
  {
    // VOL 10, FUR 9: heir of a hero family who refused to debut and drives the night ambulance; when she falls, she floats down like a feather.
    code: "P143",
    name: "Abdicant",
    faction: "heroes",
    kit: kit(
      "P143",
      { name: "Sirena", scaling: { VOL: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Ambulanza", scaling: { VOL: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.8, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Arriviamo prima", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "status", status: "haste", turns: 1, on: "all" }] },
      passive({ name: "Scende piano come una piuma", trigger: "low_vita", thresholdPercent: 35, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.6, to: "self" }] }),
    ),
  },
  {
    // VOL 10, INT 9, COM 8: trained seven rescue squads in forty-one years; at seventy-one, she lasts forty minutes in the field.
    code: "P190",
    name: "Signifer",
    faction: "heroes",
    kit: kit(
      "P190",
      { name: "Esercitazione", scaling: { COM: 0.5, VOL: 0.5 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il metodo", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 2, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      { name: "Esserci ancora giovedì", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.5, on: "all" }, { kind: "heal", multiplier: 0.3, on: "all" }] },
      passive({ name: "Sette squadre", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // PER 9, TEC 9, VOL 9: no power; forty-one years in the cabin, the only one who can raise the port's bridges by hand.
    code: "P133",
    name: "Bascule",
    faction: "heroes",
    kit: kit(
      "P133",
      { name: "Leva", scaling: { TEC: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Ponte alzato", scaling: { TEC: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.25, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 15, ability: "TEC" } }] },
      { name: "Nove minuti", scaling: { TEC: 0.6, PER: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      passive({ name: "Un'altra persona al contrappeso", trigger: "turn_start", scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.06, to: "self" }] }),
    ),
  },
  {
    // INT 10, VOL 10, PER 8: knows the tariff of tributes, which creature woken in the digs takes cattle, which a singer.
    code: "P135",
    name: "Hecatomb",
    faction: "villains",
    kit: kit(
      "P135",
      { name: "Tributo", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il tariffario", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "In quale ordine", scaling: { INT: 0.6, VOL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Un tributo rifiutato", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "damage", multiplier: 0.5, to: "enemies" }] }),
    ),
  },
  {
    // TEC 10, INT 9, VOL 9: no power, on the record twice; frees a house of presences in four hours with a 1979 brass probe.
    code: "P194",
    name: "Tariffario",
    faction: "neutrals",
    kit: kit(
      "P194",
      { name: "Sonda d'ottone", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Quattro ore", scaling: { TEC: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "TEC" } }] },
      { name: "Casa liberata", scaling: { TEC: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "TEC" } }] },
      passive({ name: "Messo a verbale due volte", trigger: "hurt", effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 30, ability: "TEC" } }] }),
    ),
  },
  {
    // VOL 10, TEC 9, RES 8: no power; the only squad that goes into the zones where physics went mad and brings someone back alive.
    code: "P146",
    name: "Ropework",
    faction: "heroes",
    kit: kit(
      "P146",
      { name: "Moschettone", scaling: { TEC: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Tirare due volte", scaling: { VOL: 0.6, TEC: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Si torna indietro tutti", scaling: { VOL: 0.6, TEC: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.35, on: "all" }, { kind: "shield", multiplier: 0.25, on: "all" }] },
      passive({ name: "Milleduecento metri di corda", trigger: "ally_down", limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "allies" }] }),
    ),
  },
  {
    // INT 10, TEC 10: marine claims inspector; reads in the wreckage how a ship really sank.
    code: "P151",
    name: "Jurat",
    faction: "neutrals",
    kit: kit(
      "P151",
      { name: "Banco di misura", scaling: { INT: 0.5, TEC: 0.5 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Perizia", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "È stata smessa", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "Un'altra voce di polizza", modifiers: { critPercent: 5, damageVsStatus: { status: "vulnerable", percent: 20 } } }),
    ),
  },
  {
    // COM 10, RES 10, FUR 9: no power; knows how to bring the colossi of the digs down on their own weight, then sells the bones.
    code: "P157",
    name: "Hollowbone",
    faction: "villains",
    kit: kit(
      "P157",
      { name: "Fune", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Sul proprio peso", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "COM" } }] },
      { name: "Smontato", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Li smonto", modifiers: { damagePercent: 5, damageVsStatus: { status: "taunt", percent: 30 } } }),
    ),
  },
  {
    // TEC 10, INT 9: an alien technician his fleet left behind; hands on any machine, he makes it work without knowing what it is for.
    code: "P105",
    name: "Maroon",
    faction: "heroes",
    kit: kit(
      "P105",
      { name: "Mani sulla macchina", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Rimessa in funzione", scaling: { TEC: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.9, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Tecnologia della flotta", scaling: { TEC: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }] },
      passive({ name: "Hanno calcolato", trigger: "hit", limit: 2, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, VOL 10: public defender of the powerless; a recorder behind her ear tells a lived memory from a rewritten one.
    code: "P148",
    name: "Ultravires",
    faction: "heroes",
    kit: kit(
      "P148",
      { name: "Obiezione", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Ricordo riscritto", scaling: { VOL: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.6, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "VOL" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      { name: "Il testimone non mente", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary" }] },
      passive({ name: "Prova che è falso", modifiers: { effectChancePercent: 10, damageVsStatus: { status: "weaken", percent: 15 } } }),
    ),
  },
  {
    // INT 10, TEC 9: archaeologist of the metro digs; touches an old stone with his tongue and knows its age. Everything else tastes of dust.
    code: "P188",
    name: "Strata",
    faction: "heroes",
    kit: kit(
      "P188",
      { name: "Cazzuola", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Novantaquattromila anni", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "INT" } }] },
      { name: "Strato dopo strato", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Sente solo polvere", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "fortify", turns: 1, to: "self" }] }),
    ),
  },
  {
    // PER 10, VOL 10, INT 8, MAG 8 (Gamma): sewed the city's first hero suit; her seams keep the wearer as he was at the fitting.
    code: "P199",
    name: "Sampler",
    faction: "heroes",
    kit: kit(
      "P199",
      { name: "Ago", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Prova d'abito", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.9, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Com'era quando l'ha provato", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.6, on: "all" }, { kind: "shield", multiplier: 0.25, on: "all" }] },
      passive({ name: "Il filo regge", trigger: "battle_start", limit: 1, scaling: { MAG: 1 }, effects: [{ kind: "shield", multiplier: 0.25, to: "allies" }] }),
    ),
  },
  {
    // ENE 8, MAG 6 (Gamma): burns everything she touches, her own scarred hands included; she never shakes hands.
    code: "P071",
    name: "Cineris",
    faction: "villains",
    kit: kit(
      "P071",
      { name: "Tocco che brucia", scaling: { ENE: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 40, ability: "ENE" } }] },
      { name: "Non stringe mani", scaling: { ENE: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Cenere", scaling: { ENE: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 50, ability: "ENE" } }] },
      passive({ name: "Mani coperte di cicatrici", trigger: "hurt", effects: [{ kind: "status", status: "burn", turns: 1, to: "other", chance: { base: 40, ability: "ENE" } }] }),
    ),
  },
  {
    // INT 10, VOL 10, TEC 9: no power; wrote the only treatment for the fever of those who were near the tear. It does not heal, it stabilises.
    code: "P189",
    name: "Febrifuge",
    faction: "heroes",
    kit: kit(
      "P189",
      { name: "Siringa", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Protocollo", scaling: { INT: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.8, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Stabilizzare", scaling: { INT: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "heal", multiplier: 0.3, on: "all" }] },
      passive({ name: "Le restituisco domani", trigger: "ally_down", limit: 2, scaling: { INT: 1 }, effects: [{ kind: "heal", multiplier: 0.2, to: "allies" }] }),
    ),
  },
  {
    // MAG 8, ENE 6, TEC 6 (Gamma): a city witch whose ingredients are cables, house numbers and names; fixes her spells with a soldering iron.
    code: "P040",
    name: "Gridwitch",
    faction: "heroes",
    kit: kit(
      "P040",
      { name: "Cavo scoperto", scaling: { MAG: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Tre minuti di ritardo", scaling: { MAG: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 55, ability: "MAG" } }] },
      { name: "Isolato al buio", scaling: { MAG: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "La aggiusta col saldatore", modifiers: { effectChancePercent: 10, damagePercent: 10 } }),
    ),
  },
  {
    // VOL 10, PER 8: leads the short crossings into the tear's zones; counts her steps and three companions', and always brings them back.
    code: "P191",
    name: "Diaria",
    faction: "heroes",
    kit: kit(
      "P191",
      { name: "Diciannove", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il conto dei passi", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 1, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Riportarli indietro", scaling: { VOL: 0.6, PER: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }, { kind: "status", status: "haste", turns: 1, on: "all" }] },
      passive({ name: "Il conto riparte da zero", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // PER 10, RES 8, FOR 7 (Gamma): three-headed dog of the necropolis under the metro, now guarding the Banco's vaults.
    code: "P087",
    name: "Cerbero",
    faction: "neutrals",
    kit: kit(
      "P087",
      { name: "Tre morsi", scaling: { FOR: 0.5, PER: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Guardia ai sotterranei", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Tre teste", scaling: { FOR: 0.5, PER: 0.5 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary" }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      passive({ name: "Litigano per la ciotola", trigger: "hurt", scaling: { PER: 1 }, effects: [{ kind: "damage", multiplier: 0.25, to: "other" }] }),
    ),
  },
  {
    // VOL 10, MAG 9, PER 9 (Gamma): an old couple who act out a living district every day; while the act holds, the block stays alive.
    code: "P206",
    name: "Penates",
    faction: "neutrals",
    kit: kit(
      "P206",
      { name: "Buongiorno signora", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "La recita", scaling: { VOL: 0.6, MAG: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "L'isolato resta vivo", scaling: { VOL: 0.6, MAG: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.6, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "Oggi c'è il sole", trigger: "turn_start", scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.1, to: "self" }] }),
    ),
  },
  {
    // TEC 8, ENE 6 (Gamma): the Lete's robot builder; his machines go mad only when he decides. The noise always gives him away.
    code: "P036",
    name: "Swarf",
    faction: "villains",
    kit: kit(
      "P036",
      { name: "Robot impazzito", scaling: { TEC: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Fuori controllo", scaling: { TEC: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.55, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 20, ability: "TEC" } }] },
      { name: "Lo decide lui", scaling: { TEC: 0.6, ENE: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Lo tradisce il rumore", modifiers: { damagePercent: 10, speedPercent: -5 } }),
    ),
  },
  {
    // PER 10, MAG 9, VOL 9 (Gamma): looks not for people but for their absence; an iron rod finds the exact spot where someone vanished.
    code: "P138",
    name: "Dowser",
    faction: "neutrals",
    kit: kit(
      "P138",
      { name: "Bacchetta di ferro", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il punto esatto", scaling: { PER: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Una ricerca al mese", scaling: { PER: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Qualcuno che lo aspetta ancora", trigger: "ally_down", limit: 2, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // INT 10, TEC 10, VOL 9: no power; a maintenance technician who goes into the tear's zones every day. Forty-three minutes, by the procedure.
    code: "P144",
    name: "Dosimeter",
    faction: "heroes",
    kit: kit(
      "P144",
      { name: "Sensore", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Procedura", scaling: { TEC: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.65, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Quarantatré minuti", scaling: { TEC: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 35, ability: "TEC" } }] },
      passive({ name: "Se non è nell'elenco, esce", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.5, to: "self" }, { kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
];
