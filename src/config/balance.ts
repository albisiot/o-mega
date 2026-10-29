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
    reconnectGraceSeconds: 30,
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
    unlockAfterMatches: 5,
    unlockAtLevel: 3,
    maxCardsLostPerDay: 3,
    samePairCooldownHours: 24,
    conqueredCardLockHours: 48,
  },

  packs: {
    cardsPerPack: 5,
    /** Every pack holds at least one card of this rarity rank or higher (2 = Gamma). */
    guaranteedMinRarityRank: 2,
    dailyFreePacks: 1,
    standardPackPrice: 150,
  },

  economy: {
    winCoins: 50,
    participationCoins: 15,
    dailyMatchCoinCap: 300,
    samePairRewardWindowHours: 24,
    samePairFullRewardMatches: 3,
    /** Bot matches pay this fraction of PvP rewards (SPEC §13.2 #5). */
    botRewardMultiplier: 0.5,
    /** Separate daily cap for bot rewards: assumed half of the PvP cap. */
    botDailyCoinCap: 150,
  },
} as const;

export type Balance = typeof balance;
