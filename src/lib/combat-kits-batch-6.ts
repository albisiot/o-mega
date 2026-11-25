// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 5, sixth batch: the kits of the next 25
// characters of the packs that players own most without a kit (13 Gamma, 11 Beta, 1 Alfa), written
// from their card (abilities, Poteri, colour text). Each was simulated on its own card
// (scripts/simulate-combat.mts --report kits --batch 6). From here they go to the database
// (combat_kits) with a migration; the database is then the reference and the EDITOR changes them.
// Imports with their extension, so the simulator can load this file with Node.
import { buildCombatKit as kit, combatPassive as passive } from "./combat-pilot.ts";
import type { CombatKitEntry } from "./combat-kits-batch-1.ts";

export const COMBAT_KITS_BATCH_6: CombatKitEntry[] = [
  {
    // INT 10, PER 9, TEC 8 (Gamma): merchant from the tear with a vault in his chest; buys only unique pieces, and what goes in never comes out.
    code: "P203",
    name: "Monopsony",
    faction: "villains",
    kit: kit(
      "P203",
      { name: "Pezzo unico", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Nel caveau", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "INT" } }] },
      { name: "Impossibile riaverlo", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary" }] },
      passive({ name: "Non esce più", trigger: "knockout", scaling: { INT: 1 }, effects: [{ kind: "shield", multiplier: 0.3, to: "self" }, { kind: "charge", amount: 1, to: "self" }] }),
    ),
  },
  {
    // MAG 10, VOL 10, INT 9 (Gamma): prophet of the Figli dell'Ultima; when the tear's zones change rules, what he says comes true. Five words at most.
    code: "P161",
    name: "Miliarium",
    faction: "villains",
    kit: kit(
      "P161",
      { name: "Cinque parole", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Aspetto la virgola", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }] },
      { name: "Diventa vero", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "MAG" } }] },
      passive({ name: "La finestra dura pochi secondi", modifiers: { critPercent: 10 } }),
    ),
  },
  {
    // VEL 10, ENE 9, FUR 8 (Gamma): night-shift docker; after two his time slips and six hours of work become eleven minutes on the port's clocks.
    code: "P168",
    name: "Hireling",
    faction: "neutrals",
    kit: kit(
      "P168",
      { name: "Turno di notte", scaling: { VEL: 0.6, ENE: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Sei ore in undici minuti", scaling: { VEL: 1 }, target: "self", effects: [{ kind: "status", status: "haste", turns: 2, on: "primary" }, { kind: "status", status: "empower", turns: 1, on: "primary" }] },
      { name: "In nessun registro", scaling: { VEL: 0.6, FUR: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }] },
      passive({ name: "Dopo le due e dieci", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "haste", turns: 2, to: "self" }] }),
    ),
  },
  {
    // PER 10, VOL 10, MAG 9 (Beta): shelters wounded anomals, whatever they did; her cutting grows into a pergola where nobody can do harm.
    code: "P173",
    name: "Sanctuary",
    faction: "heroes",
    kit: kit(
      "P173",
      { name: "Rametto", scaling: { PER: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La talea", scaling: { MAG: 0.6, VOL: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.85, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Il pergolato", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "heal", multiplier: 0.4, on: "all" }, { kind: "status", status: "fortify", turns: 2, on: "all" }] },
      passive({ name: "Per tre giorni conta il pergolato", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 30, ability: "MAG" } }] }),
    ),
  },
  {
    // INT 10, TEC 10, PER 9 (Gamma): a news-stand that keeps the memories customers deposit; lately it keeps the little-used ones, and they never come back.
    code: "P202",
    name: "Custodia",
    faction: "villains",
    kit: kit(
      "P202",
      { name: "Sportello", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Indice 0,63", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Non restituibile", scaling: { INT: 0.6, TEC: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.2, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary" }] },
      passive({ name: "Nove minuti allo sportello", modifiers: { hitPercent: 6, effectChancePercent: 8 } }),
    ),
  },
  {
    // COM 8, VEL 8, ENE 7 (Beta): no Segno; courier on a tuned electric bike, delivers anything anywhere in ten minutes and asks nothing.
    code: "P042",
    name: "Postmark",
    faction: "neutrals",
    kit: kit(
      "P042",
      { name: "Consegna", scaling: { COM: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Non fa domande", scaling: { COM: 0.6, ENE: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 40, ability: "COM" } }, { kind: "damage", multiplier: 0.45, on: "adjacent" }] },
      { name: "In ogni angolo della città", scaling: { VEL: 0.6, COM: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }] },
      passive({ name: "Dieci minuti", modifiers: { speedPercent: 8, damagePercent: 6 } }),
    ),
  },
  {
    // FOR 8, RES 8, COM 7 (Beta): a diver with steel tentacles, the terror of the port; out of the water he is very slow and asks for help on stairs.
    code: "P077",
    name: "Dredge",
    faction: "villains",
    kit: kit(
      "P077",
      { name: "Tentacolo", scaling: { FOR: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.25, on: "primary" }] },
      { name: "Il terrore del porto", scaling: { FOR: 0.6, ENE: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "FOR" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Dal fondo", scaling: { FOR: 0.6, RES: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1.05, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "FOR" } }] },
      passive({ name: "Per le scale chiede aiuto", modifiers: { speedPercent: -4, damagePercent: 14 } }),
    ),
  },
  {
    // FOR 10, RES 10, VOL 9 (Beta): a Lanterne nun who pilots a giant robot of scaffolding and bells; prays before crushing, confesses after.
    code: "P101",
    name: "Carillon",
    faction: "heroes",
    kit: kit(
      "P101",
      { name: "Campane", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Prega prima", scaling: { RES: 0.6, VOL: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.8, on: "primary" }, { kind: "status", status: "empower", turns: 2, on: "primary" }] },
      { name: "Schiacciare", scaling: { FOR: 0.6, TEC: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 2, on: "primary" }, { kind: "damage", multiplier: 0.7, on: "adjacent" }] },
      passive({ name: "Dopo, confessa", trigger: "knockout", scaling: { VOL: 1 }, effects: [{ kind: "heal", multiplier: 0.4, to: "self" }] }),
    ),
  },
  {
    // FOR 10, RES 10, VOL 10 (Beta): the city's oldest living column; takes on the weight of what it touches and holds a collapse for hours.
    code: "P112",
    name: "Plinth",
    faction: "heroes",
    kit: kit(
      "P112",
      { name: "Colonna", scaling: { FOR: 0.6, RES: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Tengo, voi andate", scaling: { RES: 1 }, target: "self", effects: [{ kind: "shield", multiplier: 0.7, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }] },
      { name: "Regge il crollo", scaling: { RES: 0.6, VOL: 0.4 }, target: "all_allies", effects: [{ kind: "shield", multiplier: 0.3, on: "all" }, { kind: "status", status: "fortify", turns: 1, on: "all" }] },
      passive({ name: "Finché i soccorsi non hanno finito", trigger: "low_vita", thresholdPercent: 50, limit: 1, scaling: { RES: 1 }, effects: [{ kind: "shield", multiplier: 0.6, to: "self" }] }),
    ),
  },
  {
    // VOL 9, PSI 7, COM 6 (Beta): carries out the Lete's decrees; once read, nobody says the condemned's name, and with it goes what he could do.
    code: "P116",
    name: "Attainder",
    faction: "villains",
    kit: kit(
      "P116",
      { name: "Il decreto", scaling: { VOL: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.35, on: "primary" }] },
      { name: "Letto il decreto", scaling: { VOL: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }, { kind: "status", status: "weaken", turns: 3, on: "primary", chance: { base: 60, ability: "VOL" } }] },
      { name: "Nemmeno tu", scaling: { VOL: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 55, ability: "VOL" } }] },
      passive({ name: "Il nome che nessuno pronuncia", modifiers: { damageVsStatus: { status: "weaken", percent: 30 }, damagePercent: 8 } }),
    ),
  },
  {
    // VEL 10, RES 9, FUR 8 (Gamma): her skin gives off a smell colossi chase for miles; she is paid to lead them away. Running for hours is easy, stopping is not.
    code: "P118",
    name: "Lure",
    faction: "neutrals",
    kit: kit(
      "P118",
      { name: "Corsa", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Si fa inseguire", scaling: { RES: 0.6, VEL: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.5, on: "primary" }, { kind: "status", status: "taunt", turns: 2, on: "primary" }, { kind: "status", status: "haste", turns: 1, on: "primary" }] },
      { name: "Il difficile è smettere", scaling: { VEL: 0.6, FUR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }] },
      passive({ name: "Corre per ore", modifiers: { speedPercent: 6, hitPercent: 3 } }),
    ),
  },
  {
    // PER 10, FUR 8, INT 8, RES 0 (Gamma): a painted porcelain automaton serving coffee at Lete meetings; hears a whisper across the room. One knock cracks her.
    code: "P128",
    name: "Bisque",
    faction: "villains",
    kit: kit(
      "P128",
      { name: "Tazzina", scaling: { PER: 0.6, FUR: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Zucchero?", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "PER" } }] },
      { name: "Riferisce tutto", scaling: { PER: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "PER" } }] },
      passive({ name: "Sente dall'altra parte della sala", modifiers: { hitPercent: 8, critPercent: 4 } }),
    ),
  },
  {
    // INT 10, PER 9, MAG 8 (Gamma): insures against curses for the Lete; misfortune leaves the client and is shared among everyone insured.
    code: "P136",
    name: "Indemnity",
    faction: "villains",
    kit: kit(
      "P136",
      { name: "Polizza", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "La clausola", scaling: { INT: 0.6, MAG: 0.4 }, target: "ally", effects: [{ kind: "shield", multiplier: 0.75, on: "primary" }, { kind: "status", status: "fortify", turns: 1, on: "primary" }] },
      { name: "Si distribuisce", scaling: { MAG: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "MAG" } }] },
      passive({ name: "Niente si distrugge", trigger: "hurt", limit: 2, scaling: { INT: 1 }, effects: [{ kind: "damage", multiplier: 0.1, to: "enemies" }] }),
    ),
  },
  {
    // PER 10, INT 9, RES 8 (Gamma): restorer of ancient spells; rebuilds the resins and pollens of a rite and it works as on the first day, cruel ones too.
    code: "P163",
    name: "Refector",
    faction: "heroes",
    kit: kit(
      "P163",
      { name: "Resine", scaling: { PER: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Come il primo giorno", scaling: { INT: 0.6, PER: 0.4 }, target: "ally", effects: [{ kind: "heal", multiplier: 0.9, on: "primary" }] },
      { name: "Se era crudele, torna crudele", scaling: { PER: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.95, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "PER" } }] },
      passive({ name: "Restaura, non corregge", modifiers: { healPercent: 8, critPercent: 4 } }),
    ),
  },
  {
    // VEL 8, COM 6, TEC 6, RES 2 (Gamma): no Segno; head of a biker gang, tuned his bike until it stopped braking. Always first, bad at taking hits.
    code: "P026",
    name: "Rubicon",
    faction: "villains",
    kit: kit(
      "P026",
      { name: "Moto truccata", scaling: { VEL: 0.6, COM: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "Senza freni", scaling: { VEL: 0.6, TEC: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 45, ability: "VEL" } }] },
      { name: "Arriva sempre per primo", scaling: { VEL: 0.6, COM: 0.4 }, range: "melee", target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }, { kind: "damage", multiplier: 0.5, on: "adjacent" }] },
      passive({ name: "I freni li ha venduti", modifiers: { speedPercent: 12, damagePercent: 4 } }),
    ),
  },
  {
    // INT 8, TEC 8, PER 7 (Beta): the Banco's analyst; every evening finds lines in his own hand he does not remember writing, the sums nobody has done yet, always right.
    code: "P047",
    name: "Actuary",
    faction: "neutrals",
    kit: kit(
      "P047",
      { name: "Voce di bilancio", scaling: { INT: 0.6, TEC: 0.4 }, effects: [{ kind: "damage", multiplier: 1.3, on: "primary" }] },
      { name: "I conti esatti", scaling: { INT: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }, { kind: "status", status: "vulnerable", turns: 2, on: "primary", chance: { base: 55, ability: "INT" } }] },
      { name: "Nessun segreto", scaling: { INT: 0.6, TEC: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 45, ability: "INT" } }] },
      passive({ name: "Righe che non ricorda", modifiers: { critPercent: 10, hitPercent: 6, damagePercent: 8 } }),
    ),
  },
  {
    // MAG 10, PSI 10, VOL 8 (Beta): a nearly blind street wizard who reads the dig's carved stones without seeing them; the spells see for him.
    code: "P048",
    name: "Hapax",
    faction: "heroes",
    kit: kit(
      "P048",
      { name: "Incantesimo di strada", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Le pietre incise", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }] },
      { name: "Vedono per lui", scaling: { MAG: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 1, on: "all" }, { kind: "status", status: "vulnerable", turns: 1, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Cieco come una talpa", modifiers: { hitPercent: 10, effectChancePercent: 4 } }),
    ),
  },
  {
    // TEC 10, PSI 8, INT 7 (Gamma): Lete executive running a network of mirrors that sends orders straight into the eyes; whoever looks thinks it was his idea.
    code: "P108",
    name: "Semaphore",
    faction: "villains",
    kit: kit(
      "P108",
      { name: "Riflesso", scaling: { TEC: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Lo ha pensato lei", scaling: { TEC: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 0.8, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "TEC" } }] },
      { name: "Rete di specchi", scaling: { TEC: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.75, on: "all" }, { kind: "status", status: "weaken", turns: 2, on: "all", chance: { base: 50, ability: "PSI" } }] },
      passive({ name: "Crede che l'idea sia sua", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "stun", turns: 1, to: "other", chance: { base: 15, ability: "TEC" } }] }),
    ),
  },
  {
    // INT 10, ENE 9, PER 8 (Gamma): an old supervillain from the tear with a climate engine in his chest; kept a city dark for eleven months in 1951. Now does the weather on TV.
    code: "P158",
    name: "Contumax",
    faction: "villains",
    kit: kit(
      "P158",
      { name: "Motore climatico", scaling: { ENE: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Pioggia per duecento metri", scaling: { ENE: 0.6, INT: 0.4 }, target: "enemy_and_adjacent", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary", chance: { base: 50, ability: "ENE" } }, { kind: "damage", multiplier: 0.4, on: "adjacent" }] },
      { name: "Undici mesi al buio", scaling: { ENE: 0.6, INT: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "stun", turns: 1, on: "all", chance: { base: 10, ability: "ENE" } }] },
      passive({ name: "Il motore perde", trigger: "turn_start", limit: 2, scaling: { ENE: 1 }, effects: [{ kind: "damage", multiplier: 0.06, to: "enemies" }] }),
    ),
  },
  {
    // MAG 10, VOL 10, RES 9 (Beta): lives in the metro tunnels closed in 1999, corridors that stretch and stairs that lead back to the same floor. Cannot go out.
    code: "P177",
    name: "Holloway",
    faction: "neutrals",
    kit: kit(
      "P177",
      { name: "Corridoio che si allunga", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Scale che riportano qui", scaling: { MAG: 0.6, VOL: 0.4 }, effects: [{ kind: "damage", multiplier: 0.85, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 45, ability: "MAG" } }] },
      { name: "Prossima fermata", scaling: { MAG: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.8, on: "all" }, { kind: "status", status: "weaken", turns: 1, on: "all", chance: { base: 45, ability: "MAG" } }] },
      passive({ name: "Banchine che spariscono", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "weaken", turns: 1, to: "other", chance: { base: 40, ability: "MAG" } }] }),
    ),
  },
  {
    // INT 10, MAG 10, PER 9 (Alfa): sacred surveyor of the Figli dell'Ultima; with a groma of wood and lead she brings back the oldest land register and its distances.
    code: "P180",
    name: "Groma",
    faction: "villains",
    kit: kit(
      "P180",
      { name: "Groma di legno", scaling: { INT: 0.6, MAG: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Dove dice il catasto", scaling: { MAG: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "stun", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Il catasto più antico", scaling: { INT: 0.6, MAG: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "vulnerable", turns: 2, on: "all", chance: { base: 45, ability: "INT" } }] },
      passive({ name: "Il cippo mai spostato", trigger: "battle_start", limit: 1, effects: [{ kind: "status", status: "weaken", turns: 1, to: "enemies", chance: { base: 25, ability: "MAG" } }] }),
    ),
  },
  {
    // FUR 10, FOR 9, RES 8 (Gamma): heir of a hero family; wearing the family relics she gets the powers of those who wore them, and a piece of who they were.
    code: "P200",
    name: "Scion",
    faction: "heroes",
    kit: kit(
      "P200",
      { name: "Il guanto", scaling: { FUR: 0.6, FOR: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.2, on: "primary" }] },
      { name: "Il pettorale", scaling: { RES: 0.6, FOR: 0.4 }, target: "self", effects: [{ kind: "shield", multiplier: 0.6, on: "primary" }, { kind: "status", status: "fortify", turns: 2, on: "primary" }] },
      { name: "Il diadema", scaling: { FUR: 0.6, INT: 0.4 }, effects: [{ kind: "damage", multiplier: 2.05, on: "primary" }, { kind: "status", status: "weaken", turns: 1, on: "primary" }] },
      passive({ name: "Il guanto sa fare meglio", trigger: "hit", limit: 3, effects: [{ kind: "status", status: "empower", turns: 1, to: "self" }] }),
    ),
  },
  {
    // VOL 10, PSI 9, INT 8 (Gamma): last inmate of the Lete prison where everyone else had their anger removed; gives back grudge and the will to strike back.
    code: "P219",
    name: "Reus",
    faction: "villains",
    kit: kit(
      "P219",
      { name: "Rancore", scaling: { VOL: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Rendere il colpo", scaling: { VOL: 1 }, target: "all_allies", effects: [{ kind: "status", status: "empower", turns: 1, on: "all" }] },
      { name: "Una cicatrice", scaling: { PSI: 0.6, VOL: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "burn", turns: 1, on: "all", chance: { base: 40, ability: "PSI" } }] },
      passive({ name: "Mi portano i loro figli", trigger: "hurt", limit: 2, scaling: { VOL: 1 }, effects: [{ kind: "damage", multiplier: 0.3, to: "other" }] }),
    ),
  },
  {
    // FUR 10, VEL 10, PER 8, RES 1 (Beta): the fastest thief in Nuova Megara; takes your watch and tells you the time before you notice. One real blow floors her.
    code: "P046",
    name: "Larceny",
    faction: "villains",
    kit: kit(
      "P046",
      { name: "Mano lesta", scaling: { FUR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 1.1, on: "primary" }] },
      { name: "Ti sfila l'orologio", scaling: { FUR: 0.6, VEL: 0.4 }, range: "melee", effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "FUR" } }] },
      { name: "Che ora è", scaling: { FUR: 0.6, VEL: 0.4 }, range: "infiltration", effects: [{ kind: "damage", multiplier: 1.9, on: "primary" }] },
      passive({ name: "Prima che te ne accorga", modifiers: { critPercent: 4, speedPercent: 4 } }),
    ),
  },
  {
    // MAG 10, PER 9, PSI 9 (Beta): heresiarch of the Figli dell'Ultima; says a formula backwards and turns it on whoever spoke it. A blessing becomes a sentence.
    code: "P111",
    name: "Antiphon",
    faction: "villains",
    kit: kit(
      "P111",
      { name: "Formula", scaling: { MAG: 0.6, PSI: 0.4 }, effects: [{ kind: "damage", multiplier: 1.15, on: "primary" }] },
      { name: "Diventa una condanna", scaling: { MAG: 0.6, PER: 0.4 }, effects: [{ kind: "damage", multiplier: 0.9, on: "primary" }, { kind: "status", status: "weaken", turns: 2, on: "primary", chance: { base: 50, ability: "MAG" } }, { kind: "status", status: "vulnerable", turns: 1, on: "primary", chance: { base: 40, ability: "MAG" } }] },
      { name: "Ho tutto il tempo", scaling: { MAG: 0.6, PSI: 0.4 }, target: "all_enemies", effects: [{ kind: "damage", multiplier: 0.9, on: "all" }, { kind: "status", status: "burn", turns: 2, on: "all", chance: { base: 40, ability: "MAG" } }] },
      passive({ name: "Al contrario", trigger: "hurt", limit: 3, effects: [{ kind: "status", status: "vulnerable", turns: 1, to: "other", chance: { base: 45, ability: "MAG" } }] }),
    ),
  },
];
