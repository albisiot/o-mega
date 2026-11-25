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
    /**
     * Time a round result may stay on screen before the next timer starts (server side too:
     * game_config match.reveal_pause_seconds). The page leaves earlier when it is told:
     */
    revealPauseSeconds: 11,
    /** ...once its animation is over, plus this time to read it again... */
    revealReadSeconds: 3.5,
    /** ...but never before this. */
    revealMinSeconds: 6,
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
    /**
     * Paid once per run, when the threats passed reach each tier; finishXp at the end of the run.
     * Defaults: admins change them from /gestione-ricompense.
     */
    rewards: {
      finishXp: 0,
      tier1Passed: 3,
      tier1Coins: 10,
      tier2Passed: 5,
      tier2Coins: 15,
      tier3Passed: 8,
      tier3Coins: 25,
    },
    /** Players shown in the day's leaderboard; the player's own place is shown below when lower. */
    leaderboardSize: 10,
    /**
     * Places of the leaderboard whose lineups can be seen: today's only after one's own
     * attempt is finished (the threats are the same for everyone), yesterday's otherwise.
     */
    lineupsShown: 3,
    /**
     * Prizes of the day's leaderboard, given when the day ends (midnight Europe/Rome) to the
     * first leaderboardSize players with at least minPassed threats passed; claimed from a popup.
     * "others" is every place from the 4th on. Defaults: admins change them from /gestione-ricompense.
     */
    prizes: {
      minPassed: 1,
      rank1Coins: 50,
      rank1Packs: 1,
      rank2Coins: 100,
      rank2Packs: 0,
      rank3Coins: 75,
      rank3Packs: 0,
      othersCoins: 25,
      othersPacks: 0,
      /** Schegge by place too (SPEC §4.8), 0 to shards.maxReward. */
      rank1Shards: 0,
      rank2Shards: 0,
      rank3Shards: 0,
      othersShards: 0,
    },
  },

  /**
   * Emergenza della settimana (SPEC §5.16): the daily one, harder, once a week (Monday to
   * Sunday, Europe/Rome). Tuned with scripts/simulate-emergency.mts: the thresholds, 2 points
   * above the daily ones at every level, make it harder; the level sum only gives bigger threats.
   */
  emergencyWeek: {
    /** Threats of a run, and characters of its squad. */
    threatsPerRun: 10,
    maxFailures: 3,
    /** Level limits and required levels are those of a match; only the sum changes. */
    threatLevels: {
      minSum: 36,
      maxSum: 44,
    },
    /** Score needed to pass a threat of each level (a rare threat keeps its own). */
    targets: {
      level1: 9,
      level2: 15,
      level3: 20,
      level4: 25,
      level5: 30,
      level6: 34,
    },
    /** Paid once per run, when the threats passed reach each tier. Admins change them. */
    rewards: {
      tier1Passed: 4,
      tier1Coins: 20,
      tier2Passed: 7,
      tier2Coins: 30,
      tier3Passed: 10,
      tier3Coins: 50,
    },
    /** Players shown and prized in the week's leaderboard. */
    leaderboardSize: 10,
    /** Places whose lineups can be seen: this week's after one's own attempt, last week's before. */
    lineupsShown: 3,
    /**
     * Prizes of the week's leaderboard, given when the week ends (Sunday midnight, Europe/Rome)
     * to the first leaderboardSize players with at least minPassed threats passed. Admins change them.
     */
    prizes: {
      minPassed: 1,
      rank1Coins: 100,
      rank1Packs: 2,
      rank2Coins: 50,
      rank2Packs: 1,
      rank3Coins: 0,
      rank3Packs: 1,
      othersCoins: 50,
      othersPacks: 0,
      /** Schegge by place too (SPEC §4.8), 0 to shards.maxReward. */
      rank1Shards: 0,
      rank2Shards: 0,
      rank3Shards: 0,
      othersShards: 0,
    },
  },

  /**
   * Classifiche (SPEC §8.6): leaderboard points per match, written by the server when a
   * match ends (game_config `leaderboards.*`). A draw gives half, a loss and an abandoned
   * match nothing.
   */
  leaderboards: {
    /** Players shown in a leaderboard; the player's own place is shown below when lower. */
    size: 10,
    /** Points for a win against a person, or against a bot by difficulty. */
    points: {
      person: 10,
      superPro: 6,
      hard: 4,
      medium: 2,
      easy: 1,
    },
    /** Points a player can earn from bots in a game day, all modes together (0 = no cap). */
    botDailyCap: 40,
    /** Matches against the same person that give points in a game day (0 = no limit). */
    sameOpponentDaily: 3,
    /** Matches on a board before the win rate shows. */
    minMatchesForRate: 10,
  },

  /**
   * Classificata (SPEC §8.7): one Fama for every mode, moved by ranked matches and
   * written by the server when a match ends (game_config `ranked.*`).
   */
  ranked: {
    /** Fama against an opponent with the same Fama. */
    winPoints: 25,
    lossPoints: 20,
    /** Every this much Fama the opponent has more: one point more on a win, one less on a loss. */
    famaPerPoint: 20,
    winMin: 10,
    winMax: 40,
    lossMin: 5,
    lossMax: 35,
    /** From this win in a row on, each win gives streakBonus more. */
    streakFrom: 3,
    streakBonus: 5,
    /** Below this Fama a loss takes nothing (Recluta). */
    noLossBelow: 300,
    /** Below this Fama a loss never takes a player under the start of their league (Vigilante, Veterano). */
    floorsBelow: 1200,
    /** Ranked matches against the same person that move the Fama in a game day. */
    sameOpponentDaily: 3,
    /** Fama at which each league starts. */
    leagues: {
      recluta: 0,
      vigilante: 300,
      veterano: 700,
      asso: 1200,
      leggenda: 1800,
      omega: 2500,
    },
    /** Players shown in the Albo; the player's own place is shown below when lower. */
    boardSize: 10,
    matchmaking: {
      /** Pairing between people: Fama apart at most famaRange, then famaRangeWide, then anyone. */
      famaRange: 150,
      famaRangeWide: 400,
      widenAfterSeconds: 10,
      anyAfterSeconds: 20,
      /** Without a person, the opponent comes at a random moment of this window. */
      ghostMinSeconds: 20,
      ghostMaxSeconds: 30,
      /** The client asks again this often while waiting. */
      refreshSeconds: 3,
    },
    /** The Mandato: one calendar month, Europe/Rome. */
    season: {
      /** A new Mandato keeps the Fama up to this, plus keepSharePercent of the rest. */
      keepUpTo: 700,
      keepSharePercent: 50,
      /** Ranked matches in a Mandato before its prize. */
      minMatches: 5,
      /** Prizes by the league at the end of the Mandato. */
      rewards: {
        recluta: { coins: 25, packs: 0 },
        vigilante: { coins: 50, packs: 0 },
        veterano: { coins: 100, packs: 0 },
        asso: { coins: 100, packs: 1 },
        leggenda: { coins: 0, packs: 2 },
        omega: { coins: 0, packs: 3 },
      },
    },
    /**
     * The opponent found when no person is free: at the start of each league, and
     * towards the start of the next. Difficulty 1 Facile to 4 Super Pro; share: the
     * strongest part of the catalog its team comes from (100 = all); teamCap: at most
     * this percent as strong as the player's team (0 = no cap).
     */
    ghosts: {
      recluta: { difficultyFrom: 1, difficultyTo: 2, shareFrom: 100, shareTo: 100, teamCap: 100 },
      vigilante: { difficultyFrom: 2, difficultyTo: 2, shareFrom: 100, shareTo: 100, teamCap: 110 },
      veterano: { difficultyFrom: 2, difficultyTo: 3, shareFrom: 100, shareTo: 50, teamCap: 125 },
      asso: { difficultyFrom: 3, difficultyTo: 3, shareFrom: 50, shareTo: 35, teamCap: 0 },
      leggenda: { difficultyFrom: 3, difficultyTo: 4, shareFrom: 35, shareTo: 20, teamCap: 0 },
      omega: { difficultyFrom: 4, difficultyTo: 4, shareFrom: 20, shareTo: 15, teamCap: 0 },
      /** Their Fama is the player's, give or take this much. */
      famaSpread: 60,
      /**
       * Seconds from the opening of a round (or of their move) to their choice, drawn in
       * each window; lateChancePercent of the choices come in the last seconds instead.
       */
      delays: {
        classic: { min: 9, max: 26 },
        boss: { min: 9, max: 26 },
        tripleFirst: { min: 14, max: 40 },
        triple: { min: 28, max: 62 },
        quadrant: { min: 5, max: 20 },
      },
      lateChancePercent: 4,
      /** The late choices come between max and min seconds before the deadline. */
      lateSeconds: { min: 4, max: 8 },
      /**
       * No choice comes later than this before the deadline, so the client, asking every
       * nudgeSeconds, sees it with time to spare before the timer ends.
       */
      deadlineMarginSeconds: 4,
      /**
       * Client only: while the player waits for an opponent who may be the server's
       * (Classificata, Sfide a tema online), the app asks the server this often whether it
       * has chosen. Its choice is known only there; with a person the answer is the same.
       */
      nudgeSeconds: 2,
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
    /**
     * Time a round's result (a comic page per threat, then the recap) may stay before the next
     * timer starts, from the second round on; the pages leave earlier once they are over.
     */
    revealPauseSeconds: 50,
    /** On each threat's page: once its animation is over, this time to read it (client only). */
    contestReadSeconds: 2.5,
  },

  /**
   * Operazioni (SPEC §5.17): 2 to 4 players together against a rival Reggente and a Boss.
   * Every city round one threat more than the players; a threat nobody stops raises the
   * Panic. Tuned with scripts/simulate-coop.mts.
   */
  coop: {
    cityRounds: 4,
    /** Characters each player brings: one per city round, then bossCards for the Boss. */
    squadSize: 6,
    bossCards: 2,
    minPlayers: 2,
    /** Up to 4 since the second stage (SPEC §5.17). */
    maxPlayers: 4,
    /** Score that stops a threat of each level in the city: the Emergenza's. */
    targets: {
      level1: 7,
      level2: 13,
      level3: 18,
      level4: 23,
      level5: 28,
      level6: 32,
    },
    /** Score that breaks a front of the Boss: the weekly Emergenza's. */
    bossTargets: {
      level1: 9,
      level2: 15,
      level3: 20,
      level4: 25,
      level5: 30,
      level6: 34,
    },
    /** Panic that fails the operation in a room of two, from three players on (more threats covered), and what a threat nobody stopped adds. */
    panicLimit: 12,
    panicLimitCrowd: 10,
    panicLow: 1,
    panicHigh: 2,
    panicHighFromLevel: 4,
    /** More Panic when the threat nobody stopped was the rival's. */
    panicReinforced: 1,
    roundSeconds: 45,
    bossRoundSeconds: 60,
    /** From the second round on, time for the result on the map (its comic pages) before the timer starts. */
    revealPauseSeconds: 40,
    /** A room nobody touches for this long closes. */
    lobbyMinutes: 30,
    winXp: 30,
    lossXp: 10,
    /** How long a signal stays beside a player's name (client only). */
    signalSeconds: 6,
    /** Public queue «Cerca squadra»: after this wait the room starts with whoever is there and server allies. */
    queueWaitSeconds: 25,
    /** Rarest rank a server ally fields (3 = Beta). */
    allyMaxRank: 3,
  },

  /**
   * Caccia grossa (SPEC §5.18): 2 to 4 players against a Boss, one threat a round, one card
   * each, the scores summed. Below the Attack the team loses a Defence; above it, the rest
   * is damage to the Boss's Life. Tuned with scripts/simulate-raid.mts.
   */
  raid: {
    rounds: 5,
    squadSize: 6,
    minPlayers: 2,
    maxPlayers: 4,
    defenses: 3,
    /** One player's share of a threat's Attack, by level: the Emergenza's targets. */
    targets: {
      level1: 7,
      level2: 13,
      level3: 18,
      level4: 23,
      level5: 28,
      level6: 32,
    },
    /**
     * The Attack by players, in hundredths of one player's share: a little more than the players,
     * because more cards sum more evenly (simulated: the team then holds as often in 2, 3 and 4).
     */
    attackFactor: {
      players2: 200,
      players3: 300,
      players4: 405,
    },
    /** The Boss's Life by players, in hundredths: what a team of that size deals, so that a Boss is as hard in 2, 3 and 4. */
    vitaFactor: {
      players2: 200,
      players3: 290,
      players4: 370,
    },
    /** The Boss's Life for one player's share, before the players, the Strength and its own Life. */
    vitaBase: 14,
    /**
     * Each Magnitude: the Boss's Strength (Attack and Life) and what a win pays, in hundredths.
     * With a good squad the simulator wins about 80%, 65%, 50%, 35% and 20%: the curve is steep.
     */
    magnitude1: { forzaPercent: 92, rewardPercent: 50 },
    magnitude2: { forzaPercent: 96, rewardPercent: 75 },
    magnitude3: { forzaPercent: 100, rewardPercent: 100 },
    magnitude4: { forzaPercent: 104, rewardPercent: 150 },
    magnitude5: { forzaPercent: 108, rewardPercent: 250 },
    /** The moves: Defences a Colpo pesante takes, the share of the Life a Rigenerazione gives back. */
    heavyDefenses: 2,
    regenPercent: 10,
    /** At most this many Punto scoperto and Colpo pesante in a hunt (never two Colpo pesante in a row). */
    exposedMax: 1,
    heavyMax: 2,
    /** Threats drawn from the Boss's district, when it has enough. */
    fromDistrict: 2,
    roundSeconds: 30,
    /** From the second round on, time for the result (on the map, with its comic page) before the timer starts. */
    revealPauseSeconds: 20,
    /** A room nobody touches for this long closes. */
    lobbyMinutes: 30,
    /** XP of a win (times the Magnitude's rewardPercent) and of a loss (the same at every Magnitude). */
    winXp: 30,
    lossXp: 10,
    /** Coins of a player's first win on a Boss, times the Magnitude's rewardPercent. */
    firstWinCoins: 60,
    /** Prizes only to who chose at least this share of the cards played, in hundredths. */
    selfChosenPercent: 50,
    /** Rarest rank a server ally fields (3 = Beta). */
    allyMaxRank: 3,
    /** The stars (second stage): Colpo rapido asks the Boss down by this round; each star's coins, times the Magnitude's rewardPercent. */
    quickRound: 4,
    starCoins: 20,
    /** Public queue «Cerca squadra» (third stage): after this wait the room starts with whoever is there and server allies. */
    queueWaitSeconds: 25,
    /** The Boss of the week: coins of its first win of the week, times the Magnitude's rewardPercent. */
    weeklyCoins: 60,
    /** How long a signal stays beside a player's name (client only). */
    signalSeconds: 6,
  },

  /**
   * Scontro a squadre (SPEC §5.19, docs/COMBAT.md): 5 against 5 on two lines, turn meters and
   * moves. Version 0.2 (stage 2), tuned with scripts/simulate-combat.mts (docs/COMBAT.md); not in game_config yet (stage 4).
   * Ability codes are lower case here, as game_config keys; the engine reads them as the cards' codes.
   */
  combat: {
    teamSize: 5,
    /** Front-line places (F1, F2); the others are the second line. */
    frontSize: 2,
    /** Rarities are equal: every ability is scaled from its rarity's budget towards this one (the Delta's)... */
    referenceBudget: 54,
    /**
     * ...this far, in percent. All the way (100) makes the rarer cards weaker, because their extra
     * points sit on their peaks. At 95 (80 until 25 November 2026), with the real kits of every pack
     * character, each rarity beats the one below 48-51% of the time and Omega beats Delta 58%.
     */
    rarityScalePercent: 95,
    /** Life and Speed: a base plus points for each ability point. */
    vita: { base: 260, perPoint: { res: 6, vol: 3 } },
    speed: { base: 100, perPoint: { vel: 1 } },
    /**
     * The turn meter fills at the Speed; each starts at a random share of it, up to this percent.
     * All of it (100): with a fixed start the faster side always struck first and Speed outweighed
     * every other ability (a point of VEL won 70% of mirror battles; now 54%).
     */
    turnMeter: 1000,
    startMeterMaxPercent: 100,
    /** A move's Power: base plus perPoint times its weighted abilities (the weights sum to 1). */
    power: { base: 20, perPoint: 8 },
    /** Defence against a family: the sum of the target's three abilities of that family times this (catalog mean 50 each). */
    familyDefense: { body: 3.37, mind: 2.65, power: 5.03, craft: 4.1 },
    /** Damage times defenseScale / (defenseScale + defence). */
    defenseScale: 100,
    /** What a protected second-line target takes from ranged and area moves, in percent. */
    coverPercent: 80,
    /** Chance to hit in percent: base, attacker's and target's abilities, limits. */
    hit: { base: 85, attacker: { per: 1 }, defender: { fur: -0.5 }, minPercent: 70, maxPercent: 97 },
    /** Chance of a critical in percent, its limit, and what a critical deals. */
    crit: { base: 5, perPoint: { fur: 1, per: 0.5 }, maxPercent: 28, multiplierPercent: 150 },
    /** Charge: at the start, its top (what a supreme costs), what a base and a special move give. */
    charge: { start: 2, max: 6, base: 2, special: 1 },
    /** A fighter's shield never goes beyond this share of its Life. */
    shieldMaxPercent: 30,
    /** After this many actions the battle ends: standing fighters, then Life left. */
    maxActions: 100,
    /** Power bonus of a move using the field threat's abilities, in proportion to their weight. */
    fieldBonusPercent: 20,
    /**
     * The statuses (stage 2), in percent: more damage, more defence, more Speed; less damage, less
     * defence; the share of the Life a burn takes at the start of each turn. No status lasts more than maxTurns.
     */
    statuses: { empowerPercent: 25, fortifyPercent: 50, hastePercent: 20, weakenPercent: 20, vulnerablePercent: 30, burnPercent: 6, maxTurns: 3 },
    /** Chance of a debuff in percent: its base plus perPoint × (user's ability − target's mean in that family), within the limits. */
    effectChance: { perPoint: 3, minPercent: 10, maxPercent: 90 },
    /** Stage 4: the field is a usual threat of Nuova Megara between these levels, drawn by the server. */
    field: { minLevel: 2, maxLevel: 4 },
    /**
     * Stage 4, battles against the computer: XP of a win and of a loss (or a draw), coins of a win,
     * and how many finished battles a day (Europe/Rome) pay. Abandoned battles pay nothing.
     */
    rewards: { winXp: 20, lossXp: 8, winCoins: 15, dailyBattles: 5 },
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
    /** Free seals on the opening card of the side that plays first. */
    firstPlayerSeals: 3,
    /** Time for one move (20 until 17 November). */
    moveTimerSeconds: 40,
    /**
     * Pause to show a move before the next timer starts: against a bot it covers the player's
     * move, the bot "thinking" 2 seconds after its effects, and the bot's move (4 until 17 November).
     */
    movePauseSeconds: 10,
    /**
     * Fixed grid: a threat of the catalog on each border (SPEC §5.14). A card's side facing
     * out of the grid meets it: higher puts a seal on the card, lower takes one off.
     */
    fixedGridThreats: {
      /** Levels of the threats drawn (Nuova Megara, not rare), one per border. */
      minLevel: 2,
      maxLevel: 5,
      /** A threat's value on its border: its level plus this (4-7). */
      valueOffset: 2,
      /** Seals fewer on the card for every border threat higher than its side. */
      bite: 1,
    },
    /**
     * Seals have no limit. An event may set a seal target (events.quadrant_seal_target):
     * the first side with that many seals on the grid wins. The target an admin may choose.
     */
    sealTarget: {
      min: 5,
      max: 60,
      /** What the event editor suggests. */
      suggested: 12,
    },
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

  /**
   * The rules of the rare threats (SPEC §5.15). Their chances (1 match in N) are in the
   * threat_rarities table, which admins edit; Territorio ostile and Sottovalutati use the
   * numbers of `threatModifiers`, Negativo `cards.abilityMax`.
   */
  rareThreats: {
    /** Tutto o niente: lowest value of a required ability that counts. */
    allOrNothingMin: 5,
    /** Ultimi i primi: points for every rarity rank below the top one. */
    lastFirstBonus: 2,
    lastFirstTopRank: 5,
    /** Il prezzo: a required ability at this value or less costs points instead. */
    priceMaxValue: 1,
    priceMalus: 3,
    /** Il conteggio: points for every required ability at this value or more. */
    countMin: 5,
    countPoints: 1,
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
    /**
     * Paid to the winner when none of the loser's cards can be taken (default: admins change it).
     * What a Conquest match pays otherwise is in match_reward_rules (see matchRewards).
     */
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

  /**
   * Schegge (SPEC §4.8): what they buy. Defaults: admins change them from /gestione-schegge.
   * The Schegge a broken duplicate variant gives are per rarity (rarity_definitions.variant_shard_value).
   */
  shards: {
    /** A standard pack, at the standard variant chance (never an event's), with no daily limit. */
    packCost: 1,
    /** A random frame or effect, every one as likely. */
    randomCosmeticCost: 1,
    /** A random frame, or a random effect: the player chooses which kind. */
    chosenKindCosmeticCost: 2,
    /** A random variant the player does not own yet. */
    newVariantCost: 3,
    /**
     * Most Schegge one prize can give: bonus codes, event and challenge targets, daily objectives,
     * imprese and the places of the Emergenza leaderboards (0 = none; the server checks the same).
     */
    maxReward: 100,
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
    /** Players shown in an event's Classifica generale; the player's own place is added when lower. */
    leaderboardSize: 100,
    /**
     * Who sees an event's Classifica generale, during the event and after it: "completed" (the
     * last target reached), "participants" (any event point) or "everyone". The server decides.
     */
    leaderboardVisibility: "completed" as "completed" | "participants" | "everyone",
  },

  /**
   * Sfide a tema (SPEC §8.8): an existing mode, for a while, played only with some characters.
   * Admins create them from /gestione-sfide; the server checks every squad when the match starts.
   */
  challenges: {
    /** Event points of a challenge match linked to an event, proposed by the editor. */
    defaultEventPoints: { win: 20, draw: 10, loss: 5 },
    /** Highest event points a challenge match can give, per outcome. */
    maxEventPoints: 1000,
    /** Matches a day a challenge may allow; null in a challenge means no limit. */
    maxDailyLimit: 20,
    /** Longest a challenge can last. */
    maxDays: 90,
    titleMaxLength: 40,
    descriptionMaxLength: 140,
    /** A rule admitting fewer characters warns the admin: few players can field a squad (client only). */
    warnBelow: 15,
    /** Prize targets of wins a challenge can have, and the most wins one can ask. */
    maxTiers: 3,
    maxTierWins: 100,
    /** Highest minimum player level a challenge can ask. */
    maxMinLevel: 100,
    /**
     * Seconds in a challenge's online queue before the server's opponent comes, drawn in this
     * window for each wait: it plays with the challenge's rules and looks like a person, as in
     * the Classificata (SPEC §8.7).
     */
    ghostMinSeconds: 20,
    ghostMaxSeconds: 30,
    /** Highest rarity budget of a squad (the ranks Delta 1 … Omega 5 added up). */
    maxRarityBudget: 50,
    /** Most times as often a challenge can make rare threats turn up. */
    maxRareMultiplier: 100,
    /** Players shown in the leaderboard of a challenge. */
    leaderboardSize: 50,
    /** Simulated matches the editor asks for each bot (client only): fewer for the slow ones. */
    simulationMatches: { easy: 120, medium: 120, hard: 24, super_pro: 4 },
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

  /**
   * What each match pays lives in the match_reward_rules table (mode x opponent x outcome),
   * changed by admins from /gestione-ricompense. These are the daily caps on what matches
   * pay, defaults too (0: no cap).
   */
  matchRewards: {
    dailyCoinCap: 0,
    dailyPackCap: 3,
  },

  /** The stars of the story missions (SPEC §5.11). */
  story: {
    /**
     * Coins a star pays the first time it is earned. Every mission keeps its own
     * (story_missions.star_coins, changed by admins from /gestione-storia): a new mission
     * gets starCoinsBase, plus starCoinsStep every starCoinsStepChapters chapters of the
     * whole story (10 in chapters 1-4, 20 in 5-8, 30 in 9-12).
     */
    starCoinsBase: 10,
    starCoinsStep: 10,
    starCoinsStepChapters: 4,
    /** A star rule admitting fewer characters warns the admin: few players can field 5 (client only). */
    starWarnBelow: 15,
  },

  progression: {
    /** XP needed for level L is levelXpBase * L * (L - 1). */
    levelXpBase: 50,
    /** Coins for reaching level L are levelRewardBase + levelRewardPerLevel * L. */
    levelRewardBase: 30,
    levelRewardPerLevel: 10,
  },

  formations: {
    maxPerPlayer: 10,
    /** How long «Annulla» stays after a card is taken out of the squad by holding it. */
    undoRemoveMs: 4000,
  },

  /** Purchases with coins: the button must be held, so a stray tap never buys. */
  holdToConfirm: {
    durationMs: 1000,
  },

  /** In-app banners for good news (SPEC §11.1). */
  notifications: {
    /** Unseen news older than this is not shown any more (game_config). */
    showWithinHours: 24,
    /** Older news is deleted when a new one arrives (game_config). */
    keepDays: 30,
    /** How long a banner stays on screen (client only). */
    showMs: 4000,
    /** At most this many banners wait in line; older ones are dropped (client only). */
    maxQueued: 5,
  },

  /**
   * End notices (SPEC §11.7): the full-screen notice, once per player, when an event, a Sfida a
   * tema, the Emergenza della settimana or a Mandato ends. The server decides who gets one.
   */
  endNotices: {
    /** Something that ended longer ago than this gets no notice (game_config). */
    withinDays: 7,
    /** Players shown in the final leaderboard; the player's own place is added when lower (game_config). */
    boardSize: 10,
    /** How often an open app asks again, so an end while it is open is not missed (client only). */
    recheckMs: 10 * 60 * 1000,
  },

  /**
   * Imprese (SPEC §8.5): the reward the editor suggests for a new impresa of each tier
   * (client only; every impresa keeps its own reward in the database).
   */
  achievements: {
    suggestedReward: {
      bronze: { coins: 50, packs: 0 },
      silver: { coins: 150, packs: 0 },
      gold: { coins: 0, packs: 2 },
      legend: { coins: 0, packs: 3 },
    },
  },
} as const;

export type Balance = typeof balance;
