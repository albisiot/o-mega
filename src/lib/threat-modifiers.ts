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
      return modifier.count === 1
        ? { name: "Duello", text: "Conta solo l'abilità più alta tra quelle richieste." }
        : { name: "Duello", text: `Contano solo le ${modifier.count} abilità più alte tra quelle richieste.` };
    // The rare threats (SPEC §5.15).
    case "mirror":
      return { name: "Specchio", text: "Ognuno segna con i valori del personaggio avversario." };
    case "reverse":
      return { name: "Rovescio", text: "Vince il punteggio più basso; a parità, il valore più alto più basso." };
    case "all_or_nothing":
      return { name: "Tutto o niente", text: `Le abilità sotto ${modifier.min} contano 0.` };
    case "last_first":
      return { name: "Ultimi i primi", text: `+${modifier.bonus} per ogni grado di rarità sotto Omega.` };
    case "price":
      return {
        name: "Il prezzo",
        text: `Le abilità a ${modifier.maxValue} o meno valgono -${modifier.malus}.`,
      };
    case "one_force": {
      const names = modifier.abilities.map(nameOf);
      return { name: "Una sola forza", text: `Tra ${listNames(names)} conta solo la più alta, tante volte quante sono richieste.` };
    }
    case "blind":
      return { name: "Al buio", text: "Le abilità si scoprono solo dopo che entrambi avete scelto." };
    case "echo":
      return modifier.abilities.length > 0
        ? { name: "Eco", text: `Richiede anche ${listNames(modifier.abilities.map(nameOf))}, dalla Minaccia del round prima.` }
        : { name: "Eco", text: "Richiede anche le abilità della Minaccia del round prima." };
    case "count":
      return {
        name: "Il conteggio",
        text: `${modifier.points} ${modifier.points === 1 ? "punto" : "punti"} per ogni abilità almeno a ${modifier.min}, qualunque sia il valore.`,
      };
    case "unknown_level":
      return { name: "Livello ignoto", text: "Le abilità sono estratte a caso: quante sono si scopre solo in questo round." };
    case "negative":
      return { name: "Negativo", text: `Ogni abilità vale ${modifier.max} meno il suo valore.` };
  }
  // A rule added on the server after this version of the app: shown, never a crash.
  return { name: "Regola speciale", text: "Questa Minaccia ha una regola nuova: aggiorna l'app per leggerla." };
}
