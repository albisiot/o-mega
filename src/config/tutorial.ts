// Player-facing tutorial: the rules of SPEC §4-§8 in plain words, with examples
// taken from the real catalog. Numbers come from balance.ts; nothing here decides
// a result, the server stays the authority.
import { baseScore, type Threat } from "@o-mega/game-engine";
import type { CardData } from "@/components/card-view";
import { balance } from "@/config/balance";
import type { AbilityInfo } from "@/lib/catalog";

const { conquest, match, matchmaking, packs, progression } = balance;

export const TUTORIAL_RARITIES = [
  { name: "Delta", rank: 1, color: "#c9c4b6" },
  { name: "Gamma", rank: 2, color: "#2fd06e" },
  { name: "Beta", rank: 3, color: "#1f8bff" },
  { name: "Alfa", rank: 4, color: "#b45cff" },
  { name: "Omega", rank: 5, color: "#ffd60a" },
];

const [DELTA, GAMMA] = TUTORIAL_RARITIES;

const FAMILIES = [
  { code: "body", name: "Corpo", color: "#ff6a5e", sort_order: 1, abilities: [["FOR", "Forza"], ["VEL", "Velocità"], ["RES", "Resistenza"]] },
  { code: "mind", name: "Mente", color: "#4db8ff", sort_order: 2, abilities: [["INT", "Intelletto"], ["VOL", "Volontà"], ["PER", "Percezione"]] },
  { code: "power", name: "Potere", color: "#c58bff", sort_order: 3, abilities: [["ENE", "Energia"], ["MAG", "Magia"], ["PSI", "Psiche"]] },
  { code: "craft", name: "Mestiere", color: "#ffb800", sort_order: 4, abilities: [["COM", "Combattimento"], ["TEC", "Tecnologia"], ["FUR", "Furtività"]] },
];

export const TUTORIAL_ABILITIES: AbilityInfo[] = FAMILIES.flatMap(({ abilities, ...family }) =>
  abilities.map(([code, name]) => ({ code, name, family })),
);

export const TUTORIAL_FAMILIES = FAMILIES;

function deltaHero(name: string, art: string, stats: Record<string, number>): CardData {
  return { name, faction: "heroes", flavor: "", stats, rarity: DELTA, power: null, art_url: `/cards/${art}.webp` };
}

export const MAX_CARGO = deltaHero("Max Cargo", "P001", {
  FOR: 10, VEL: 5, RES: 9, INT: 2, VOL: 6, PER: 3, ENE: 4, MAG: 0, PSI: 1, COM: 9, TEC: 3, FUR: 2,
});
export const TONY_RONDA = deltaHero("Tony Ronda", "P009", {
  FOR: 6, VEL: 4, RES: 5, INT: 5, VOL: 6, PER: 5, ENE: 4, MAG: 4, PSI: 3, COM: 5, TEC: 4, FUR: 3,
});
const NONNA_HEX: CardData = {
  ...deltaHero("Nonna Hex", "P004", {
    FOR: 0, VEL: 2, RES: 3, INT: 5, VOL: 9, PER: 4, ENE: 6, MAG: 10, PSI: 9, COM: 2, TEC: 1, FUR: 3,
  }),
  faction: "neutrals",
};
const LUCY_LUMEN = deltaHero("Lucy Lumen", "P012", {
  FOR: 4, VEL: 5, RES: 5, INT: 4, VOL: 5, PER: 6, ENE: 5, MAG: 3, PSI: 3, COM: 6, TEC: 4, FUR: 4,
});

export const SAMPLE_CARD: CardData = {
  name: "Marta Scudo",
  faction: "heroes",
  flavor: "",
  stats: { FOR: 3, VEL: 4, RES: 9, INT: 2, VOL: 7, PER: 3, ENE: 2, MAG: 4, PSI: 6, COM: 8, TEC: 5, FUR: 1 },
  rarity: GAMMA,
  power: { name: "Ultimo baluardo", text: "+3 se giocato nel round 4 o 5" },
  art_url: "/cards/P025.webp",
};

export function scoreOn(card: CardData, threat: Threat): number {
  return baseScore({ id: card.name, definitionId: card.name, faction: card.faction, stats: card.stats, power: null }, threat);
}

/** A low threat rewards the specialist, a high one the generalist. */
export const THREAT_EXAMPLES: (Threat & { name: string })[] = [
  { id: "T102", name: "Muro pericolante", level: 1, abilities: ["FOR"] },
  { id: "T601", name: "Invasione dimensionale", level: 6, abilities: ["MAG", "ENE", "PSI", "FOR", "VOL", "PER"] },
];

