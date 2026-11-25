// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, second batch: the kits of the next 25
// characters of the packs that players own most without a kit (all Delta), written from their
// card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 2). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_2: CombatKitEntry[] = [
  {
    // PER 9, RES 8, TEC 8, VOL 8: the Custodi's traffic robot; fines everyone, heroes first. Magic and thoughts do not exist for him.
    code: "P094",
    name: "Censor",
    faction: "heroes",
    kit: kit(
      "P094",
      { name: "Verbale", scaling: { PER: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Multa", scaling: { PER: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Contravvenzione a tutti", scaling: { PER: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "PER" } }] },
      passive({ name: "Magia e pensieri non esistono", trigger: "battle_start", limit: 1, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.5, to: "self" }, { kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PSI 9, VOL 9: the Figli's witch; the city's bells ring by themselves when she comes, and her spells follow them.
    code: "P016",
    name: "Belladonna",
    faction: "villains",
    kit: kit(
      "P016",
      { name: "Rintocco", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Campane a morto", scaling: { MAG: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "MAG" } }] },
      { name: "Mezzanotte", scaling: { MAG: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 20, ability: "PSI" } }] },
      passive({ name: "La si sente da tre quartieri", modifiers: { damagePercent: 6, effectChancePercent: 5 } }),
    ),
  },
  {
    // ENE 6, RES 6, a bit of everything: under his bar's roof nobody hurts another customer; the only neutral ground in Nuova Megara.
    code: "P017",
    name: "Publican",
    faction: "neutrals",
    kit: kit(
      "P017",
      { name: "Strofinaccio", scaling: { COM: 0.5, FOR: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Terreno neutrale", scaling: { ENE: 0.5, MAG: 0.5 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 2, on: "all" }, { kind: "shield", multiplier: 0.45, on: "all" }] },
      { name: "Chiusura", scaling: { COM: 0.5, FOR: 0.5 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "COM" } }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Al bancone si paga uguale", trigger: "hurt", limit: 4, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.35, to: "self" }] }),
    ),
  },
  {
    // FUR 8, INT 7, VEL 7: talks a lock back to before it was locked; for a few seconds the door was never shut.
    code: "P021",
    name: "Latchkey",
    faction: "villains",
    kit: kit(
      "P021",
      { name: "Scrocco", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "La porta non è mai stata chiusa", scaling: { INT: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.45, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "INT" } }] },
      { name: "Cassaforte", scaling: { FUR: 0.6, INT: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Purché non sia elettronica", modifiers: { critPercent: 10, speedPercent: 8 } }),
    ),
  },
  {
    // TEC 8, INT 7, PSI 7: built a swarm of mechanical wasps and rents it to the Compagnia Lete; sleeps with the light on.
    code: "P067",
    name: "Odonate",
    faction: "villains",
    kit: kit(
      "P067",
      { name: "Pungiglione", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "TEC" } }] },
      { name: "Sciame", scaling: { TEC: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.5, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 40, ability: "TEC" } }] },
      { name: "Nuvola di vespe", scaling: { TEC: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 45, ability: "TEC" } }] },
      passive({ name: "Dorme con la luce accesa", modifiers: { effectChancePercent: 5, damageVsStatus: { status: "burn", percent: 20 } } }),
    ),
  },
  {
    // COM 10, FOR 9, RES 8: the Banco's collector and a former boxer; for ninety seconds he borrows the body he had at twenty-two.
    code: "P106",
    name: "Futures",
    faction: "neutrals",
    kit: kit(
      "P106",
      { name: "Jab", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Guardia alta", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "KO tecnico", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "COM" } }] },
      passive({ name: "Novanta secondi", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "self" }] }),
    ),
  },
  {
    // VEL 10, FUR 9, PER 9: thirty with a boy's face, which he uses to vanish into the crowd with your wallet.
    code: "P002",
    name: "Foundling",
    faction: "villains",
    kit: kit(
      "P002",
      { name: "Mani veloci", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Il portafoglio", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "FUR" } }, { kind: "status", status: "haste", turns: 2, on: "self" }] },
      { name: "Sparito tra la folla", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "Hai ancora il portafoglio?", modifiers: { speedPercent: 5, critPercent: 3 } }),
    ),
  },
  {
    // INT 10, TEC 9, PER 0: the Banco's accounting robot; checks each payment three times and never finds it.
    code: "P082",
    name: "Abeyance",
    faction: "neutrals",
    kit: kit(
      "P082",
      { name: "Registro", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Il pagamento non risulta", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "INT" } }] },
      { name: "Controllo triplo", scaling: { INT: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 45, ability: "INT" } }] },
      passive({ name: "Fuori dai registri non vede niente", modifiers: { hitPercent: 8, effectChancePercent: 8 } }),
    ),
  },
  {
    // INT 10, VOL 10, RES 9, VEL 0: for thirty-one years, nine floors under the city, she has kept the things nobody could destroy.
    code: "P192",
    name: "Depositum",
    faction: "neutrals",
    kit: kit(
      "P192",
      { name: "Inventario", scaling: { INT: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Ogni quanto va girata", scaling: { VOL: 0.6, RES: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Nove piani sotto", scaling: { VOL: 0.6, RES: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.5, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Non può rifiutarne una", trigger: "hurt", limit: 4, effects: [{ kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // ENE 8, FOR 7, TEC 6: his Segno pulls metal (keys, cutlery, manhole covers) and he cannot switch it off yet.
    code: "P063",
    name: "Azimuth",
    faction: "heroes",
    kit: kit(
      "P063",
      { name: "Chiavi volanti", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Tombino", scaling: { ENE: 0.6, FOR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "ENE" } }] },
      { name: "Tutto il metallo del quartiere", scaling: { ENE: 0.7, FOR: 0.3 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.1, on: "all" }] },
      passive({ name: "Mazzi di chiavi sulla giacca", trigger: "hit", limit: 5, scaling: { ENE: 1 }, effects: [{ kind: "shield", multiplier: 0.15, to: "self" }] }),
    ),
  },
  {
    // VOL 10, INT 9, PER 9: the doorkeeper of a building under the truce; she knows who is in, on which floor and since when.
    code: "P193",
    name: "Portineria",
    faction: "neutrals",
    kit: kit(
      "P193",
      { name: "Chi va là", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "La tregua", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 1, on: "all" }, { kind: "shield", multiplier: 0.3, on: "all" }] },
      { name: "Oltre la striscia d'ottone", scaling: { PER: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.55, on: "all" }, { kind: "status", status: "vulnerable", turns: 2, on: "all", chance: { base: 45, ability: "PER" } }] },
      passive({ name: "Sa chi c'è e a che piano", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "enemies", chance: { base: 30, ability: "PER" } }] }),
    ),
  },
  {
    // COM 10, PER 8, VOL 7: knife-grinder by day, hitman by night on a written, countersigned order; three gestures per opponent.
    code: "P196",
    name: "Onorario",
    faction: "villains",
    kit: kit(
      "P196",
      { name: "Lama affilata", scaling: { COM: 0.6, PER: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Mandato controfirmato", scaling: { PER: 0.6, COM: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "PER" } }] },
      { name: "Tre gesti", scaling: { COM: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Mai uno in più", trigger: "knockout", limit: 2, effects: [{ kind: "charge", amount: 2, to: "self" }] }),
    ),
  },
  {
    // MAG 10, PSI 9, VOL 9, FOR 0: reads the future at the market and chalks thresholds that ill will cannot cross.
    code: "P004",
    name: "Wardmother",
    faction: "neutrals",
    kit: kit(
      "P004",
      { name: "Due monete", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Soglia di gesso", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.35, on: "all" }] },
      { name: "Il futuro al mercato", scaling: { MAG: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.55, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "MAG" } }] },
      passive({ name: "La borsa gliela porta il quartiere", trigger: "ally_down", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "allies" }] }),
    ),
  },
  {
    // ENE 6, TEC 6: the Lanterne's radio amateur; keeps the district talking when the network fails, and hears what she should not.
    code: "P020",
    name: "Longwave",
    faction: "heroes",
    kit: kit(
      "P020",
      { name: "Interferenza", scaling: { ENE: 0.5, TEC: 0.5 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "In contatto", scaling: { TEC: 1 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 1, on: "all" }] },
      { name: "Su tutte le frequenze", scaling: { ENE: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 15, ability: "ENE" } }] },
      passive({ name: "Ascolta quello che non dovrebbe", trigger: "battle_start", limit: 1, effects: [{ kind: "charge", amount: 1, to: "allies" }] }),
    ),
  },
  {
    // INT 10, VOL 10, TEC 9: no power; knows by heart the service tunnels and chimney flues of the noble palaces, even the erased ones.
    code: "P145",
    name: "Undercroft",
    faction: "heroes",
    kit: kit(
      "P145",
      { name: "Dal montacarichi", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Canna fumaria", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 45, ability: "INT" } }] },
      { name: "Al meno tre", scaling: { INT: 0.6, VOL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      passive({ name: "Se il passaggio è ostruito", trigger: "hurt", limit: 2, effects: [{ kind: "status", status: "haste", turns: 1, to: "self" }] }),
    ),
  },
  {
    // VOL 10, INT 8, PER 7: while her voice carries without a microphone, every power meter gives all present the same value.
    code: "P147",
    name: "Isonomy",
    faction: "heroes",
    kit: kit(
      "P147",
      { name: "Senza microfono", scaling: { VOL: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Misuratemi di nuovo", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.4, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "VOL" } }] },
      { name: "Siamo la stessa cosa", scaling: { VOL: 0.6, INT: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.35, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "Né togliere né dare", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "fortify", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // PSI 10, PER 9, VOL 9, FOR 0: sees how it will end, always and in detail. Nobody ever believes her.
    code: "P006",
    name: "Ephemeris",
    faction: "neutrals",
    kit: kit(
      "P006",
      { name: "Te l'avevo detto", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Come andrà a finire", scaling: { PSI: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Lo sapevo", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 50, ability: "PSI" } }] },
      passive({ name: "Nessuno le crede", modifiers: { critPercent: 8, hitPercent: 8 } }),
    ),
  },
  {
    // ENE 6, MAG 6, a little of everything: a novice of the Figli; three and a half spells, made to work by sheer enthusiasm.
    code: "P011",
    name: "Epigone",
    faction: "villains",
    kit: kit(
      "P011",
      { name: "Tre formule e mezza", scaling: { ENE: 0.5, MAG: 0.5 }, effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Entusiasmo", scaling: { MAG: 0.5, VOL: 0.5 }, target: "self", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }, { kind: "shield", multiplier: 0.7, on: "primary" }] },
      { name: "La formula intera", scaling: { MAG: 0.6, ENE: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Ha portato i biscotti", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "empower", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // INT 8, PER 7, TEC 7: hands on a patient, she makes an organ work past its limit for forty minutes; the health she gives away, she lacks.
    code: "P015",
    name: "Suture",
    faction: "heroes",
    kit: kit(
      "P015",
      { name: "Bisturi", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Quaranta minuti", scaling: { INT: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 1.3, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "La clinica delle Lanterne", scaling: { INT: 0.6, MAG: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.9, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Si ammala solo lei", modifiers: { healPercent: 25 } }),
    ),
  },
  {
    // RES 6, VOL 6: the Custodi's firefighter; he does not put fire out, he turns it back into what it was. In first, out last.
    code: "P023",
    name: "Ignifuge",
    faction: "heroes",
    kit: kit(
      "P023",
      { name: "Accetta", scaling: { FOR: 0.5, COM: 0.5 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Entra per primo", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Undici gesti", scaling: { MAG: 0.5, VOL: 0.5 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 2, on: "all" }] },
      passive({ name: "Esce per ultimo", trigger: "low_vita", thresholdPercent: 30, limit: 1, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.6, to: "self" }, { kind: "status", status: "fortify", turns: 2, to: "self" }] }),
    ),
  },
  {
    // FUR 10, PER 9, INT 7: runs a motel and listens; after enough hours she has a guest's voice, signature and breath.
    code: "P107",
    name: "Procura",
    faction: "villains",
    kit: kit(
      "P107",
      { name: "Firma del cliente", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La sua voce", scaling: { FUR: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "FUR" } }] },
      { name: "La camera nove", scaling: { FUR: 0.6, PER: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary" }] },
      passive({ name: "Una vita che non è sua", trigger: "hit", effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 30, ability: "FUR" } }] }),
    ),
  },
  {
    // FOR 10, COM 9, RES 8: a body-shop man whose every hammer blow weighs like a tow truck; now and then he picks the wrong car.
    code: "P124",
    name: "Impound",
    faction: "heroes",
    kit: kit(
      "P124",
      { name: "Martellata", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Carro attrezzi", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Doppia fila", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }] },
      passive({ name: "Ogni tanto sbaglia macchina", modifiers: { damagePercent: 12, hitPercent: -5 } }),
    ),
  },
  {
    // INT 10, TEC 10: no power; with a counterweighted table and taut strings he redraws in eleven minutes a coast that never keeps still.
    code: "P154",
    name: "Periplus",
    faction: "neutrals",
    kit: kit(
      "P154",
      { name: "Contrappeso", scaling: { INT: 0.5, TEC: 0.5 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Mappa in undici minuti", scaling: { INT: 1 }, target: "all_allies", effects: [{ kind: "status", status: "haste", turns: 2, on: "all" }] },
      { name: "Una costa che non sta ferma", scaling: { INT: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "INT" } }] },
      passive({ name: "Vera fino a stanotte", modifiers: { speedPercent: 8, hitPercent: 5 } }),
    ),
  },
  {
    // COM 10, FUR 10: no power; hunts the hunters. Waits for hours and strikes only who comes home tired or wounded.
    code: "P195",
    name: "Sottovento",
    faction: "villains",
    kit: kit(
      "P195",
      { name: "Agguato", scaling: { COM: 0.5, FUR: 0.5 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Conosce i turni", scaling: { INT: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Chi torna a casa stanco", scaling: { COM: 0.5, FUR: 0.5 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.1, on: "primary" }] },
      passive({ name: "Caccia i cacciatori", modifiers: { critPercent: 6, damageVsStatus: { status: "vulnerable", percent: 25 } } }),
    ),
  },
  {
    // RES 10, FUR 9, VEL 0: stretches for tens of metres and grabs anything; the arm gets there at once, the rest of her calmly.
    code: "P064",
    name: "Tether",
    faction: "heroes",
    kit: kit(
      "P064",
      { name: "Braccio lungo", scaling: { FUR: 0.6, COM: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Afferra", scaling: { FUR: 0.6, COM: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FUR" } }] },
      { name: "Presa a distanza", scaling: { FUR: 0.6, RES: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Il resto, con calma", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.5, to: "self" }] }),
    ),
  },
];
