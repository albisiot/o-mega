// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, thirteenth batch: the next 25 characters
// that do not come out of the packs, in code order (P303 to P327: 8 Delta, 17 Gamma), written from
// their card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 13). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_13: CombatKitEntry[] = [
  {
    // PSI 10, VOL 8, INT 7 (Delta): a covered-market barker who hypnotises with his voice, selling the end of the world in instalments for the Figli; when the crowd wakes he runs first.
    code: "P303",
    name: "Imbonitore",
    faction: "villains",
    kit: kit(
      "P303",
      { name: "Signori, signori!", scaling: { PSI: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "A rate, senza interessi", scaling: { PSI: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "PSI" } }] },
      { name: "L'ultima ora in vendita", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Scappa per primo", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 9, COM 7, ENE 7 (Delta): the Lete worker at the drill that touched the temple; since that night his arms shake like a jackhammer and go through concrete.
    code: "P304",
    name: "Trivella",
    faction: "villains",
    kit: kit(
      "P304",
      { name: "Martello pneumatico", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Apre i muri che servono", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "FOR" } }] },
      { name: "Non smetto di tremare", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.7, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Silenzioso non sa essere", modifiers: { damagePercent: 6, critPercent: 4 } }),
    ),
  },
  {
    // VEL 10, FUR 8, PER 7 (Delta): a parkour courier without a Sign who crosses the city over the roofs carrying parcels nobody must open; works for whoever pays best.
    code: "P305",
    name: "Scavalco",
    faction: "neutrals",
    kit: kit(
      "P305",
      { name: "Sopra i tetti", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il pacco arriva", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "Non lo voglio sapere", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }] },
      passive({ name: "Niente poteri", modifiers: { speedPercent: 8, hitPercent: 4 } }),
    ),
  },
  {
    // RES 10, VOL 9, VEL 7 (Delta): a stuntwoman of the harbour film studios, paid to fall in place of the Signed who go on TV; more broken bones than years of career, and always gets up.
    code: "P306",
    name: "Cascata",
    faction: "neutrals",
    kit: kit(
      "P306",
      { name: "Caduta controllata", scaling: { RES: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Al posto dei Segnati", scaling: { RES: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }] },
      { name: "Cadere bene", scaling: { RES: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Si rialza sempre", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.35, to: "self" }] }),
    ),
  },
  {
    // TEC 10, INT 8 (Delta): a scrapyard girl who welded herself a robot out of junk and rents it for removals, demolitions and brawls; it can be heard three districts away.
    code: "P307",
    name: "Saldatrice",
    faction: "neutrals",
    kit: kit(
      "P307",
      { name: "Robot di rottami", scaling: { TEC: 0.6, INT: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Tre portiere e una lavatrice", scaling: { TEC: 0.6, INT: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Funziona, no?", scaling: { TEC: 0.6, INT: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Si sente da tre quartieri", trigger: "hurt", limit: 2, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.12, to: "self" }] }),
    ),
  },
  {
    // FUR 8, MAG 8 (Delta): a gambler at the Banco's casino with a Sign of luck: beams miss him, cards turn his way, bullets go astray. All goes well as long as he does not think about it.
    code: "P308",
    name: "Dado",
    faction: "neutrals",
    kit: kit(
      "P308",
      { name: "Il dado", scaling: { MAG: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Le carte gli girano", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "MAG" } }] },
      { name: "Non ho un piano", scaling: { FUR: 0.6, MAG: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Finché non ci pensa", modifiers: { critPercent: 10 } }),
    ),
  },
  {
    // RES 10, FOR 9, COM 8 (Delta): a bouncer at the Banco's casino who turns heavy as lead: lands on a car and crushes it, plants himself before a door and nobody moves him.
    code: "P309",
    name: "Buttafuori",
    faction: "neutrals",
    kit: kit(
      "P309",
      { name: "Peso di piombo", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Qui non si entra", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Atterra su un'auto", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "FOR" } }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Prova a spostarmi", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PER 9, PSI 9, VEL 7 (Delta): a dog-sitter who leads the harbour's strays with his mind: one whistle and the pack charges, another and it sits. Cannot throw a punch.
    code: "P310",
    name: "Guinzaglio",
    faction: "neutrals",
    kit: kit(
      "P310",
      { name: "Il branco", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Seduti. Tutti.", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "PSI" } }] },
      { name: "Un fischio e carica", scaling: { PSI: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "PER" } }] },
      passive({ name: "Li presta a chi paga", trigger: "hit", limit: 3, scaling: { PSI: 1 }, effects: [{ kind: "damage", multiplier: 0.12, to: "other" }] }),
    ),
  },
  {
    // FUR 10, PER 8, VEL 7 (Gamma): a worker at the Banco's mint who turns transparent as a watermark; by day she checks banknotes, by night she strikes for the Lanterne unseen.
    code: "P311",
    name: "Filigrana",
    faction: "heroes",
    kit: kit(
      "P311",
      { name: "Trasparente", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Mi hai vista?", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "FUR" } }] },
      { name: "Senza farsi vedere arrivare", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.15, on: "primary" }] },
      passive({ name: "Era quello il punto", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 40, ability: "FUR" } }] }),
    ),
  },
  {
    // RES 10, TEC 8, VOL 8 (Gamma): a dry-dock welder of the Faro squad in a building-site exoskeleton, raising hexagonal walls of light between the city and whatever strikes it.
    code: "P312",
    name: "Paratia",
    faction: "heroes",
    kit: kit(
      "P312",
      { name: "Esoscheletro", scaling: { RES: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Muro esagonale", scaling: { TEC: 0.6, RES: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.75, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Dietro di me", scaling: { RES: 0.6, TEC: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.35, on: "all" }, { kind: "status", status: "taunt", turns: 2, on: "self" }] },
      passive({ name: "Difficile da sfondare", trigger: "hurt", limit: 2, scaling: { TEC: 1 }, effects: [{ kind: "shield", multiplier: 0.08, to: "allies" }] }),
    ),
  },
  {
    // RES 10, VOL 9, INT 7 (Gamma): a night-shift nurse whose wounds stitch themselves with points of light, stronger the longer the night; treats whoever the Lanterne bring.
    code: "P313",
    name: "Rammendo",
    faction: "heroes",
    kit: kit(
      "P313",
      { name: "Punti di luce", scaling: { VOL: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Senza chiedere nomi", scaling: { VOL: 0.6, INT: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.95, on: "primary" }] },
      { name: "La notte è lunga", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.5, on: "all" }] },
      passive({ name: "Io di più", trigger: "turn_start", scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.05, to: "self" }] }),
    ),
  },
  {
    // COM 9, FUR 8, VEL 7 (Gamma): a boxer of the Fosse who splits in two: he trains with himself and enters the ring as a pair. He and his copy never agree on anything.
    code: "P314",
    name: "Doppione",
    faction: "heroes",
    kit: kit(
      "P314",
      { name: "Uno-due", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Arriva in due", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      { name: "Due contro uno", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.15, on: "primary" }] },
      passive({ name: "Mai d'accordo su niente", modifiers: { critPercent: 6, damagePercent: 4 } }),
    ),
  },
  {
    // FUR 10, PER 9, VEL 8 (Gamma): a pastry cook who shrinks to the size of a crumb and gets into locks, cables and pockets; the Lanterne send her where nobody can pass.
    code: "P315",
    name: "Briciola",
    faction: "heroes",
    kit: kit(
      "P315",
      { name: "Nella serratura", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Nelle tasche", scaling: { PER: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 45, ability: "PER" } }] },
      { name: "Più posti vedo", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }] },
      passive({ name: "Più piccola divento", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // VEL 10, PER 8 (Gamma): a postman who teleports a few metres at a time, arrives before the letter and knows every house in the city. Always arrives with a bang.
    code: "P316",
    name: "Recapito",
    faction: "heroes",
    kit: kit(
      "P316",
      { name: "Raccomandata", scaling: { VEL: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Con un botto", scaling: { VEL: 0.6, ENE: 0.4 }, range: "infiltration", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 15, ability: "VEL" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Sono già arrivato", scaling: { VEL: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }] },
      passive({ name: "Prima della lettera", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // PER 9, INT 7, VOL 7 (Gamma): a Lete hunter who catches the strongest Signed with nets of thread that switch Signs off; the more powerful the target, the more the Company pays.
    code: "P317",
    name: "Trappola",
    faction: "villains",
    kit: kit(
      "P317",
      { name: "Rete", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Filo che spegne i Segni", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "PER" } }] },
      { name: "Più vali, più ti cerco", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Più sei forte", modifiers: { damageVsStatus: { status: "empower", percent: 25 }, hitPercent: 4 } }),
    ),
  },
  {
    // PER 10, COM 9, VEL 7 (Gamma): a former javelin champion paid by the Figli; no Sign, but she never misses a throw, darts, knives or roof tiles. Once she finds the spot, no defence holds.
    code: "P318",
    name: "Dardo",
    faction: "villains",
    kit: kit(
      "P318",
      { name: "Giavellotto", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il punto giusto", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Non ho mai sbagliato", scaling: { PER: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 2, on: "primary" }] },
      passive({ name: "Non sbaglio", modifiers: { hitPercent: 8, critPercent: 2 } }),
    ),
  },
  {
    // FOR 10, COM 9, RES 8 (Gamma): a wrestler sponsored by the Lete as a TV «hero»; grows with the applause and after a win is unstoppable.
    code: "P319",
    name: "Ovazione",
    faction: "villains",
    kit: kit(
      "P319",
      { name: "Presa da televisione", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Più forte!", scaling: { COM: 0.6, RES: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.3, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Non vi sento!", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Dopo una vittoria", trigger: "knockout", scaling: { FOR: 1 }, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "shield", multiplier: 0.2, to: "self" }] }),
    ),
  },
  {
    // RES 10, FOR 9, COM 8, VEL 8 (Gamma): charges in a straight line through walls, trams and gates, clearing the way for the Figli; best at the start, when nobody expects it.
    code: "P320",
    name: "Bolide",
    faction: "villains",
    kit: kit(
      "P320",
      { name: "Carica", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Sfonda il tram", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "FOR" } }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "Curve? Non ne faccio", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Quando nessuno se lo aspetta", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }, { kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // VEL 9, PER 8, VOL 7 (Gamma): a circus tightrope walker gone over to the Figli; stands on a wire, a hook, a blade, and is at her best when the match hangs in the balance.
    code: "P321",
    name: "Bilico",
    faction: "villains",
    kit: kit(
      "P321",
      { name: "Sul cavo", scaling: { VEL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Su una lama", scaling: { VEL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "self" }] },
      { name: "Il bordo", scaling: { VEL: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Quando la partita è in bilico", trigger: "low_vita", thresholdPercent: 50, limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // FUR 10, INT 8, PER 7 (Gamma): a Lete infiltrator who takes others' faces and voices and walks into the Custodi's barracks; no longer remembers her own face.
    code: "P322",
    name: "Calco",
    faction: "villains",
    kit: kit(
      "P322",
      { name: "Faccia d'altri", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Oggi sono tua sorella", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 25, ability: "INT" } }] },
      { name: "Domani vediamo", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "La sua faccia non se la ricorda", modifiers: { critPercent: 6, speedPercent: 6 } }),
    ),
  },
  {
    // VOL 10, PER 9, INT 7 (Gamma): the referee of the Banco's challenges; at her whistle fighters, explosions, even rules stop. Nobody has ever seen her lose her calm.
    code: "P323",
    name: "Fischio",
    faction: "neutrals",
    kit: kit(
      "P323",
      { name: "Cartellino", scaling: { VOL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Fermi tutti", scaling: { VOL: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.25, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "VOL" } }] },
      { name: "Ho fischiato", scaling: { VOL: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.5, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "VOL" } }] },
      passive({ name: "Mai persa la calma", modifiers: { effectChancePercent: 4, hitPercent: 4 } }),
    ),
  },
  {
    // FUR 8, INT 8, VEL 8, MAG 7 (Gamma): a street conjurer with real magic, used for swindles: scarves that bind, coins that vanish, cards switched on the table.
    code: "P324",
    name: "Trucco",
    faction: "neutrals",
    kit: kit(
      "P324",
      { name: "Moneta che sparisce", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Sciarpe che legano", scaling: { MAG: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Scegli una carta", scaling: { MAG: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "No, non quella", trigger: "hit", limit: 2, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "other", chance: { base: 40, ability: "MAG" } }] }),
    ),
  },
  {
    // TEC 10, VOL 8, PER 7 (Gamma): a streamer chasing the Signed with her drones and broadcasting every fight; the likes really make her stronger, and after a win she is sky-high.
    code: "P325",
    name: "Diretta",
    faction: "neutrals",
    kit: kit(
      "P325",
      { name: "Drone", scaling: { TEC: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Tutti vi vedono", scaling: { TEC: 0.6, PER: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "TEC" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Siamo in diretta!", scaling: { TEC: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "TEC" } }] },
      passive({ name: "Alle stelle", trigger: "knockout", effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // PER 9, INT 8, VEL 7 (Gamma): the Banco's relic hunter, who goes beyond the tear to Giza, the Yucatán, the Arctic and comes back with what the vault wants.
    code: "P326",
    name: "Bussola",
    faction: "neutrals",
    kit: kit(
      "P326",
      { name: "Reperto", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Fuori città", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "PER" } }] },
      { name: "Le mie regole no", scaling: { PER: 0.6, VEL: 0.4 }, effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Rende il doppio", modifiers: { damagePercent: 6, hitPercent: 6 } }),
    ),
  },
  {
    // PER 9, VOL 8, ENE 7 (Gamma): a fisher of the Signed for the Banco's register; her glowing lure draws anyone with a Sign, and she reels them in one at a time. Best at the start.
    code: "P327",
    name: "Esca",
    faction: "neutrals",
    kit: kit(
      "P327",
      { name: "Lenza", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Esca luminosa", scaling: { VOL: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Uno alla volta", scaling: { PER: 0.6, ENE: 0.4 }, effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 30, ability: "PER" } }] },
      passive({ name: "Prima che capiscano il trucco", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "enemies", chance: { base: 40, ability: "PER" } }] }),
    ),
  },
];
