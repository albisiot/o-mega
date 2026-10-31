// Player-facing story of the game world, condensed from docs/WORLD.md.
export const WORLD_INTRO = [
  {
    title: "Nuova Megara",
    text: "Una megalopoli sul mare, tra gru, container e templi greci. Sotto il porto, qualcuno ha scavato troppo.",
    image: "/world/citta.webp",
  },
  {
    title: "L'Ora Zero",
    text: "Un tempio sepolto e una centrale sperimentale: quando i due cantieri si sono toccati, tutto è cambiato. Da allora alcune persone portano un Segno. La città ha i suoi superumani, e le emergenze che causano.",
    image: "/world/ora-zero.webp",
  },
  {
    title: "Tu sei un Reggente",
    text: "Ogni carta è un'Eco: l'impronta di un superumano su una lastra. A mezzanotte suona il Rintocco e arrivano nuovi Echi. Usali nelle emergenze. Chi vince può prendere una lastra al rivale.",
    image: "/world/reggente.webp",
  },
];

export const WORLD_LOADING_LINES = [
  "Sismografo in ascolto…",
  "Il Banco conta le lastre…",
  "Le Lanterne accendono il quartiere…",
  "I Custodi chiudono il porto…",
];

export const WORLD_FACTIONS = [
  {
    name: "Eroi",
    groups: [
      { name: "I Custodi", text: "Guardia civica, onesta e senza fondi." },
      { name: "Le Lanterne", text: "Volontari dei quartieri poveri, senza divisa né permessi." },
    ],
  },
  {
    name: "Cattivi",
    groups: [
      { name: "La Compagnia Lete", text: "Ha privatizzato l'energia dell'Ora Zero e vende la soluzione ai problemi che crea." },
      { name: "I Figli dell'Ultima", text: "Vogliono completare l'alfabeto, cioè arrivare alla fine." },
    ],
  },
  {
    name: "Neutrali",
    groups: [
      { name: "Il Banco", text: "Gestisce licenze, sfide e Diritto di Presa. Vince sempre." },
      { name: "Gli Sciolti", text: "Contrabbandieri, mercenari e chiunque abbia smesso di scegliere." },
    ],
  },
];
