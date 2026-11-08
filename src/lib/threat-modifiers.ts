import type { ThreatModifier } from "@o-mega/game-engine";
import { FACTION_LABELS } from "@/lib/catalog";

/** "Energia, Magia e Psiche". */
function listNames(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

export function modifierLine(modifier: ThreatModifier, firstAbility: string, nameOf?: (code: string) => string): string {
  const { name, text } = describeThreatModifier(modifier, firstAbility, nameOf);
  return `${name}: ${text}`;
}

/**
 * A modifier as the player reads it. `nameOf` turns an ability code into its name
 * (Abissi lists the abilities it doubles); without it the codes are shown.
 */
export function describeThreatModifier(
  modifier: ThreatModifier,
  firstAbility: string,
  nameOf: (code: string) => string = (code) => code,
): { name: string; text: string } {
  switch (modifier.code) {
    case "focus":
      return { name: "Colpo mirato", text: `${firstAbility} conta doppio.` };
    case "weak_link":
      return { name: "Anello debole", text: "Il valore più basso tra le abilità richieste conta doppio." };
    case "hostile_ground":
      return {
        name: "Territorio ostile",
        text: `${FACTION_LABELS[modifier.favored] ?? modifier.favored} +${modifier.bonus}, ${
          FACTION_LABELS[modifier.hindered] ?? modifier.hindered
        } -${modifier.malus}.`,
      };
    case "underdogs":
      return { name: "Sottovalutati", text: `Delta +${modifier.bonus}, Alfa e Omega -${modifier.malus}.` };
    case "tomb_silence":
      return { name: "Silenzio della tomba", text: "In questo round nessun potere funziona." };
    case "long_count":
      return { name: "Il conto lungo", text: `+${modifier.bonus} a chi finora ha vinto meno round.` };
    case "abyss": {
      const names = modifier.abilities.map(nameOf);
      return { name: "Abissi", text: `${listNames(names)} ${names.length === 1 ? "conta" : "contano"} doppio.` };
    }
    case "frost":
      return { name: "Gelo", text: `Nessuna abilità conta più di ${modifier.cap}.` };
    case "duel":
      return { name: "Duello", text: `Contano solo le ${modifier.count} abilità più alte tra quelle richieste.` };
  }
  // A rule added on the server after this version of the app: shown, never a crash.
  return { name: "Regola speciale", text: "Questa Minaccia ha una regola nuova: aggiorna l'app per leggerla." };
}
