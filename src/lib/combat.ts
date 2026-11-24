// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): in design, not playable yet. The numbers
// come from balance.ts `combat` (game_config from stage 4); the engine is in game-engine.
import type { CombatRules } from "@o-mega/game-engine";
import { balance } from "@/config/balance";

/** The numbers of the mode as the engine reads them. */
export function combatRules(): CombatRules {
  return balance.combat;
}
