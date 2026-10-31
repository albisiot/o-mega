export type ThreatEnvironment = "city" | "port";
export type ThreatActor = "robot" | "golem" | "car";
export type ThreatScene = { environment: ThreatEnvironment; actor?: ThreatActor };

// The match state exposes the threat's name, not its code. Threats without an
// environment yet keep the plain panel.
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
  "Rissa al porto": { environment: "port" },
  "Contrabbando al porto": { environment: "port" },
};

export function threatScene(name: string): ThreatScene | null {
  return SCENES[name] ?? null;
}

export function sceneThreatNames(): string[] {
  return Object.keys(SCENES);
}
