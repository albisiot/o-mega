// Single source of balance values (SPEC §4-§8). All numbers are provisional.
// The authoritative copy lives in the `game_config` table: server-side logic
// reads it from there, and this file must stay in sync with it.
// Rarity drop weights are not here: they belong to `rarity_definitions`.

export const balance = {
  time: {
    /** Daily reset (free pack, daily limits) happens at midnight in this zone. */
    dailyResetTimeZone: "Europe/Rome",
  },

  cards: {
    abilityMin: 0,
    abilityMax: 10,
    /** Target sum of the 12 abilities for every card, whatever its rarity. */
    abilityBudget: 54,
    abilityBudgetTolerance: 3,
  },

  match: {
    teamSize: 5,
    threatsPerMatch: 5,
    roundsToWin: 3,
    roundTimerSeconds: 30,
    /** Time to show a round result before the next timer starts. */
    revealPauseSeconds: 5,
    /** Network tolerance after a deadline before the server auto-plays. */
    timeoutGraceSeconds: 3,
    reconnectGraceSeconds: 30,
    /** A match this long past its round deadline is considered abandoned. */
    abandonAfterMinutes: 10,
    threatLevels: {
      min: 1,
      max: 6,
      /** At least one threat must be at or below this level. */
      requireOneAtMost: 2,
      /** At least one threat must be at or above this level. */
      requireOneAtLeast: 5,
      minSum: 14,
      maxSum: 20,
    },
  },

  conquest: {
    pickTimerSeconds: 30,
    starterSetSize: 10,
    /** Starter cards are distinct characters of this rarity rank or lower (1 = Delta). */
    starterSetMaxRarityRank: 1,
    /** Non-starter cards required in a Conquest team, so nobody plays risk-free. */
    minConquerableCards: 3,
    /** The only coins matches pay: to the Conquest loser (both players on a draw). */
    loserCoins: 10,
    /** Paid to the winner when none of the loser's cards can be taken. */
    noCardBonusCoins: 50,
    /** Completed matches (abandoned ones do not count). */
    unlockAfterMatches: 5,
    unlockAtLevel: 3,
    maxCardsLostPerDay: 10,
    samePairCooldownHours: 24,
    conqueredCardLockHours: 48,
  },

  packs: {
    cardsPerPack: 5,
    /** Every pack holds at least one card of this rarity rank or higher (2 = Gamma). */
    guaranteedMinRarityRank: 2,
    dailyFreePacks: 1,
    standardPackPrice: 150,
    /** Cards of this rarity rank or higher get the special reveal (4 = Alfa). */
    specialRevealMinRarityRank: 4,
  },

  matchmaking: {
    friendCodeMinutes: 10,
    /** Queue entries not refreshed by the waiting client for this long are ignored. */
    queueStaleSeconds: 20,
    /** After this wait without an opponent, the app suggests a bot. */
    suggestBotAfterSeconds: 60,
    /** Conquest pairing: maximum differences in level and team value (sum of rarity ranks). */
    levelRange: 2,
    teamValueRange: 4,
    /** Same, once either player has waited for widenAfterSeconds. */
    levelRangeWide: 4,
    teamValueRangeWide: 8,
    widenAfterSeconds: 30,
  },

  progression: {
    pvpWinXp: 30,
    pvpParticipationXp: 10,
    botWinXp: 10,
    botParticipationXp: 3,
    /** XP needed for level L is levelXpBase * L * (L - 1). */
    levelXpBase: 50,
    /** Coins for reaching level L are levelRewardBase + levelRewardPerLevel * L. */
    levelRewardBase: 30,
    levelRewardPerLevel: 10,
  },

  formations: {
    maxPerPlayer: 10,
  },
} as const;

export type Balance = typeof balance;