export const SAMPLE_LEVELS = [2, 5, 1, 3, 6];

export const PRACTICE = {
  threat: { id: "T201", name: "Robot impazzito", level: 2, abilities: ["FOR", "TEC"] } as Threat & { name: string },
  opponent: LUCY_LUMEN,
  team: [
    {
      card: MAX_CARGO,
      feedback: "Vinto, ma Max Cargo non tornerà più in questa partita: era sprecato, bastava molto meno.",
    },
    {
      card: TONY_RONDA,
      feedback: "La mossa migliore: hai vinto il round spendendo il minimo e Max Cargo resta per una Minaccia più adatta.",
    },
    {
      card: NONNA_HEX,
      feedback: "Nonna Hex è fortissima in Magia e Psiche, ma qui non servono. E ogni personaggio si usa una volta sola: l'hai bruciata per niente.",
    },
  ],
};

export const TUTORIAL_POWERS = [
  { name: "Specialità", text: "+2 contro le Minacce che richiedono una certa abilità." },
  { name: "Ultimo baluardo", text: "+3 se giocato nel round 4 o 5." },
  { name: "Riscossa", text: "Se perde il round, il personaggio successivo prende un bonus." },
  { name: "Sabotatore", text: "Toglie 1 a ogni abilità del personaggio avversario nel round." },
  { name: "Veggente", text: "Dopo averlo giocato vedi tutte le Minacce dei round successivi." },
  { name: "Implacabile", text: "A parità di punteggio vince il round." },
];

export const TUTORIAL_MODES = [
  {
    name: "Contro bot",
    color: "bg-comic-cyan",
    text: `Per allenarti, con quattro difficoltà: Facile, Medio, Difficile e Super Pro. Nessuna carta in gioco e nessuna moneta. Dà esperienza: ${progression.botWinXp} XP se vinci, ${progression.botParticipationXp} se perdi.`,
  },
  {
    name: "Amichevole online",
    color: "bg-comic-yellow",
    text: `Contro il primo giocatore libero, o contro un amico con un codice di 6 caratteri. Nessuna carta in gioco e nessuna moneta. Dà più esperienza: ${progression.pvpWinXp} XP se vinci, ${progression.pvpParticipationXp} se perdi.`,
  },
  {
    name: "Conquista",
    color: "bg-comic-magenta",
    text: `Come l'online, ma con le carte in palio: chi vince ne prende una all'avversario. Si sblocca dopo ${conquest.unlockAfterMatches} partite completate, anche contro i bot, o al livello ${conquest.unlockAtLevel}.`,
  },
];

const firstLevelReward = progression.levelRewardBase + progression.levelRewardPerLevel * 2;

