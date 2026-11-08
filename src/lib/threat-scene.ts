export type ThreatEnvironment =
  | "city"
  | "port"
  | "control"
  | "lab"
  | "ritual"
  | "mind"
  | "museum"
  | "sky"
  | "rail"
  | "sewer"
  | "swamp"
  | "prison"
  | "battlefield"
  | "rift"
  // The places beyond Nuova Megara.
  | "desert"
  | "jungle"
  | "sunken"
  | "ice"
  | "japan";
export type ThreatActor =
  | "robot"
  | "golem"
  | "car"
  | "ghost"
  | "shadow"
  | "witch"
  | "monster"
  | "drone"
  | "fortress"
  | "globe"
  | "eclipse"
  | "mirrors"
  | "flames"
  | "virus"
  | "core"
  | "trap"
  | "mummy"
  | "sphinx"
  | "ballgame"
  | "calendar"
  | "serpent"
  | "song"
  | "guardian"
  | "temple"
  | "hut"
  | "base"
  | "beast"
  | "swordsman"
  | "fox"
  | "kaiju";
export type ThreatScene = { environment: ThreatEnvironment; actor?: ThreatActor };

// The match state exposes the threat's name, not its code. A threat missing
// from this map (a future addition, say) keeps the plain panel.
const SCENES: Record<string, ThreatScene> = {
  Scippatore: { environment: "city" },
  "Muro pericolante": { environment: "city" },
  "Sovraccarico elettrico": { environment: "city" },
  "Allarme silenzioso": { environment: "city" },
  "Robot impazzito": { environment: "city", actor: "robot" },
  "Inseguimento sui tetti": { environment: "city" },
  "Ostaggio in banca": { environment: "city" },
  "Fuga di gas": { environment: "city" },
  "Gang dei motociclisti": { environment: "city", actor: "car" },
  "Golem di cemento": { environment: "city", actor: "golem" },
  "Assedio al municipio": { environment: "city" },
  "Colpo al caveau": { environment: "city" },
  "Esercito di androidi": { environment: "city", actor: "robot" },
  "Inseguimento in autostrada": { environment: "city", actor: "car" },
  "Gigante risvegliato": { environment: "city", actor: "golem" },
  "Guerra tra bande": { environment: "city", actor: "car" },
  "Titano di metallo": { environment: "city", actor: "robot" },
  "Collasso della città": { environment: "city" },
  "Caccia nel buio": { environment: "city", actor: "shadow" },
  "Rissa al porto": { environment: "port" },
  "Contrabbando al porto": { environment: "port" },
  "Codice cifrato": { environment: "control" },
  "Terminale bloccato": { environment: "control" },
  "Spia infiltrata": { environment: "control", actor: "shadow" },
  "Infiltrazione nel quartier generale": { environment: "control", actor: "shadow" },
  "Rete di spionaggio": { environment: "control", actor: "globe" },
  "Cospirazione globale": { environment: "control", actor: "globe" },
  "Intelligenza ribelle": { environment: "control", actor: "robot" },
  "Laboratorio in fiamme": { environment: "lab", actor: "flames" },
  "Virus mutante": { environment: "lab", actor: "virus" },
  "Reattore in fusione": { environment: "lab", actor: "core" },
  "Terremoto artificiale": { environment: "lab", actor: "core" },
  "Maledizione minore": { environment: "ritual" },
  "Rituale proibito": { environment: "ritual" },
  "Culto dell'eclissi": { environment: "ritual", actor: "eclipse" },
  "Eclissi eterna": { environment: "ritual", actor: "eclipse" },
  "Signore delle ombre": { environment: "ritual", actor: "shadow" },
  "Risveglio dell'antico": { environment: "ritual", actor: "golem" },
  "Incubo ricorrente": { environment: "mind" },
  Ipnotizzatore: { environment: "mind" },
  "Mente alveare": { environment: "mind" },
  "Epidemia di follia": { environment: "mind" },
  "Labirinto di specchi": { environment: "museum", actor: "mirrors" },
  "Indizio nascosto": { environment: "museum" },
  "Spettro del museo": { environment: "museum", actor: "ghost" },
  "Ladro fantasma": { environment: "museum", actor: "ghost" },
  "Tribunale degli spettri": { environment: "museum", actor: "ghost" },
  "Tempesta elettrica": { environment: "sky" },
  "Drone d'assalto": { environment: "sky", actor: "drone" },
  "Fortezza volante": { environment: "sky", actor: "fortress" },
  "Assalto al cielo": { environment: "sky", actor: "fortress" },
  "Hacker del metrò": { environment: "rail" },
  "Rapina al treno blindato": { environment: "rail" },
  "Mostro delle fogne": { environment: "sewer", actor: "monster" },
  "Strega della palude": { environment: "swamp", actor: "witch" },
  "Rivolta in carcere": { environment: "prison" },
  "Armata del caos": { environment: "battlefield" },
  "Ultima battaglia": { environment: "battlefield" },
  "Portale instabile": { environment: "rift" },
  "Invasione dimensionale": { environment: "rift", actor: "shadow" },
  // Giza
  "Trappola della tomba": { environment: "desert", actor: "trap" },
  "Mummia del cantiere": { environment: "desert", actor: "mummy" },
  "Risveglio della Sfinge": { environment: "desert", actor: "sphinx" },
  // Yucatán
  "Gioco della palla": { environment: "jungle", actor: "ballgame" },
  "Calendario impazzito": { environment: "jungle", actor: "calendar" },
  "Serpente di luce": { environment: "jungle", actor: "serpent" },
  // Atlantide
  "Canto dagli abissi": { environment: "sunken", actor: "song" },
  "Guardiano di oricalco": { environment: "sunken", actor: "guardian" },
  "Atlantide riemerge": { environment: "sunken", actor: "temple" },
  // Artico
  Tormenta: { environment: "ice", actor: "hut" },
  "Base sotto il ghiaccio": { environment: "ice", actor: "base" },
  "Cosa nel ghiaccio": { environment: "ice", actor: "beast" },
  // Giappone
  "Spadaccino del ponte": { environment: "japan", actor: "swordsman" },
  "Volpe a nove code": { environment: "japan", actor: "fox" },
  "Kaiju nella baia": { environment: "japan", actor: "kaiju" },
};

export function threatScene(name: string): ThreatScene | null {
  return SCENES[name] ?? null;
}

export function sceneThreatNames(): string[] {
  return Object.keys(SCENES);
}
