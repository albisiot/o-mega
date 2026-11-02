import type { ThreatModifier } from "@o-mega/game-engine";
import { FACTION_LABELS } from "@/lib/catalog";

export function modifierLine(modifier: ThreatModifier, firstAbility: string): string {
  const { name, text } = describeThreatModifier(modifier, firstAbility);
  return `${name}: ${text}`;
}

/** A modifier as the player reads it. */
export function describeThreatModifier(modifier: ThreatModifier, firstAbility: string): { name: string; text: string } {
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
  }
}