export const TUTORIAL_STEPS = [
  {
    key: "welcome",
    title: "Come si gioca",
    points: [
      "Ti bastano un paio di minuti. Puoi saltare e rivedere tutto quando vuoi da Gioca o dal Profilo.",
    ],
  },
  {
    key: "pack",
    title: "Il pacchetto del giorno",
    points: [
      `Parti con ${conquest.starterSetSize} carte starter. Ogni giorno, poi, hai un pacchetto gratis in Home: ${packs.cardsPerPack} carte, almeno una Gamma o superiore.`,
      "Scade a mezzanotte, ora italiana: se non lo apri, lo perdi.",
      `Con ${packs.standardPackPrice} monete ne compri altri, nel Negozio trovi anche le probabilità.`,
    ],
  },
  {
    key: "card",
    title: "Com'è fatta una carta",
    points: [
      "In alto il nome e la rarità. Sul disegno la fazione: Eroi, Cattivi o Neutrali.",
      "Sotto, se ce l'ha, il Potere. In fondo le 12 abilità, da 0 a 10: sono i numeri che vincono le partite.",
    ],
  },
  {
    key: "abilities",
    title: "Le 12 abilità",
    points: [
      "Sono divise in 4 famiglie. Tutti hanno più o meno lo stesso totale di punti: cambia come sono distribuiti.",
      "Gli specialisti hanno pochi valori altissimi, i generalisti tanti valori medi. Servono entrambi.",
    ],
  },
  {
    key: "rarity",
    title: "Rarità e varianti",
    points: [
      "Più rara non vuol dire più forte: una squadra di Delta ben scelta può battere una squadra di Omega. Le rare hanno profili più estremi e un Potere, le Delta non ne hanno.",
      `Varianti ★: stessa carta con un disegno più raro. Il ${packs.variantChancePercent}% delle volte, sui personaggi che ne hanno una. Valori e Potere non cambiano.`,
      "Doppioni: le copie in più si convertono in monete dalla Collezione. Le starter e le varianti no.",
    ],
  },
  {
    key: "team",
    title: "La tua squadra",
    points: [
      `Prima di ogni partita scegli ${match.teamSize} personaggi tutti diversi. L'avversario non li vede: li scopre uno alla volta, quando li giochi.`,
      "Ogni personaggio si usa una sola volta per partita: cinque personaggi per cinque Minacce.",
      "Le squadre migliori si salvano come formazioni.",
    ],
  },
  {
    key: "threats",
    title: "Le Minacce",
    points: [
      "Ogni partita ha 5 Minacce. All'inizio conosci solo i loro livelli, le abilità richieste si scoprono round per round.",
      "Il livello è il numero di abilità che contano: una al livello 1, sei al livello 6. Gli specialisti brillano in basso, i generalisti in alto.",
    ],
  },
  {
    key: "round",
    title: "Un round",
    points: [
      `1. Appare la Minaccia e hai ${match.roundTimerSeconds} secondi per scegliere chi mandare. Anche l'avversario sceglie, in segreto.`,
      "2. Il punteggio è la somma dei valori del personaggio nelle abilità richieste, più l'eventuale bonus del Potere. Lo vedi già accanto a ogni personaggio.",
      "3. Le scelte si rivelano insieme e vince il punteggio più alto. Se il tempo scade, il server gioca per te un personaggio a caso.",
    ],
  },
  {
    key: "practice",
    title: "Provaci tu",
    points: ["Sono le stesse carte e le stesse regole di una partita vera. Tocca un personaggio per mandarlo contro la Minaccia."],
  },
  {
    key: "win",
    title: "Chi vince",
    points: [
      `Vince la partita chi conquista per primo ${match.roundsToWin} round: spesso bastano pochi minuti.`,
      "Parità in un round: vince chi ha il singolo valore più alto tra le abilità richieste. Se è pari anche quello, il round è nullo.",
      "Se dopo 5 round nessuno è arrivato a 3, vince chi ha più round, poi chi ha più punti totali. Altrimenti è pareggio.",
      `Abbandonare è una sconfitta, senza premi. Se cade la linea hai ${match.reconnectGraceSeconds} secondi per rientrare, e intanto il server gioca per te allo scadere del tempo.`,
    ],
  },
  {
    key: "powers",
    title: "I Poteri",
    points: ["Sono effetti che scattano solo in certe situazioni: il testo è sulla carta. Eccone alcuni."],
  },
  {
    key: "modes",
    title: "Tre modi di giocare",
    points: [],
  },
  {
    key: "conquest",
    title: "La Conquista",
    points: [
      `Chi vince sceglie una delle ${match.teamSize} carte schierate da chi perde e la tiene (${conquest.pickTimerSeconds} secondi, poi la assegna il server). Si rischia solo ciò che porti in campo, mai il resto della collezione.`,
      `Le starter non si possono prendere, ma in squadra servono almeno ${conquest.minConquerableCards} carte non starter.`,
      "Puoi prendere solo carte rare al massimo quanto la più rara della tua squadra: con sole Delta prendi solo Delta. Portare una Omega alza il limite, ma la mette a rischio.",
      `Protezioni: massimo ${conquest.maxCardsLostPerDay} carte perse al giorno, una sfida ogni ${conquest.samePairCooldownHours} ore con lo stesso avversario, e una carta appena conquistata non torna in Conquista per ${conquest.conqueredCardLockHours} ore.`,
      `Se in ${matchmaking.conquestBotAfterSeconds} secondi non si trova nessuno sfidi un bot a caso. Se vinci ricevi una copia di una sua carta, se perdi la carta presa dal bot esce dal gioco.`,
    ],
  },
  {
    key: "coins",
    title: "Monete e livelli",
    points: [
      "Monete: le ottieni convertendo i doppioni e salendo di livello.",
      `In Conquista chi perde riceve ${conquest.loserCoins} monete (in caso di pareggio entrambi). Chi vince ne riceve ${conquest.noCardBonusCoins} se nessuna carta era conquistabile.`,
      `Livelli: ogni partita dà esperienza e ogni nuovo livello regala monete, ${firstLevelReward} al livello 2 e sempre di più dopo. Alcuni personaggi si sbloccano solo salendo di livello.`,
    ],
  },
  {
    key: "done",
    title: "Tocca a te",
    points: [
      "Il modo migliore per imparare è giocare: prova il bot Facile, non rischi nulla.",
      "Non dimenticare il pacchetto del giorno. Questa guida resta in Gioca e nel Profilo.",
    ],
  },
] as const;

export type TutorialStepKey = (typeof TUTORIAL_STEPS)[number]["key"];
