// Single source of balance values (SPEC §4-§8). All numbers are provisional.
// The authoritative copy lives in the `game_config` table: server-side logic
// reads it from there, and this file must stay in sync with it.
// Per-rarity values (drop weights, ability budgets, duplicate coins) are not
// here: they belong to `rarity_definitions`.

export const balance = {
  time: {
    /** Daily reset (free pack, daily limits) happens at midnight in this zone. */
    dailyResetTimeZone: "Europe/Rome",
  },

  cards: {
    abilityMin: 0,
    abilityMax: 10,
    /** Allowed deviation from the ability budget of the card's rarity (rarer cards have more points). */
    abilityBudgetTolerance: 3,
  },

  match: {
    teamSize: 5,
    threatsPerMatch: 5,
    roundsToWin: 3,
    roundTimerSeconds: 30,
    /** Time to show a round result before the next timer starts. */
    revealPauseSeconds: 6,
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

  /** Thresholds tuned by simulation on the real catalog (SPEC §5.10). */
  emergency: {
    /** Threats of a run, and characters of its squad. */
    threatsPerRun: 8,
    maxFailures: 3,
    /** Level limits and required levels are those of a match; only the sum changes. */
    threatLevels: {
      minSum: 24,
      maxSum: 32,
    },
    /** Score needed to pass a threat of each level. */
    targets: {
      level1: 7,
      level2: 13,
      level3: 18,
      level4: 23,
      level5: 28,
      level6: 32,
    },
    /** Paid once per run, when the threats passed reach each tier. */
    rewards: {
      tier1Passed: 3,
      tier1Coins: 10,
      tier2Passed: 5,
      tier2Coins: 15,
      tier3Passed: 8,
      tier3Coins: 25,
    },
  },

  /**
   * Grande Minaccia (SPEC §5.12): a boss with five fronts and a points table visible
   * from the start; a character placed on a front stays there and scores every turn.
   * Simulated on the real catalog. The turn timer is the match's round timer.
   */
  boss: {
    turns: 5,
    fronts: 5,
    /**
     * Each turn `hotFronts` random fronts are hot, never the ones hot in the turn before:
     * worth `hotValue` in turn 1 and `hotGrowth` more each turn (2, 3, 4, 5, 6). The
     * others are worth `baseValue`. Defaults: admins change them from /gestione-minaccia.
     */
    hotFronts: 2,
    hotValue: 2,
    hotGrowth: 1,
    baseValue: 1,
  },

  /**
   * Allarme Triplo (SPEC §5.13): three threats drawn at random, the same for the whole
   * match; a deck of rounds × threats characters, three drawn at random each round and
   * placed one per threat. Each threat won is a point.
   */
  triple: {
    rounds: 3,
    threats: 3,
    /** Time to place the three cards of a round. */
    roundTimerSeconds: 45,
  },

  /**
   * Quadrante (SPEC §5.14): a size × size grid filled in turns, with four abilities drawn
   * as the sides of every card. Seals go on the cards a side beats; the most seals win.
   */
  quadrant: {
    size: 4,
    deckSize: 10,
    handSize: 3,
    /** Cards each side plays: size² / 2. */
    cardsPerSide: 8,
    /** Seals each side has. */
    seals: 15,
    /** Free seals on the opening card of the side that plays first. */
    firstPlayerSeals: 3,
    /** Time for one move. */
    moveTimerSeconds: 20,
    /** Pause to show a move before the next timer starts. */
    movePauseSeconds: 2,
  },

  /** Twists on the threats of a match; Emergenza has none. Tuned by simulation (SPEC §5.4). */
  threatModifiers: {
    minPerMatch: 1,
    maxPerMatch: 2,
    hostileBonus: 3,
    hostileMalus: 2,
    underdogBonus: 3,
    underdogMalus: 3,
    underdogCommonMaxRank: 1,
    underdogEliteMinRank: 4,
  },

  /** The rules of the places beyond Nuova Megara, fixed for each of their threats (SPEC §5.4). */
  places: {
    /** Il conto lungo: points of the side that has won fewer rounds. */
    longCountBonus: 3,
    /** Gelo: the most a required ability counts. */
    frostCap: 6,
    /** Duello: how many of the highest required abilities count. */
    duelCount: 2,
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
    /** Chance that a drawn card with an artwork variant comes with that art. */
    variantChancePercent: 5,
    /** Cards of this rarity rank or higher get the special reveal (4 = Alfa). */
    specialRevealMinRarityRank: 4,
  },

  /** Packs an admin creates from the app (/gestione-pacchetti-speciali); price and odds are per pack. */
  specialPacks: {
    maxCardsPerPack: 10,
  },

  bonusCodes: {
    /** Unknown codes a player can try per hour: codes cannot be found by guessing. */
    maxFailedAttemptsPerHour: 10,
  },

  /** Timed events (SPEC §8.2). Points, targets and rewards belong to each event, not here. */
  events: {
    /** Matches against the same player that earn event points within the window. */
    sameOpponentMatches: 3,
    sameOpponentWindowHours: 24,
    /** Targets an event can have. */
    maxTiers: 5,
    /** An event that admits only some traits must allow at least this many characters (an Emergenza squad). */
    minAdmittedCharacters: 8,
  },

  /**
   * Daily objectives (SPEC §8.3): drawn by the server at the first use of the game day.
   * The catalog (titles, targets, rewards of each objective) is the table
   * daily_objective_definitions; an objective without its own coins pays rewardCoins.
   */
  dailyObjectives: {
    /** Objectives each player gets per game day, by difficulty. */
    perDay: {
      easy: 1,
      medium: 1,
      hard: 1,
    },
    /** Objectives not yet completed a player can swap per game day, in total. */
    refreshesPerDay: 3,
    rewardCoins: {
      easy: 20,
      medium: 40,
      hard: 60,
    },
  },

  matchmaking: {
    friendCodeMinutes: 10,
    /** Queue entries not refreshed by the waiting client for this long are ignored. */
    queueStaleSeconds: 20,
    /** After this wait without an opponent, the app suggests a bot. */
    suggestBotAfterSeconds: 60,
    /** After this wait in the Conquest queue, a random bot becomes the opponent. */
    conquestBotAfterSeconds: 60,
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

  /** Purchases with coins: the button must be held, so a stray tap never buys. */
  holdToConfirm: {
    durationMs: 1000,
  },
} as const;

export type Balance = typeof balance;
