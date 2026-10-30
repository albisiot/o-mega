// Server-side orchestration of a match against a bot. Pure: the Edge
// Function loads the data, calls these functions and stores the result.

import { botView, buildBotTeam, chooseBotPlay, type BotDifficulty, type BotKnowledge } from "./bots.ts";
import { availableCharacters, isFinished, matchResult, resolveRound } from "./match.ts";
import { pickOne, type Rng } from "./rng.ts";
import { drawThreatLevels, pickThreats } from "./threats.ts";
import type { Character, MatchResult, MatchRules, MatchState, RoundRecord, Side, Threat } from "./types.ts";

export type BotMatchCatalog = BotKnowledge & {
  /** Every active character, as the bot may field them (id = definition id). */
  characters: Character[];
};

/** Threats of the match and the bot's team. */
export function planBotMatch(params: {
  rules: MatchRules;
  catalog: BotMatchCatalog;
  difficulty: BotDifficulty;
  rng: Rng;
}): { threats: Threat[]; botTeam: Character[] } {
  const { rules, catalog, difficulty, rng } = params;
  const levels = drawThreatLevels(rng, rules);
  return {
    threats: pickThreats(rng, catalog.threatCatalog, levels),
    botTeam: buildBotTeam(difficulty, catalog.characters, rules.teamSize, rng),
  };
}

/**
 * Plays the current round. The bot decides first, from its own view only;
 * then the player's choice is applied (null = timer expired: a random
 * available character is played for them, SPEC §5.5).
 */
export function playBotRound(params: {
  state: MatchState;
  catalog: BotMatchCatalog;
  difficulty: BotDifficulty;
  playerSide: Side;
  playerChoice: string | null;
  rng: Rng;
}): { state: MatchState; round: RoundRecord; finished: boolean; result: MatchResult | null } {
  const { state, catalog, difficulty, playerSide, playerChoice, rng } = params;
  const botSide: Side = playerSide === "a" ? "b" : "a";

  const botChoice = chooseBotPlay(difficulty, botView(state, botSide, catalog), rng);

  const available = availableCharacters(state, playerSide);
  const playerCharacter =
    playerChoice === null ? pickOne(rng, available).id : available.find((c) => c.id === playerChoice)?.id;
  if (!playerCharacter) throw new Error("character_not_available");

  const resolved = resolveRound(
    state,
    {
      [playerSide]: { characterId: playerCharacter, autoPlayed: playerChoice === null },
      [botSide]: { characterId: botChoice, autoPlayed: false },
    } as Record<Side, { characterId: string; autoPlayed: boolean }>,
    catalog.families,
  );
  return {
    state: resolved.state,
    round: resolved.round,
    finished: isFinished(resolved.state),
    result: matchResult(resolved.state),
  };
}
