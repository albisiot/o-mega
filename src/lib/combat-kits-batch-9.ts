// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, ninth batch: the kits of the last 21
// characters of the packs without a kit (16 Omega, 3 Alfa, 2 Beta), written from their card
// (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 9). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_9: CombatKitEntry[] = [
  {
    // PER 10, VOL 10, MAG 9 (Beta): gravedigger of the hill cemetery; with the third shovelful and the dead's true name the burial holds for good.
    code: "P211",
    name: "Inhumer",
    faction: "neutrals",
    kit: kit(
      "P211",
      { name: "Palata", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il nome vero", scaling: { PER: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Sepoltura definitiva", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "La terza palata", trigger: "knockout", effects: [{ kind: "charge", amount: 1, to: "allies" }] }),
    ),
  },
  {
    // VOL 10, INT 8, PER 8 (Alfa): coach of the Banco families' heirs; watching a body under strain she knows how many seconds it has left and where to push.
    code: "P229",
    name: "Gymnasiarch",
    faction: "neutrals",
    kit: kit(
      "P229",
      { name: "Spingere", scaling: { VOL: 0.6, COM: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Altri quattro secondi", scaling: { VOL: 1 }, target: "ally", effects: [{ kind: "status", status: "empower", turns: 2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Ventinove record", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "empower", turns: 1, on: "all" }, { kind: "status", status: "haste", turns: 1, on: "all" }] },
      passive({ name: "Ventinove allievi", trigger: "ally_down", limit: 1, effects: [{ kind: "status", status: "empower", turns: 2, to: "allies" }] }),
    ),
  },
  {
    // ENE 10, VOL 9, INT 8 (Alfa): from the tear, his body imposes his world's biology on everything around, in a radius that grows each month. Lives in a sphere.
    code: "P182",
    name: "Quarantine",
    faction: "heroes",
    kit: kit(
      "P182",
      { name: "La sfera", scaling: { ENE: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Biologia di un altro mondo", scaling: { ENE: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }] },
      { name: "Ho bussato io", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.85, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Un raggio che cresce", trigger: "turn_start", scaling: { ENE: 1 }, effects: [{ kind: "damage", multiplier: 0.04, to: "enemies" }] }),
    ),
  },
  {
    // COM 10, FOR 10, TEC 10, VEL 10 (Omega): a perfect armour that patrols the city every night, fast and precise as no soldier. Nobody is inside.
    code: "P058",
    name: "Absentia",
    faction: "heroes",
    kit: kit(
      "P058",
      { name: "Pattuglia", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Precisa come nessun soldato", scaling: { COM: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "TEC" } }] },
      { name: "Dentro non c'è nessuno", scaling: { COM: 0.6, FOR: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Ogni notte", modifiers: { hitPercent: 10, critPercent: 6 } }),
    ),
  },
  {
    // FUR 10, PER 10, PSI 10, VEL 10 (Omega): hears the thoughts of everyone around and has stopped having its own; obeys the last voice it heard.
    code: "P059",
    name: "Multitude",
    faction: "villains",
    kit: kit(
      "P059",
      { name: "Mille pensieri", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "L'ultima voce", scaling: { PSI: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "PSI" } }] },
      { name: "Sente tutti", scaling: { PSI: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 35, ability: "PSI" } }] },
      passive({ name: "Nemmeno un pensiero suo", modifiers: { speedPercent: 3, effectChancePercent: 8 } }),
    ),
  },
  {
    // ENE 10, PER 10, RES 10, VOL 10 (Omega): on a copper throne under the power plant he holds alone the magnetic field that shields Nuova Megara. He cannot get up.
    code: "P114",
    name: "Perpetuum",
    faction: "heroes",
    kit: kit(
      "P114",
      { name: "Campo magnetico", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Portatemi da leggere", scaling: { ENE: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 35, ability: "ENE" } }] },
      { name: "La città resta scoperta", scaling: { ENE: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.5, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Non può alzarsi", trigger: "battle_start", limit: 1, scaling: { ENE: 1 }, effects: [{ kind: "shield", multiplier: 0.12, to: "allies" }], modifiers: { speedPercent: -8 } }),
    ),
  },
  {
    // FUR 10, MAG 10, VEL 10 (Alfa): the black cat said to have crossed the plant engineers' road on the night of the Ora Zero; things go a bit wrong for whoever it passes.
    code: "P131",
    name: "Mischance",
    faction: "neutrals",
    kit: kit(
      "P131",
      { name: "Ti passa davanti", scaling: { MAG: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 0.95, on: "primary" }] },
      { name: "Va storto un po' tutto", scaling: { MAG: 1 }, target: "all_enemies", effects: [{ kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 35, ability: "MAG" } }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 25, ability: "MAG" } }] },
      { name: "Non ne ha bisogno", scaling: { MAG: 0.6, VEL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.5, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 15, ability: "MAG" } }] },
      passive({ name: "Ti è solo passato davanti", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "enemies", chance: { base: 20, ability: "MAG" } }] }),
    ),
  },
  {
    // FOR 10, MAG 10, RES 10 (Omega): a serpent twelve hundred kilometres long closing the gulf with its tail in its teeth; inside the circle, everything is kept.
    code: "P187",
    name: "Ansa",
    faction: "neutrals",
    kit: kit(
      "P187",
      { name: "Spire", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Il cerchio chiuso", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.3, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Undici passi in più", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.6, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "Tutto ciò che sta dentro", trigger: "ally_down", limit: 1, scaling: { MAG: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "allies" }] }),
    ),
  },
  {
    // PER 10, PSI 10, RES 10 (Omega): the morning news voice behind frosted glass in the Lete studios, a pack call; whoever hears it at dawn is not afraid all day.
    code: "P230",
    name: "Matins",
    faction: "villains",
    kit: kit(
      "P230",
      { name: "Buongiorno", scaling: { PSI: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.05, on: "primary" }] },
      { name: "Va tutto bene", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "status", status: "fortify", turns: 1, on: "all" }] },
      { name: "Richiamo di branco", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.35, on: "all" }, { kind: "status", status: "empower", turns: 1, on: "all" }] },
      passive({ name: "All'alba", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // FOR 10, MAG 10, RES 10 (Omega): the forest above the city, every root, beast and fog bank an organ of it; whoever enters no longer knows who is beside him.
    code: "P231",
    name: "Thicket",
    faction: "villains",
    kit: kit(
      "P231",
      { name: "Radice", scaling: { MAG: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Nebbia", scaling: { MAG: 0.6, VOL: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }, { kind: "damage", multiplier: 0.3, on: "adjacent" }] },
      { name: "Nove chilometri quadrati", scaling: { MAG: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Un corpo in prestito", trigger: "low_vita", thresholdPercent: 40, limit: 1, scaling: { MAG: 1 }, effects: [{ kind: "heal", multiplier: 0.35, to: "self" }] }),
    ),
  },
  {
    // COM 10, INT 10, RES 10, VOL 10 (Omega): he was at the centre of the Ora Zero and since then cannot die; machines do not register him. Slow, never gives in.
    code: "P057",
    name: "Holdout",
    faction: "neutrals",
    kit: kit(
      "P057",
      { name: "Rumore di fondo", scaling: { COM: 0.6, INT: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Non cede mai", scaling: { RES: 0.6, VOL: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Non ha ancora finito", scaling: { COM: 0.6, VOL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "heal", multiplier: 0.3, on: "self" }] },
      passive({ name: "Non riesce a morire", trigger: "low_vita", thresholdPercent: 25, limit: 1, scaling: { RES: 1 }, effects: [{ kind: "heal", multiplier: 0.5, to: "self" }], modifiers: { speedPercent: -6 } }),
    ),
  },
  {
    // FOR 10, MAG 10, RES 10 (Omega): the giant of myth buried for three thousand years under the volcano; when he turns in his sleep, the city shakes.
    code: "P080",
    name: "Re Tifeo",
    faction: "villains",
    kit: kit(
      "P080",
      { name: "Si gira nel sonno", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La città trema", scaling: { FOR: 0.6, MAG: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "Tremila anni", scaling: { MAG: 0.6, FOR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Sotto il vulcano", modifiers: { speedPercent: -10, damagePercent: 15 } }),
    ),
  },
  {
    // ENE 10, RES 10, TEC 10 (Omega): a strategic weapon in the Banco's vault; it takes from its target the chance to be the subject of a sentence. Needs the full name and two keys.
    code: "P142",
    name: "Parabellum",
    faction: "neutrals",
    kit: kit(
      "P142",
      { name: "Puntamento", scaling: { TEC: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Nominato al settanta per cento", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 3, on: "primary", chance: { base: 60, ability: "INT" } }] },
      { name: "Due chiavi di ceramica", scaling: { ENE: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 2.9, on: "primary" }] },
      passive({ name: "Attendo il resto del nome", modifiers: { damageVsStatus: { status: "vulnerable", percent: 25 }, speedPercent: -2 } }),
    ),
  },
  {
    // MAG 10, PER 10, VOL 10 (Omega): in a haberdasher's back room a loom of sixty-three threads, each something that lasts; she cuts one a day and that thing ends.
    code: "P185",
    name: "Ordito",
    faction: "neutrals",
    kit: kit(
      "P185",
      { name: "Filo", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Taglia un filo", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }] },
      { name: "Sessantatré fili", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 2.3, on: "primary" }] },
      passive({ name: "Se non lo fa, si spezza da solo", trigger: "turn_start", limit: 3, scaling: { MAG: 1 }, effects: [{ kind: "damage", multiplier: 0.08, to: "enemies" }] }),
    ),
  },
  {
    // ENE 10, RES 10, VOL 9 (Omega): the nine seconds of the Ora Zero never ended; inside this column of air the event is still happening, and now and then a piece falls out.
    code: "P217",
    name: "Novenarium",
    faction: "villains",
    kit: kit(
      "P217",
      { name: "Un pezzo cade fuori", scaling: { ENE: 0.6, RES: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Camera Tre, siamo pronti", scaling: { ENE: 0.6, VOL: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 45, ability: "ENE" } }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "Nove secondi", scaling: { ENE: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Ogni quarantun secondi", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "burn", turns: 1, to: "other", chance: { base: 35, ability: "ENE" } }] }),
    ),
  },
  {
    // COM 10, MAG 10 (Beta): a copper comb an arm long was registered to him by decree; when someone attacks him, it answers alone and sends the blow back. He never strikes first.
    code: "P224",
    name: "Recesso",
    faction: "heroes",
    kit: kit(
      "P224",
      { name: "Pettine di rame", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }] },
      { name: "Intestata a me", scaling: { MAG: 0.6, COM: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Rimanda il colpo", scaling: { COM: 0.6, MAG: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }] },
      passive({ name: "Non è mia", trigger: "hurt", scaling: { COM: 0.5, MAG: 0.5 }, effects: [{ kind: "damage", multiplier: 0.4, to: "other" }] }),
    ),
  },
  {
    // ENE 10, FOR 10, MAG 10, VOL 10 (Omega): since the Ora Zero he carries a volcano inside, strength, fire and magic; never learned to fight, his phone never worked.
    code: "P060",
    name: "Mongibello",
    faction: "heroes",
    kit: kit(
      "P060",
      { name: "Lava", scaling: { ENE: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "burn", turns: 1, on: "primary", chance: { base: 30, ability: "ENE" } }] },
      { name: "Eruzione", scaling: { ENE: 0.6, FOR: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "burn", turns: 2, on: "primary", chance: { base: 50, ability: "ENE" } }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      { name: "Il vulcano", scaling: { ENE: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 45, ability: "ENE" } }] },
      passive({ name: "Non ha mai imparato a combattere", modifiers: { damagePercent: 14, hitPercent: -6 } }),
    ),
  },
  {
    // MAG 10, PER 10, PSI 10 (Omega): the old puppeteer of the Figli dell'Ultima; his threads of light move people like puppets, and when one falls the next comes on with more threads.
    code: "P132",
    name: "Wirepuller",
    faction: "villains",
    kit: kit(
      "P132",
      { name: "Fili di luce", scaling: { PSI: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }] },
      { name: "Il copione", scaling: { PSI: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "Recitate benissimo", scaling: { PSI: 0.6, PER: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.7, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "PSI" } }] },
      passive({ name: "Il prossimo entra con più fili", trigger: "ally_down", limit: 1, effects: [{ kind: "status", status: "empower", turns: 1, to: "allies" }] }),
    ),
  },
  {
    // MAG 10, VOL 10, INT 9 (Omega): a front of bas-reliefs advancing in the tunnels and translating matter into another grammar; a wall still stands, for another reason.
    code: "P216",
    name: "Prosody",
    faction: "neutrals",
    kit: kit(
      "P216",
      { name: "Bassorilievo", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Un'altra grammatica", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "MAG" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Noi le coniughiamo", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "MAG" } }] },
      passive({ name: "Dove la roccia si interrompe", modifiers: { effectChancePercent: 8, hitPercent: 6 } }),
    ),
  },
  {
    // COM 10, ENE 10, FUR 10 (Omega): the toothed whirlpool the Ora Zero opened in the port; swallows ships, containers and lawsuits, and never gives anything back.
    code: "P092",
    name: "Cariddi",
    faction: "neutrals",
    kit: kit(
      "P092",
      { name: "Denti", scaling: { COM: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Ingoia", scaling: { ENE: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "ENE" } }] },
      { name: "Non ha mai restituito niente", scaling: { ENE: 0.6, FUR: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "ENE" } }] },
      passive({ name: "Navi, container e denunce", trigger: "knockout", scaling: { COM: 1 }, effects: [{ kind: "heal", multiplier: 0.35, to: "self" }] }),
    ),
  },
  {
    // ENE 10, FOR 10, RES 10, VEL 9 (Omega): a five-tonne beast with a ceramic wedge tied between its jaws; near it every pact loosens, except its own.
    code: "P186",
    name: "Mordacchia",
    faction: "villains",
    kit: kit(
      "P186",
      { name: "Fauci", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Ogni patto si allenta", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "FOR" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }] },
      { name: "Tiro per contare", scaling: { FOR: 0.6, VEL: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.8, on: "primary" }, { kind: "damage", multiplier: 0.6, on: "adjacent" }] },
      passive({ name: "Tutti tranne il suo", modifiers: { damageVsStatus: { status: "fortify", percent: 30 }, speedPercent: 4, damagePercent: 6 } }),
    ),
  },
];
