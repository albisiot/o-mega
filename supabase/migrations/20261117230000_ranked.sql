-- Classificata (SPEC §8.7): a ranked match in every mode, against another player
-- or, when nobody is free after 20-30 seconds, against an opponent the server
-- plays with the bots of that mode. The player is never told which: that
-- opponent has a name, a face, a level and a Fama like a person, chooses with a
-- person's timing, and every payload shows it as one. One Fama for every mode
-- moves with each ranked match; the leagues, the monthly Mandato with its
-- prizes and the Albo dei Reggenti follow it.
--
-- A ranked match is a row of matches with mode 'ranked'. Against a person it is
-- a match between players. Against the server's opponent (a "ghost" here),
-- player_b and bot_difficulty are both null, so every count that tells bots
-- from people (statistics, daily objectives, events, rewards) sees a person,
-- and side b is a team without a user, as in a bot match. ranked_matches, which
-- no client reads, keeps the ghost and its difficulty; ranked_ghost_turns says
-- when the ghost "has chosen" in each round, so the opponent's choice shows up
-- after a while instead of at once. The Edge Function plays the ghost's move
-- with the engine when a round is resolved (never before its time).
--
-- The Fama is a ledger (ranked_ledger): every change is a row, the season reset
-- too, and ranked_players keeps the running total. Ranked matches give no points
-- on the boards of SPEC §8.6: the Albo is their board.

insert into public.game_config (key, value, description) values
  ('ranked.win_points', '25', 'Fama for a ranked win against the same Fama'),
  ('ranked.loss_points', '20', 'Fama a ranked loss takes against the same Fama'),
  ('ranked.fama_per_point', '20', 'Fama of difference worth one point of change'),
  ('ranked.win_min', '10', 'Least Fama a ranked win gives'),
  ('ranked.win_max', '40', 'Most Fama a ranked win gives'),
  ('ranked.loss_min', '5', 'Least Fama a ranked loss takes'),
  ('ranked.loss_max', '35', 'Most Fama a ranked loss takes'),
  ('ranked.streak_from', '3', 'Win in a row from which the streak bonus counts'),
  ('ranked.streak_bonus', '5', 'Extra Fama per win in a streak'),
  ('ranked.no_loss_below', '300', 'Below this Fama a loss takes nothing'),
  ('ranked.floors_below', '1200', 'Below this Fama a loss stops at the start of the league'),
  ('ranked.same_opponent_daily', '3', 'Ranked matches against the same person moving Fama per game day'),
  ('ranked.leagues.recluta', '0', 'Fama at which the league recluta starts'),
  ('ranked.leagues.vigilante', '300', 'Fama at which the league vigilante starts'),
  ('ranked.leagues.veterano', '700', 'Fama at which the league veterano starts'),
  ('ranked.leagues.asso', '1200', 'Fama at which the league asso starts'),
  ('ranked.leagues.leggenda', '1800', 'Fama at which the league leggenda starts'),
  ('ranked.leagues.omega', '2500', 'Fama at which the league omega starts'),
  ('ranked.board_size', '10', 'Players shown in the Albo'),
  ('ranked.matchmaking.fama_range', '150', 'Ranked matchmaking: fama range'),
  ('ranked.matchmaking.fama_range_wide', '400', 'Ranked matchmaking: fama range wide'),
  ('ranked.matchmaking.widen_after_seconds', '10', 'Ranked matchmaking: widen after seconds'),
  ('ranked.matchmaking.any_after_seconds', '20', 'Ranked matchmaking: any after seconds'),
  ('ranked.matchmaking.ghost_min_seconds', '20', 'Ranked matchmaking: ghost min seconds'),
  ('ranked.matchmaking.ghost_max_seconds', '30', 'Ranked matchmaking: ghost max seconds'),
  ('ranked.matchmaking.refresh_seconds', '3', 'Ranked matchmaking: refresh seconds'),
  ('ranked.season.keep_up_to', '700', 'Mandato: keep up to'),
  ('ranked.season.keep_share_percent', '50', 'Mandato: keep share percent'),
  ('ranked.season.min_matches', '5', 'Mandato: min matches'),
  ('ranked.season.rewards.recluta.coins', '25', 'Mandato prize for recluta: coins'),
  ('ranked.season.rewards.recluta.packs', '0', 'Mandato prize for recluta: packs'),
  ('ranked.season.rewards.vigilante.coins', '50', 'Mandato prize for vigilante: coins'),
  ('ranked.season.rewards.vigilante.packs', '0', 'Mandato prize for vigilante: packs'),
  ('ranked.season.rewards.veterano.coins', '100', 'Mandato prize for veterano: coins'),
  ('ranked.season.rewards.veterano.packs', '0', 'Mandato prize for veterano: packs'),
  ('ranked.season.rewards.asso.coins', '100', 'Mandato prize for asso: coins'),
  ('ranked.season.rewards.asso.packs', '1', 'Mandato prize for asso: packs'),
  ('ranked.season.rewards.leggenda.coins', '0', 'Mandato prize for leggenda: coins'),
  ('ranked.season.rewards.leggenda.packs', '2', 'Mandato prize for leggenda: packs'),
  ('ranked.season.rewards.omega.coins', '0', 'Mandato prize for omega: coins'),
  ('ranked.season.rewards.omega.packs', '3', 'Mandato prize for omega: packs'),
  ('ranked.ghosts.recluta.difficulty_from', '1', 'Ranked ghost: recluta difficulty from'),
  ('ranked.ghosts.recluta.difficulty_to', '2', 'Ranked ghost: recluta difficulty to'),
  ('ranked.ghosts.recluta.share_from', '100', 'Ranked ghost: recluta share from'),
  ('ranked.ghosts.recluta.share_to', '100', 'Ranked ghost: recluta share to'),
  ('ranked.ghosts.recluta.team_cap', '100', 'Ranked ghost: recluta team cap'),
  ('ranked.ghosts.vigilante.difficulty_from', '2', 'Ranked ghost: vigilante difficulty from'),
  ('ranked.ghosts.vigilante.difficulty_to', '2', 'Ranked ghost: vigilante difficulty to'),
  ('ranked.ghosts.vigilante.share_from', '100', 'Ranked ghost: vigilante share from'),
  ('ranked.ghosts.vigilante.share_to', '100', 'Ranked ghost: vigilante share to'),
  ('ranked.ghosts.vigilante.team_cap', '110', 'Ranked ghost: vigilante team cap'),
  ('ranked.ghosts.veterano.difficulty_from', '2', 'Ranked ghost: veterano difficulty from'),
  ('ranked.ghosts.veterano.difficulty_to', '3', 'Ranked ghost: veterano difficulty to'),
  ('ranked.ghosts.veterano.share_from', '100', 'Ranked ghost: veterano share from'),
  ('ranked.ghosts.veterano.share_to', '50', 'Ranked ghost: veterano share to'),
  ('ranked.ghosts.veterano.team_cap', '125', 'Ranked ghost: veterano team cap'),
  ('ranked.ghosts.asso.difficulty_from', '3', 'Ranked ghost: asso difficulty from'),
  ('ranked.ghosts.asso.difficulty_to', '3', 'Ranked ghost: asso difficulty to'),
  ('ranked.ghosts.asso.share_from', '50', 'Ranked ghost: asso share from'),
  ('ranked.ghosts.asso.share_to', '35', 'Ranked ghost: asso share to'),
  ('ranked.ghosts.asso.team_cap', '0', 'Ranked ghost: asso team cap'),
  ('ranked.ghosts.leggenda.difficulty_from', '3', 'Ranked ghost: leggenda difficulty from'),
  ('ranked.ghosts.leggenda.difficulty_to', '4', 'Ranked ghost: leggenda difficulty to'),
  ('ranked.ghosts.leggenda.share_from', '35', 'Ranked ghost: leggenda share from'),
  ('ranked.ghosts.leggenda.share_to', '20', 'Ranked ghost: leggenda share to'),
  ('ranked.ghosts.leggenda.team_cap', '0', 'Ranked ghost: leggenda team cap'),
  ('ranked.ghosts.omega.difficulty_from', '4', 'Ranked ghost: omega difficulty from'),
  ('ranked.ghosts.omega.difficulty_to', '4', 'Ranked ghost: omega difficulty to'),
  ('ranked.ghosts.omega.share_from', '20', 'Ranked ghost: omega share from'),
  ('ranked.ghosts.omega.share_to', '15', 'Ranked ghost: omega share to'),
  ('ranked.ghosts.omega.team_cap', '0', 'Ranked ghost: omega team cap'),
  ('ranked.ghosts.fama_spread', '60', 'Ranked ghost: fama spread'),
  ('ranked.ghosts.delays.classic.min', '9', 'Ghost choice, seconds after the opening (classic): min'),
  ('ranked.ghosts.delays.classic.max', '26', 'Ghost choice, seconds after the opening (classic): max'),
  ('ranked.ghosts.delays.boss.min', '9', 'Ghost choice, seconds after the opening (boss): min'),
  ('ranked.ghosts.delays.boss.max', '26', 'Ghost choice, seconds after the opening (boss): max'),
  ('ranked.ghosts.delays.triple_first.min', '14', 'Ghost choice, seconds after the opening (triple_first): min'),
  ('ranked.ghosts.delays.triple_first.max', '40', 'Ghost choice, seconds after the opening (triple_first): max'),
  ('ranked.ghosts.delays.triple.min', '28', 'Ghost choice, seconds after the opening (triple): min'),
  ('ranked.ghosts.delays.triple.max', '62', 'Ghost choice, seconds after the opening (triple): max'),
  ('ranked.ghosts.delays.quadrant.min', '5', 'Ghost choice, seconds after the opening (quadrant): min'),
  ('ranked.ghosts.delays.quadrant.max', '20', 'Ghost choice, seconds after the opening (quadrant): max'),
  ('ranked.ghosts.late_chance_percent', '4', 'Ranked ghost: late chance percent')
;

-- ---------------------------------------------------------------------------
-- Matches, queue and ledgers accept the new mode
-- ---------------------------------------------------------------------------

alter table public.matches drop constraint matches_mode_check;
alter table public.matches add constraint matches_mode_check check (mode in ('bot', 'friendly', 'conquest', 'ranked'));
alter table public.matches drop constraint matches_bot_shape;
alter table public.matches add constraint matches_bot_shape check (
  (mode = 'bot' and bot_difficulty is not null)
  or (mode = 'conquest')
  or (mode in ('friendly', 'ranked') and bot_difficulty is null)
);
alter table public.matches drop constraint matches_one_opponent;
alter table public.matches add constraint matches_one_opponent check (
  (bot_difficulty is null) = (player_b is not null)
  -- A ranked match against the server's opponent: no second player, no difficulty on the match.
  or (mode = 'ranked' and bot_difficulty is null and player_b is null)
);

alter table public.matchmaking_queue drop constraint matchmaking_queue_mode_check;
alter table public.matchmaking_queue add constraint matchmaking_queue_mode_check
  check (mode in ('friendly', 'conquest', 'ranked'));
-- The Fama of a player waiting for a ranked match (pairing).
alter table public.matchmaking_queue add column fama integer not null default 0;

alter table public.player_notifications drop constraint player_notifications_kind_check;
alter table public.player_notifications add constraint player_notifications_kind_check
  check (kind in ('objective_completed', 'event_reward', 'achievement', 'leaderboard', 'ranked'));

alter table public.coin_ledger drop constraint coin_ledger_reason_check;
alter table public.coin_ledger add constraint coin_ledger_reason_check check (reason in (
  'pack_purchase', 'match_reward', 'bot_match_reward', 'duplicate_conversion', 'conquest_bonus', 'level_reward',
  'emergency_reward', 'bonus_code', 'story_reward', 'event_reward', 'objective_reward', 'achievement_reward',
  'emergency_prize', 'ranked_prize', 'admin_adjustment'
));

alter table public.pack_openings drop constraint pack_openings_pack_type_check;
alter table public.pack_openings add constraint pack_openings_pack_type_check
  check (pack_type in ('daily', 'standard', 'bonus', 'event', 'special', 'objective', 'match', 'achievement', 'emergency', 'ranked'));

-- ---------------------------------------------------------------------------
-- Tables (no client reads them: everything goes through the functions below)
-- ---------------------------------------------------------------------------

-- The opponents the server plays: each with a fixed name, face and level, and a
-- Fama of its own, so meeting one again looks like meeting the same person.
create table public.ranked_ghosts (
  id uuid primary key default gen_random_uuid(),
  -- Same rule as profiles.username; reserved: no player can take it.
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_definition_id uuid references public.card_definitions (id) on delete set null,
  level integer not null check (level between 1 and 99),
  fama integer not null default 0 check (fama >= 0),
  title text check (title is null or char_length(title) between 2 and 30),
  matches integer not null default 0 check (matches >= 0),
  created_at timestamptz not null default now()
);
create unique index ranked_ghosts_username_key on public.ranked_ghosts (lower(username));

-- A player's Fama now: the sum of their ledger, kept here as a running total.
-- `season` is the Mandato it belongs to ('YYYY-MM'); an older one is reset at the
-- player's next ranked match.
create table public.ranked_players (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  fama integer not null default 0 check (fama >= 0),
  best_fama integer not null default 0 check (best_fama >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  -- Ranked wins in a row (streak bonus).
  streak integer not null default 0 check (streak >= 0),
  updated_at timestamptz not null default now()
);

-- Every change of Fama: a ranked match (also at 0) or the reset of a new Mandato.
create table public.ranked_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  reason text not null check (reason in ('match', 'season_reset')),
  match_id uuid references public.matches (id),
  -- The board of the match: classic, boss, triple, quadrant (both grids).
  format text check (format in ('classic', 'boss', 'triple', 'quadrant')),
  outcome text check (outcome in ('win', 'draw', 'loss')),
  -- The person played, null against the server's opponent.
  opponent_id uuid references public.profiles (id) on delete set null,
  delta integer not null,
  fama_after integer not null check (fama_after >= 0),
  created_at timestamptz not null default now(),
  check ((reason = 'match') = (match_id is not null and format is not null and outcome is not null)),
  unique (match_id, user_id)
);
create index ranked_ledger_season_idx on public.ranked_ledger (season, user_id);
create index ranked_ledger_user_idx on public.ranked_ledger (user_id, created_at);

-- The ranked side of a match: the Fama of both sides when it started and what it
-- moved; against the server's opponent, which one and how it plays.
create table public.ranked_matches (
  match_id uuid primary key references public.matches (id) on delete cascade,
  ghost_id uuid references public.ranked_ghosts (id),
  ghost_difficulty text check (ghost_difficulty in ('easy', 'medium', 'hard', 'super_pro')),
  fama_a integer not null,
  fama_b integer not null,
  delta_a integer,
  delta_b integer,
  check ((ghost_id is null) = (ghost_difficulty is null))
);
create index ranked_matches_ghost_idx on public.ranked_matches (ghost_id);

-- When the server's opponent "has chosen" in a round (or move) of its match.
create table public.ranked_ghost_turns (
  match_id uuid not null references public.ranked_matches (match_id) on delete cascade,
  round integer not null,
  ready_at timestamptz not null,
  primary key (match_id, round)
);

-- Mandati whose results have been written (prizes, titles), once each.
create table public.ranked_seasons (
  season text primary key check (season ~ '^\d{4}-\d{2}$'),
  closed_at timestamptz not null default now()
);

-- Where each player ended a Mandato, with the prize (claimed from the Albo) and
-- the title it gave, if any. The id is what set_player_title receives.
create table public.ranked_season_results (
  id uuid primary key default gen_random_uuid(),
  season text not null references public.ranked_seasons (season),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place integer not null check (place >= 1),
  fama integer not null,
  league text not null,
  matches integer not null,
  wins integer not null,
  coins integer not null default 0 check (coins >= 0),
  packs integer not null default 0 check (packs >= 0),
  title text check (title is null or char_length(title) between 2 and 30),
  claimed_at timestamptz,
  opening_ids uuid[] not null default '{}',
  unique (season, user_id)
);
create index ranked_season_results_user_idx on public.ranked_season_results (user_id);

alter table public.ranked_ghosts enable row level security;
alter table public.ranked_players enable row level security;
alter table public.ranked_ledger enable row level security;
alter table public.ranked_matches enable row level security;
alter table public.ranked_ghost_turns enable row level security;
alter table public.ranked_seasons enable row level security;
alter table public.ranked_season_results enable row level security;
revoke all on table public.ranked_ghosts, public.ranked_players, public.ranked_ledger, public.ranked_matches,
  public.ranked_ghost_turns, public.ranked_seasons, public.ranked_season_results from anon, authenticated;

-- The opponents: plausible usernames (like the ones the game makes from a Google
-- name), a level that follows their Fama, more of them in the first leagues.
-- A name a player already has is left out.
insert into public.ranked_ghosts (username, level, fama)
select v.username, v.level, v.fama
from (values
  ('marino_c4', 27, 1498),
  ('IlLupo76', 2, 4),
  ('daniele88', 17, 1043),
  ('JacopoFontana', 12, 466),
  ('Matteo_Ferri', 12, 485),
  ('Massimo_Cattane_2632', 10, 318),
  ('Riccardo_Sala', 4, 63),
  ('gaia_b', 40, 2834),
  ('giacomo_p', 13, 636),
  ('Diego_Farina_8109', 9, 211),
  ('Arianna_Sala', 13, 610),
  ('costa_s6', 8, 663),
  ('Stefano_Marino', 8, 619),
  ('IlariaFarina', 14, 1057),
  ('FrancescaMarini', 13, 825),
  ('alice_p', 4, 361),
  ('Noemi_Galli', 6, 151),
  ('Ari_23', 10, 409),
  ('Leonardo_29', 6, 270),
  ('Anna_Morelli', 14, 641),
  ('PanteraOro', 4, 370),
  ('IlDrago94', 9, 513),
  ('matteo96', 15, 1087),
  ('valentina88', 7, 84),
  ('Kiki77', 3, 117),
  ('LaSaetta', 12, 486),
  ('IlGufo3', 6, 411),
  ('chiara_l', 8, 609),
  ('Daniele_Gallo', 12, 599),
  ('Camilla_Mazza', 12, 609),
  ('Valentina_Monti', 22, 1266),
  ('Michele_Rizzi', 5, 303),
  ('Mattia_Sanna', 3, 21),
  ('PietroFabbri', 17, 902),
  ('Stefano39', 1, 38),
  ('Camilla_Giuliani', 18, 955),
  ('Martina_Grassi', 2, 171),
  ('fabio_g', 12, 915),
  ('Noemi_Mariani', 9, 487),
  ('elena_c', 8, 686),
  ('SaettaBlu', 1, 22),
  ('LaPantera', 30, 1683),
  ('Samuele_61', 6, 54),
  ('Francesca_Santoro', 20, 1184),
  ('Emanuele_Ferrari', 13, 572),
  ('Anna_Gentile_4027', 10, 367),
  ('Leonardo51', 2, 45),
  ('Roberta_Gallo', 12, 745),
  ('Alice_Moretti', 4, 230),
  ('Marta_Ricci', 9, 198),
  ('IlFulmine98', 2, 100),
  ('Samuele_Mazza', 6, 278),
  ('Simo_SA', 1, 93),
  ('beatrice86', 4, 193),
  ('Paola_Pellegrino', 5, 365),
  ('Roberto_Amato', 3, 89),
  ('LaSaetta34', 3, 236),
  ('VolpeBlu', 6, 152),
  ('Francesca_Carbone', 1, 54),
  ('Veronica_Vitale', 10, 793),
  ('Fra_RC', 6, 318),
  ('Debora_Bianco', 6, 368),
  ('Debora_Conti', 6, 349),
  ('Silvia_Pellegrini', 1, 57),
  ('Dani_BO', 18, 1020),
  ('mattia80', 35, 2357),
  ('riccardo1', 6, 305),
  ('Greta_BO', 43, 2617),
  ('Lorenzo_Conte_3774', 14, 604),
  ('Diego_Costa', 1, 10),
  ('Serena_Villa_8564', 1, 204),
  ('Matteo_Mazza', 27, 1517),
  ('Fede_LE', 6, 64),
  ('enrico_m', 2, 216),
  ('Michele_MI', 4, 426),
  ('GiorgiaFerrari', 3, 199),
  ('FrancescoCaruso', 2, 162),
  ('Jacopo_DeAngelis', 7, 495),
  ('michela_s', 13, 814),
  ('Giorgia_Santoro', 7, 151),
  ('Alessia_Grasso_9528', 4, 27),
  ('Matteo_Fabbri', 11, 811),
  ('AnnaFabbri', 2, 240),
  ('Riccardo_Rizzi', 25, 1841),
  ('AnnaColombo', 10, 455),
  ('Silvia_Esposito', 4, 187),
  ('noemi86', 10, 534),
  ('LupoOro', 16, 971),
  ('Emanuele_Bianco_9583', 1, 35),
  ('Davide_Martinelli', 22, 1156),
  ('Luca_Grassi', 9, 625),
  ('Nicola_Marini', 15, 1136),
  ('Sara_Giuliani', 30, 2137),
  ('Giuseppe_Gatti', 1, 7),
  ('Massimo_Ferri', 45, 2983),
  ('ludovica_g', 20, 1030),
  ('Aurora_Pellegrini', 48, 3088),
  ('Filippo_Pellegrini', 44, 2792),
  ('LorenzoPellegrino', 12, 989),
  ('Marta_Martini', 17, 792),
  ('massimo_b', 12, 502),
  ('Federico_Rizzi', 3, 252),
  ('Arianna_Palumbo', 6, 235),
  ('Silvia_PG', 29, 1731),
  ('ilaria_r', 9, 590),
  ('OrsoViola', 23, 1739),
  ('SamuelePellegrini', 14, 601),
  ('pellegrini_n6', 22, 1671),
  ('Silvia_Rizzi_3112', 6, 259),
  ('Arianna_Ferraro', 10, 377),
  ('Massimo_Giuliani', 15, 838),
  ('Claudio_Serra', 2, 149),
  ('Gabriele_Conti', 2, 137),
  ('GiuliaFabbri', 16, 1031),
  ('Federica_Bianchi', 48, 3042),
  ('Enrico_Gallo', 16, 799),
  ('Lorenzo_DeLuca', 9, 296),
  ('Andrea_DeAngelis', 9, 671),
  ('Marta_Mancini', 6, 16),
  ('Alberto_Marini_6174', 10, 784),
  ('Edoardo_41', 12, 640),
  ('CometaArgento', 13, 586),
  ('Lorenzo_Colombo', 7, 356),
  ('GufoViola', 16, 719),
  ('LaLince16', 32, 2214),
  ('Debora_Gatti_8510', 1, 119),
  ('Silvia_Leone_9640', 4, 187),
  ('Greta_Longo', 7, 166),
  ('Marchino21', 5, 463),
  ('Marco_Russo', 5, 181),
  ('Giacomo_DeSantis', 18, 935),
  ('TigreBlu', 41, 2845),
  ('Ludo_NA', 11, 491),
  ('Greta_DeSantis', 5, 296),
  ('salvatore_g', 6, 216),
  ('massimo_l', 13, 505),
  ('Martina_Fabbri', 10, 358),
  ('Noemi_Monti', 11, 611),
  ('Anna_Romano_1132', 2, 262),
  ('Irene_Rinaldi', 37, 2359),
  ('antonio83', 8, 140),
  ('Nicola_Morelli', 6, 456),
  ('lombardo_g9', 12, 616),
  ('Alice_Pellegrino', 4, 235),
  ('Claudia_Mancini', 23, 1339),
  ('ValentinaGallo', 12, 487),
  ('MassimoBarbieri', 22, 1625),
  ('greco_c3', 7, 149),
  ('Giuseppe_DeSant_1324', 7, 267),
  ('Diego_Fontana', 1, 18),
  ('Mattia_Santoro', 10, 250),
  ('Sofia_DeLuca', 7, 296),
  ('Simona_Conte', 11, 437),
  ('ferrari_s9', 31, 1799),
  ('Massimo_Greco', 18, 999),
  ('Edoardo_Colombo_8266', 7, 289),
  ('Ludovica_Villa_4375', 44, 2955),
  ('Jacopo_GE', 13, 869),
  ('Francesco_Sala', 7, 148),
  ('Elena_Santoro', 19, 1272),
  ('Matteo_Serra', 1, 95),
  ('Riccardo_Testa', 15, 637),
  ('MartinaFontana', 31, 1831),
  ('LaFenice', 33, 2329),
  ('Andrea_Vitale', 4, 184),
  ('Diego_Grassi', 29, 1667),
  ('giuseppe5', 1, 139),
  ('Salvatore_Bruno', 10, 450),
  ('Sofia_Galli_6622', 13, 485),
  ('Toto_PA', 27, 1953),
  ('Andrea09', 7, 90),
  ('Ludovica_Grassi', 10, 806),
  ('FulmineViola', 23, 1502),
  ('LaLince9', 14, 657),
  ('Gabriele60', 9, 279),
  ('Veronica_Testa', 5, 273),
  ('Fra53', 4, 200),
  ('CorvoViola', 19, 1159),
  ('Giulia_DeAngelis', 6, 165),
  ('Gaia_Ricci', 5, 184),
  ('Stefano_Ferri', 18, 950),
  ('Salvatore_Villa', 2, 13),
  ('giacomo_m', 15, 1148),
  ('Pietro_Fabbri', 2, 50),
  ('SaettaArgento', 6, 468),
  ('Greta_Monti_6701', 32, 1960),
  ('Lorenzo_CT', 17, 893),
  ('Giacomo_Silvestri', 9, 690),
  ('GufoArgento', 7, 579),
  ('sofia_r', 21, 1431),
  ('Matteo_Serra_3016', 23, 1608),
  ('Alessandro_Gentile', 5, 270),
  ('christian_f', 1, 52),
  ('IlDrago', 2, 164),
  ('MichelaFerri', 3, 181),
  ('costa_s3', 27, 1601),
  ('Laura_Marino', 17, 806),
  ('LaTempesta68', 7, 504),
  ('Laura_Colombo', 21, 1060),
  ('Emanuele_Gatti', 24, 1467),
  ('Matteo_DeSantis', 5, 54),
  ('Riccardo_Fabbri', 6, 336),
  ('Veronica_Pellegrini', 5, 172),
  ('Camilla_Giordano', 34, 2362),
  ('Simone_Conte', 10, 562),
  ('Silvia_GE', 8, 236),
  ('Noemi_PG', 1, 22),
  ('Michele_Marini', 4, 246),
  ('Anna_Conti', 8, 546),
  ('Francesca_Morelli', 5, 344),
  ('MatteoColombo', 10, 659),
  ('Camilla_Pellegr_7572', 7, 109),
  ('LaCometa62', 4, 56),
  ('Lorenzo_Coppola', 12, 961),
  ('PanteraViola', 5, 232),
  ('ViperaArgento', 11, 440),
  ('Roberto_Sanna_4730', 1, 27),
  ('Valentina_Silvestri', 6, 113),
  ('Giuly90', 3, 273),
  ('Serena_Marino', 1, 200),
  ('Lorenzo_Ferrari', 1, 34),
  ('gaia82', 8, 219),
  ('sala_c3', 6, 531),
  ('Salvatore_Leone', 6, 376),
  ('Christian_Leone', 5, 224),
  ('francesco_v', 4, 164),
  ('Elena_Ferraro', 30, 1912),
  ('francesca_m', 36, 2550),
  ('Nicola_Farina', 1, 7),
  ('FeniceOro', 17, 1022),
  ('Francesca_Lombardi', 2, 155),
  ('Giovanni_Vitale_2479', 21, 1476),
  ('LauraEsposito', 13, 496),
  ('Michele_FI', 2, 86),
  ('Samuele_Caruso', 2, 241),
  ('Giovanni_Ferri', 8, 396),
  ('stefano_g', 17, 1110),
  ('LaFenice94', 4, 102),
  ('pellegrino_c5', 11, 455),
  ('Claudio_TO', 14, 596),
  ('IlOrso58', 6, 481),
  ('Nicola_Pellegrini', 3, 288),
  ('VeronicaSerra', 4, 259),
  ('Anna_Esposito', 26, 1928),
  ('pietro_r', 10, 566),
  ('OrsoArgento', 5, 260),
  ('Nicola_Parisi', 3, 120),
  ('marino_n1', 28, 1595),
  ('GaiaDangelo', 24, 1507),
  ('arianna_r', 14, 817),
  ('Eli_CT', 15, 989),
  ('Stefano_Gatti', 18, 1416),
  ('Simona_Moretti', 4, 156),
  ('Emanuele_Valent_7833', 10, 323),
  ('Filippo_PA', 13, 641),
  ('Marta_Monti_6527', 19, 1423),
  ('Giulia_Amato', 3, 9),
  ('SaettaOro', 19, 1077),
  ('Jacopo72', 47, 3103),
  ('alberto_r', 4, 12),
  ('Andrea_RC', 4, 106),
  ('OmbraArgento', 22, 1466),
  ('michele_d', 30, 1756),
  ('Gabriele_Pellegrino', 13, 773),
  ('Vincenzo_DeSant_5029', 7, 561),
  ('ludovica85', 24, 1693),
  ('Pietro_Bruno', 7, 134),
  ('ferrara_a7', 33, 2231),
  ('daniele_b', 7, 227),
  ('Vincenzo_Ferri', 8, 495),
  ('PanteraArgento', 15, 787),
  ('roberto_m', 4, 339),
  ('Leonardo_Marini_4238', 5, 180),
  ('diego0', 5, 278),
  ('Veronica_Morell_7889', 34, 2190),
  ('Valentina_Russo_1823', 6, 89),
  ('claudia_g', 12, 773),
  ('Chiara_Villa', 31, 2212),
  ('debora_r', 7, 519),
  ('Paola_Bianchi', 26, 1518),
  ('parisi_p8', 6, 79),
  ('Robi_TO', 22, 1368),
  ('lorenzo87', 1, 13),
  ('Silvia_Caruso_2214', 29, 2132),
  ('giuliani_e1', 5, 10),
  ('AlbertoMarchetti', 18, 1348),
  ('Gabriele_Martinelli', 15, 1056),
  ('farina_e8', 11, 774),
  ('Fabio_90', 33, 2079),
  ('SaettaViola', 2, 107),
  ('bruno_d1', 23, 1640),
  ('Debora_Giuliani', 2, 81),
  ('giulia_m', 10, 328),
  ('LaVolpe46', 11, 616),
  ('Simone_Martinelli', 5, 438),
  ('Diego_DeSantis', 13, 521),
  ('grassi_m1', 14, 932),
  ('Francesca_Marchetti', 5, 143),
  ('samuele_s', 5, 19),
  ('Fabio_Coppola', 27, 1542)
) as v(username, level, fama)
where not exists (select 1 from public.profiles p where lower(p.username) = lower(v.username));

-- Most wear a character's drawing as avatar, rarer ones in the higher leagues;
-- the others keep the initial, as a player who never picked one.
update public.ranked_ghosts g
set avatar_definition_id = (
  select d.id from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  where d.is_active and d.art_url is not null and r.rank <= 2 + least(3, g.fama / 700)
  order by md5(g.id::text || d.id::text)
  limit 1
)
where random() < 0.8;

-- A few show the title of an impresa anyone can get.
update public.ranked_ghosts g
set title = (
  select a.title from public.achievements a
  where a.title is not null and a.tier in ('bronze', 'silver')
  order by md5(g.id::text || a.id::text)
  limit 1
)
where random() < 0.2;

-- A player can never take an opponent's name (the same error as a taken one).
create function public.username_not_ghost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.ranked_ghosts g where lower(g.username) = lower(new.username)) then
    raise exception 'username_taken' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger profiles_username_not_ghost
  before insert or update of username on public.profiles
  for each row execute function public.username_not_ghost();

revoke execute on function public.username_not_ghost() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Mandati, leagues and the Fama rule
-- ---------------------------------------------------------------------------

-- The Mandato of a game day: its calendar month ('YYYY-MM'), Europe/Rome.
create function public.ranked_season_of(p_day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_day, 'YYYY-MM')
$$;

create function public.ranked_current_season()
returns text
language sql
stable
set search_path = ''
as $$
  select public.ranked_season_of(public.game_day())
$$;

-- "novembre 2026"
create function public.ranked_season_label(p_season text)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto',
                'settembre', 'ottobre', 'novembre', 'dicembre'])[split_part(p_season, '-', 2)::integer]
         || ' ' || split_part(p_season, '-', 1)
$$;

-- When a Mandato ends: midnight of the first day of the next month, Europe/Rome.
create function public.ranked_season_ends_at(p_season text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((to_date(p_season || '-01', 'YYYY-MM-DD') + interval '1 month')::timestamp)
         at time zone public.config_text('time.daily_reset_time_zone')
$$;

-- The league of a Fama: recluta, vigilante, veterano, asso, leggenda, omega.
create function public.ranked_league_of(p_fama integer)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_fama >= public.config_int('ranked.leagues.omega') then 'omega'
    when p_fama >= public.config_int('ranked.leagues.leggenda') then 'leggenda'
    when p_fama >= public.config_int('ranked.leagues.asso') then 'asso'
    when p_fama >= public.config_int('ranked.leagues.veterano') then 'veterano'
    when p_fama >= public.config_int('ranked.leagues.vigilante') then 'vigilante'
    else 'recluta'
  end
$$;

create function public.ranked_league_name(p_league text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_league
    when 'recluta' then 'Recluta' when 'vigilante' then 'Vigilante' when 'veterano' then 'Veterano'
    when 'asso' then 'Asso' when 'leggenda' then 'Leggenda' when 'omega' then 'O-MEGA'
  end
$$;

-- The Fama at which the league of p_fama starts, and the next one (null at the top).
create function public.ranked_league_start(p_fama integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select public.config_int('ranked.leagues.' || public.ranked_league_of(p_fama))
$$;

create function public.ranked_next_league_at(p_fama integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select min(public.config_int('ranked.leagues.' || l))
  from unnest(array['vigilante', 'veterano', 'asso', 'leggenda', 'omega']) as l
  where public.config_int('ranked.leagues.' || l) > p_fama
$$;

-- What a ranked match moves for one side (SPEC §8.7; packages/game-engine ranked.ts
-- rankedFamaChange is the same rule): 25 for a win, 20 for a loss against the
-- same Fama, a point more or less every 20 of difference, within the limits; a
-- streak bonus from the third win in a row; no loss in Recluta and never under
-- the start of Vigilante or Veterano. `p_streak` counts the wins before this one.
create function public.ranked_fama_change(p_fama integer, p_opponent_fama integer, p_outcome text, p_streak integer)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_shift integer := (p_opponent_fama - p_fama) / public.config_int('ranked.fama_per_point');
  v_loss integer;
  v_floor integer;
begin
  if p_outcome = 'draw' then
    return 0;
  end if;
  if p_outcome = 'win' then
    return least(public.config_int('ranked.win_max'),
                 greatest(public.config_int('ranked.win_min'), public.config_int('ranked.win_points') + v_shift))
           + case when p_streak + 1 >= public.config_int('ranked.streak_from')
                  then public.config_int('ranked.streak_bonus') else 0 end;
  end if;
  if p_fama < public.config_int('ranked.no_loss_below') then
    return 0;
  end if;
  v_loss := least(public.config_int('ranked.loss_max'),
                  greatest(public.config_int('ranked.loss_min'), public.config_int('ranked.loss_points') - v_shift));
  v_floor := case when p_fama < public.config_int('ranked.floors_below') then public.ranked_league_start(p_fama) else 0 end;
  return -least(v_loss, p_fama - v_floor);
end;
$$;

-- The Fama a new Mandato starts from: all of it up to keep_up_to, half of the rest.
create function public.ranked_reset_fama(p_fama integer)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_fama <= public.config_int('ranked.season.keep_up_to') then p_fama
    else public.config_int('ranked.season.keep_up_to')
         + (p_fama - public.config_int('ranked.season.keep_up_to')) * public.config_int('ranked.season.keep_share_percent') / 100
  end
$$;

-- A player's Fama now, with the reset of a new Mandato counted even before it is written.
create function public.ranked_current_fama(p_user uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select case when rp.season = public.ranked_current_season() then rp.fama else public.ranked_reset_fama(rp.fama) end
    from public.ranked_players rp where rp.user_id = p_user
  ), 0)
$$;

-- The player's row, locked, created at 0 or reset for the Mandato in course
-- (the reset is a row of the ledger).
create function public.ranked_player_state(p_user uuid)
returns public.ranked_players
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_season text := public.ranked_current_season();
  v_row public.ranked_players;
  v_fama integer;
begin
  insert into public.ranked_players (user_id, season) values (p_user, v_season) on conflict do nothing;
  select * into v_row from public.ranked_players where user_id = p_user for update;
  if v_row.season <> v_season then
    v_fama := public.ranked_reset_fama(v_row.fama);
    if v_fama <> v_row.fama then
      insert into public.ranked_ledger (user_id, season, reason, delta, fama_after)
      values (p_user, v_season, 'season_reset', v_fama - v_row.fama, v_fama);
    end if;
    update public.ranked_players
    set season = v_season, fama = v_fama, streak = 0, updated_at = now()
    where user_id = p_user
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- The board a format counts on: both grids of Quadrante are one.
create function public.ranked_board_format(p_format text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_format in ('quadrant', 'quadrant_shifting') then 'quadrant' else p_format end
$$;

-- ---------------------------------------------------------------------------
-- The server's opponent
-- ---------------------------------------------------------------------------

-- Whether the server's opponent has chosen in that round (or move) by now.
create function public.ranked_ghost_ready(p_match_id uuid, p_round integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.ranked_ghost_turns t
    where t.match_id = p_match_id and t.round = p_round and t.ready_at <= now()
  )
$$;

-- When the server's opponent will choose in a round just opened: a while after
-- the opening, drawn in the window of the mode (ranked.ghosts.delays.*), now and
-- then in the last seconds instead, always before the deadline. In Quadrante only
-- its own moves; in Allarme Triplo the three threats of a round at once.
create function public.ranked_plan_ghost_turn(p_match_id uuid, p_round integer)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
  v_deadline timestamptz;
  v_kind text;
  v_threats integer;
  v_ready timestamptz;
  v_min integer;
  v_max integer;
begin
  if not exists (select 1 from public.ranked_matches rm where rm.match_id = p_match_id and rm.ghost_id is not null) then
    return;
  end if;
  select * into v_match from public.matches where id = p_match_id;
  select r.deadline_at into v_deadline from public.match_rounds r where r.match_id = p_match_id and r.round = p_round;
  if v_deadline is null then
    return;
  end if;

  if public.is_quadrant(v_match.format) then
    -- Moves alternate from the side that opens; the server's opponent is side b.
    if (case when p_round % 2 = 1 then v_match.quadrant_first
             else case v_match.quadrant_first when 'a' then 'b' else 'a' end end) <> 'b' then
      return;
    end if;
    v_kind := 'quadrant';
  elsif v_match.format = 'triple' then
    v_threats := public.config_int('triple.threats');
    select t.ready_at into v_ready from public.ranked_ghost_turns t
    where t.match_id = p_match_id and (t.round - 1) / v_threats = (p_round - 1) / v_threats
    limit 1;
    v_kind := case when (p_round - 1) / v_threats = 0 then 'triple_first' else 'triple' end;
  else
    v_kind := v_match.format;
  end if;

  if v_ready is null then
    v_min := public.config_int('ranked.ghosts.delays.' || v_kind || '.min');
    v_max := public.config_int('ranked.ghosts.delays.' || v_kind || '.max');
    v_ready := now() + make_interval(secs => v_min + random() * greatest(0, v_max - v_min));
    if random() * 100 < public.config_int('ranked.ghosts.late_chance_percent') then
      v_ready := v_deadline - make_interval(secs => 2 + random() * 4);
    end if;
    v_ready := least(v_ready, v_deadline - interval '1 second');
  end if;
  insert into public.ranked_ghost_turns (match_id, round, ready_at)
  values (p_match_id, p_round, v_ready)
  on conflict do nothing;
end;
$$;

create function public.ranked_ghost_round_opened()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ranked_plan_ghost_turn(new.match_id, new.round);
  return new;
end;
$$;

create trigger match_rounds_ranked_ghost
  after insert on public.match_rounds
  for each row execute function public.ranked_ghost_round_opened();

-- An opponent for a player: one not in a match now, preferably not met in the
-- last day, near the player's Fama and level (with some chance). Its Fama is
-- set near the player's; at the top it stays under the tenth of the Albo, where
-- it would otherwise be missing. A level far from the player's is moved closer.
create function public.ranked_pick_ghost(p_user uuid, p_fama integer, p_level integer)
returns public.ranked_ghosts
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_ghost public.ranked_ghosts;
  v_spread integer := public.config_int('ranked.ghosts.fama_spread');
  v_tenth integer;
  v_fama integer;
  v_level integer;
begin
  select g.* into v_ghost
  from public.ranked_ghosts g
  where not exists (
    select 1 from public.ranked_matches rm join public.matches m on m.id = rm.match_id
    where rm.ghost_id = g.id and m.status = 'active'
  )
  order by
    exists (
      select 1 from public.ranked_matches rm join public.matches m on m.id = rm.match_id
      where rm.ghost_id = g.id and m.player_a = p_user and m.created_at > now() - interval '1 day'
    ),
    abs(g.fama - p_fama) / 150.0 + abs(g.level - p_level) / 4.0 + random() * 3
  limit 1
  for update of g skip locked;
  if v_ghost.id is null then
    return v_ghost;
  end if;

  v_fama := greatest(0, p_fama - v_spread + floor(random() * (2 * v_spread + 1))::integer);
  select r.fama into v_tenth
  from public.ranked_board_rows(public.ranked_current_season(), null) r
  order by r.value desc
  offset public.config_int('ranked.board_size') - 1
  limit 1;
  if v_tenth is not null and v_fama > v_tenth then
    v_fama := greatest(0, v_tenth - 1 - floor(random() * 30)::integer);
  end if;
  v_level := case when abs(v_ghost.level - p_level) > 4
                  then greatest(1, p_level - 3 + floor(random() * 7)::integer)
                  else v_ghost.level end;

  update public.ranked_ghosts set fama = v_fama, level = v_level where id = v_ghost.id
  returning * into v_ghost;
  return v_ghost;
end;
$$;

-- A ranked match against the server's opponent: built exactly as a bot match of
-- that mode (same checks, threats, boss, decks), then made a ranked one with no
-- second player. The opponent's first choice is planned like every other.
create function public.insert_ranked_ghost_match(
  p_format text,
  p_user uuid,
  p_team uuid[],
  p_difficulty text,
  p_bot_definition_ids uuid[],
  p_threat_ids uuid[],
  p_boss_values jsonb
)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_state public.ranked_players;
  v_level integer;
  v_ghost public.ranked_ghosts;
  v_match uuid;
  v_round integer;
begin
  if p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard', 'super_pro') then
    raise exception 'invalid_difficulty';
  end if;
  v_state := public.ranked_player_state(p_user);
  select level into v_level from public.profiles where id = p_user;
  v_ghost := public.ranked_pick_ghost(p_user, v_state.fama, coalesce(v_level, 1));
  if v_ghost.id is null then
    raise exception 'no_ranked_opponent';
  end if;

  v_match := case
    when p_format = 'classic' then public.match_create_bot(p_user, p_difficulty, p_team, p_bot_definition_ids, p_threat_ids)
    when p_format = 'boss' then public.match_create_boss_bot(p_user, p_difficulty, p_team, p_bot_definition_ids, p_boss_values)
    when p_format = 'triple' then public.match_create_triple_bot(p_user, p_difficulty, p_team, p_bot_definition_ids)
    when public.is_quadrant(p_format) then public.match_create_quadrant_bot(p_user, p_difficulty, p_format, p_team, p_bot_definition_ids)
  end;
  if v_match is null then
    raise exception 'invalid_request';
  end if;

  update public.matches set mode = 'ranked', bot_difficulty = null where id = v_match;
  update public.match_teams set last_seen_at = now() where match_id = v_match;
  insert into public.ranked_matches (match_id, ghost_id, ghost_difficulty, fama_a, fama_b)
  values (v_match, v_ghost.id, p_difficulty, v_state.fama, v_ghost.fama);
  for v_round in select r.round from public.match_rounds r where r.match_id = v_match and r.resolved_at is null loop
    perform public.ranked_plan_ghost_turn(v_match, v_round);
  end loop;

  delete from public.match_lobbies where host_id = p_user;
  delete from public.matchmaking_queue where user_id = p_user;
  perform public.notify_player(p_user, 'match_started', v_match);
  return v_match;
end;
$$;

-- A ranked match between two people: both Fama when it starts.
create function public.ranked_match_started(p_match_id uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  update public.matches set mode = 'ranked' where id = p_match_id returning * into v_match;
  insert into public.ranked_matches (match_id, fama_a, fama_b)
  values (p_match_id, (public.ranked_player_state(v_match.player_a)).fama, (public.ranked_player_state(v_match.player_b)).fama);
  return p_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Matchmaking
-- ---------------------------------------------------------------------------

-- What the Edge Function needs to plan the server's opponent: the player's Fama
-- and the characters of the team they are queuing with (only the copies they own).
create function public.ranked_queue_info(p_user uuid, p_team uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'fama', public.ranked_current_fama(p_user),
    'definition_ids', coalesce((
      select jsonb_agg(i.definition_id)
      from public.card_instances i
      where i.id = any (p_team) and i.owner_id = p_user
    ), '[]'::jsonb)
  )
$$;

-- How long a player waits before the server's opponent comes: a moment of the
-- window drawn from the player and the time they entered the queue, so every
-- refresh of the same wait agrees on it.
create function public.ranked_ghost_wait(p_user uuid, p_since timestamptz)
returns interval
language sql
stable
set search_path = ''
as $$
  select make_interval(secs =>
    public.config_int('ranked.matchmaking.ghost_min_seconds')
    + mod(('x' || substr(md5(p_user::text || p_since::text), 1, 7))::bit(28)::integer,
          greatest(1, public.config_int('ranked.matchmaking.ghost_max_seconds')
                      - public.config_int('ranked.matchmaking.ghost_min_seconds') + 1))
  )
$$;

-- People waiting for a ranked match of the same format, nearest Fama first: within
-- fama_range, then fama_range_wide once either waited widen_after_seconds, then anyone.
create function public.ranked_queue_candidates(p_user uuid, p_format text, p_fama integer, p_since timestamptz)
returns setof public.matchmaking_queue
language sql
stable
set search_path = ''
as $$
  select q.* from public.matchmaking_queue q
  where q.user_id <> p_user and q.mode = 'ranked' and q.format = p_format
    and q.refreshed_at > now() - make_interval(secs => public.config_int('matchmaking.queue_stale_seconds'))
    and (
      least(p_since, q.enqueued_at) < now() - make_interval(secs => public.config_int('ranked.matchmaking.any_after_seconds'))
      or abs(q.fama - p_fama) <= case
        when least(p_since, q.enqueued_at) < now() - make_interval(secs => public.config_int('ranked.matchmaking.widen_after_seconds'))
        then public.config_int('ranked.matchmaking.fama_range_wide')
        else public.config_int('ranked.matchmaking.fama_range')
      end
    )
  order by abs(q.fama - p_fama), q.enqueued_at
$$;

-- The candidates of any queue: the ranked one by Fama, the others as before.
create function public.match_queue_candidates(
  p_user uuid, p_mode text, p_format text, p_level integer, p_value integer, p_fama integer, p_since timestamptz
)
returns setof public.matchmaking_queue
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_mode = 'ranked' then
    return query select * from public.ranked_queue_candidates(p_user, p_format, p_fama, p_since);
  else
    return query
      select * from public.queue_candidates(p_user, p_mode, p_level, p_value, p_since) q
      where q.format = p_format
      order by q.enqueued_at;
  end if;
end;
$$;

-- Joining a queue, now also the ranked one (SPEC §8.7): people first; without
-- one, after the player's wait (ranked_ghost_wait) the server's opponent, planned
-- by the Edge Function and sent with every call (p_bot_difficulty and
-- p_bot_definition_ids), as in the Conquest queue.
create or replace function public.match_queue_join(
  p_user uuid,
  p_mode text,
  p_team uuid[],
  p_threat_ids uuid[],
  p_bot_difficulty text default null,
  p_bot_definition_ids uuid[] default null,
  p_format text default 'classic',
  p_boss_values jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opponent public.matchmaking_queue;
  v_definitions uuid[];
  v_opponent_definitions uuid[];
  v_level integer;
  v_value integer;
  v_fama integer := 0;
  v_since timestamptz;
  v_bot_due boolean;
  v_match uuid;
begin
  if p_mode not in ('friendly', 'conquest', 'ranked') or p_format is null
     or p_format not in ('classic', 'boss', 'triple', 'quadrant', 'quadrant_shifting')
     or (p_format <> 'classic' and p_mode = 'conquest') then
    raise exception 'invalid_request';
  end if;

  -- The caller's own checks need no lock.
  v_definitions := case p_mode
    when 'conquest' then public.validate_conquest_team(p_user, p_team)
    else public.validate_team_for(p_user, p_team, p_format)
  end;
  if public.has_active_match(p_user) then
    raise exception 'match_already_active';
  end if;

  select level into v_level from public.profiles where id = p_user;
  v_value := public.team_value(v_definitions);
  if p_mode = 'ranked' then
    v_fama := public.ranked_current_fama(p_user);
  end if;
  select enqueued_at into v_since from public.matchmaking_queue
  where user_id = p_user and mode = p_mode and format = p_format;
  v_since := coalesce(v_since, now());
  v_bot_due := p_bot_difficulty is not null and case p_mode
    when 'conquest' then v_since <= now() - make_interval(secs => public.config_int('matchmaking.conquest_bot_after_seconds'))
    when 'ranked' then v_since <= now() - public.ranked_ghost_wait(p_user, v_since)
    else false
  end;

  if v_bot_due or exists (
    select 1 from public.match_queue_candidates(p_user, p_mode, p_format, v_level, v_value, v_fama, v_since)
  ) then
    -- Serializes pairing: two players can never be paired twice at once.
    perform pg_advisory_xact_lock(hashtext('o-mega.matchmaking'));
    if public.has_active_match(p_user) then
      raise exception 'match_already_active';
    end if;

    for v_opponent in
      select * from public.match_queue_candidates(p_user, p_mode, p_format, v_level, v_value, v_fama, v_since)
    loop
      begin
        v_opponent_definitions := case p_mode
          when 'conquest' then public.check_conquest_team(v_opponent.user_id, v_opponent.card_instance_ids)
          else public.check_team_of(v_opponent.user_id, v_opponent.card_instance_ids, public.team_size_for(p_format))
        end;
        -- The player who waited longer is player A. A ranked match is made as a
        -- friendly one of its format, then marked ranked with both Fama.
        if p_format = 'boss' then
          v_match := public.insert_boss_match(
            'friendly', v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null, p_boss_values
          );
        elsif p_format = 'triple' then
          v_match := public.insert_triple_match(
            'friendly', v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null
          );
        elsif public.is_quadrant(p_format) then
          v_match := public.insert_quadrant_match(
            'friendly', p_format, v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, null
          );
        else
          v_match := public.insert_pvp_match(
            case p_mode when 'ranked' then 'friendly' else p_mode end,
            v_opponent.user_id, v_opponent.card_instance_ids, v_opponent_definitions,
            p_user, p_team, v_definitions, p_threat_ids
          );
        end if;
        if p_mode = 'ranked' then
          perform public.ranked_match_started(v_match);
        end if;
        return v_match;
      exception when others then
        -- That entry is no longer valid (cards gone, already playing): drop it.
        if sqlerrm not in (
          'card_not_owned', 'duplicate_card', 'duplicate_character', 'invalid_team_size', 'match_already_active',
          'card_at_stake', 'conquest_locked', 'daily_loss_limit', 'card_locked', 'not_enough_conquerable', 'same_pair_cooldown'
        ) then
          raise;
        end if;
        delete from public.matchmaking_queue where user_id = v_opponent.user_id;
      end;
    end loop;

    if v_bot_due then
      if p_mode = 'conquest' then
        return public.insert_conquest_bot_match(p_user, p_team, v_definitions, p_bot_difficulty, p_bot_definition_ids, p_threat_ids);
      end if;
      return public.insert_ranked_ghost_match(
        p_format, p_user, p_team, p_bot_difficulty, p_bot_definition_ids, p_threat_ids, p_boss_values
      );
    end if;
  end if;

  -- Rows of the caller's own are locked only now, never while queuing for the lock.
  delete from public.match_lobbies where host_id = p_user;
  insert into public.matchmaking_queue (user_id, mode, card_instance_ids, level, team_value, format, fama)
  values (p_user, p_mode, p_team, v_level, v_value, p_format, v_fama)
  on conflict (user_id) do update
  set mode = excluded.mode, format = excluded.format, card_instance_ids = excluded.card_instance_ids,
      level = excluded.level, team_value = excluded.team_value, fama = excluded.fama, refreshed_at = now(),
      enqueued_at = case when public.matchmaking_queue.mode = excluded.mode and public.matchmaking_queue.format = excluded.format
                         then public.matchmaking_queue.enqueued_at else now() end;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- What the players see: the server's opponent as a person
-- ---------------------------------------------------------------------------

-- Adds the ranked side to a match payload: both Fama, what the match moved (once
-- over) and the leagues. Against the server's opponent, also its name, face and
-- level in `opponent`, always present, and whether it has chosen by now in each
-- open round: exactly what a match between players shows.
create function public.with_ranked(p_payload jsonb, p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_ranked public.ranked_matches;
  v_ghost public.ranked_ghosts;
  v_before integer;
  v_delta integer;
  v_payload jsonb := p_payload;
  v_threats integer := public.config_int('triple.threats');
begin
  select * into v_ranked from public.ranked_matches where match_id = p_match_id;
  if v_ranked.match_id is null then
    return p_payload;
  end if;
  v_before := case p_side when 'a' then v_ranked.fama_a else v_ranked.fama_b end;
  v_delta := case p_side when 'a' then v_ranked.delta_a else v_ranked.delta_b end;
  v_payload := v_payload || jsonb_build_object('ranked', jsonb_build_object(
    'fama', v_before,
    'opponent_fama', case p_side when 'a' then v_ranked.fama_b else v_ranked.fama_a end,
    'delta', v_delta,
    'league', public.ranked_league_of(v_before + coalesce(v_delta, 0)),
    'league_before', public.ranked_league_of(v_before),
    'next_league_at', public.ranked_next_league_at(v_before + coalesce(v_delta, 0)),
    'league_start', public.ranked_league_start(v_before + coalesce(v_delta, 0))
  ));
  if v_ranked.ghost_id is null then
    return v_payload;
  end if;

  select * into v_ghost from public.ranked_ghosts where id = v_ranked.ghost_id;
  v_payload := jsonb_set(v_payload, '{opponent}', jsonb_build_object(
    'username', v_ghost.username,
    'avatar_url', (select d.art_url from public.card_definitions d where d.id = v_ghost.avatar_definition_id),
    'level', v_ghost.level,
    'last_seen_at', now()
  ));
  if jsonb_typeof(v_payload -> 'rounds') = 'array' then
    v_payload := jsonb_set(v_payload, '{rounds}', (
      select coalesce(jsonb_agg(case
        when x.e ? 'opponent_has_chosen' and not coalesce((x.e ->> 'resolved')::boolean, false) then
          jsonb_set(x.e, '{opponent_has_chosen}', to_jsonb(public.ranked_ghost_ready(
            p_match_id,
            -- Allarme Triplo lists rounds, the database counts contests (three per round).
            case when v_payload ->> 'format' = 'triple' then ((x.e ->> 'round')::integer - 1) * v_threats + 1
                 else (x.e ->> 'round')::integer end
          )))
        else x.e end order by x.ord), '[]'::jsonb)
      from jsonb_array_elements(v_payload -> 'rounds') with ordinality as x(e, ord)
    ));
  end if;
  return v_payload;
end;
$$;

alter function public.match_state_payload(uuid, text) rename to match_state_unranked_payload;
revoke execute on function public.match_state_unranked_payload(uuid, text) from service_role;

create function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.with_ranked(public.match_state_unranked_payload(p_match_id, p_side), p_match_id, p_side)
$$;

-- The Edge Function learns the server's opponent here: its difficulty and whether
-- it has chosen in the current round (or move). Null in every other match.
alter function public.match_round_context(uuid, uuid) rename to match_round_unranked_context;
revoke execute on function public.match_round_unranked_context(uuid, uuid) from service_role;

create function public.match_round_context(p_user uuid, p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    public.match_round_unranked_context(p_user, p_match_id),
    '{match,ghost}',
    coalesce((
      select jsonb_build_object(
        'difficulty', rm.ghost_difficulty,
        'ready', public.ranked_ghost_ready(rm.match_id, m.current_round)
      )
      from public.ranked_matches rm
      join public.matches m on m.id = rm.match_id
      where rm.match_id = p_match_id and rm.ghost_id is not null
    ), 'null'::jsonb)
  )
$$;

create or replace function public.match_ping(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches;
  v_side text;
  v_ghost boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id;
  v_side := case when v_match.player_a = v_uid then 'a' when v_match.player_b = v_uid then 'b' end;
  if v_side is null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  if v_match.status = 'active' then
    update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  end if;
  v_ghost := exists (select 1 from public.ranked_matches rm where rm.match_id = p_match_id and rm.ghost_id is not null);

  return jsonb_build_object(
    'status', v_match.status,
    'current_round', v_match.current_round,
    -- Only whether the opponent has chosen, never what.
    'opponent_has_chosen', case
      when v_ghost then public.ranked_ghost_ready(p_match_id, v_match.current_round)
      else exists (
        select 1 from public.pending_plays pp
        where pp.match_id = p_match_id and pp.round = v_match.current_round and pp.side <> v_side
      )
    end,
    -- Null without a pick. True once settled, or once its time is up: reading
    -- the state then settles it.
    'conquest_settled', (
      select c.resolved_at is not null or c.deadline_at < now()
      from public.conquest_claims c where c.match_id = p_match_id
    ),
    'opponent_last_seen_at', case
      when v_ghost then now()
      else (select t.last_seen_at from public.match_teams t where t.match_id = p_match_id and t.side <> v_side)
    end,
    'server_now', now()
  );
end;
$$;

create or replace function public.get_match_opponent_title(p_match_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select g.title
     from public.ranked_matches rm
     join public.ranked_ghosts g on g.id = rm.ghost_id
     join public.matches m on m.id = rm.match_id
     where rm.match_id = p_match_id and m.player_a = auth.uid()),
    (select p.title
     from public.matches m
     join public.profiles p on p.id = case when m.player_a = auth.uid() then m.player_b else m.player_a end
     where m.id = p_match_id and auth.uid() in (m.player_a, m.player_b))
  )
$$;

-- The history names the server's opponent like a person and shows the Fama moved.
alter function public.get_match_history(integer) rename to get_match_unranked_history;
revoke execute on function public.get_match_unranked_history(integer) from authenticated;

create function public.get_match_history(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    case when rm.match_id is null then x.e
    else x.e
      || jsonb_build_object('ranked', jsonb_build_object(
           'delta', case when m.player_a = auth.uid() then rm.delta_a else rm.delta_b end
         ))
      || case when g.id is null then '{}'::jsonb else jsonb_build_object('opponent', g.username) end
    end
    order by x.ord
  ), '[]'::jsonb)
  from jsonb_array_elements(public.get_match_unranked_history(p_limit)) with ordinality as x(e, ord)
  left join public.ranked_matches rm on rm.match_id = (x.e ->> 'id')::uuid
  left join public.matches m on m.id = rm.match_id
  left join public.ranked_ghosts g on g.id = rm.ghost_id
$$;

-- The server's opponent never leaves a match: there is no victory to claim.
create or replace function public.claim_victory(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_side text;
  v_last_seen timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  v_side := case when v_match.player_a = auth.uid() then 'a' when v_match.player_b = auth.uid() then 'b' end;
  if v_side is null or v_match.bot_difficulty is not null then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if v_match.status <> 'active' then
    raise exception 'match_not_active';
  end if;
  if exists (select 1 from public.ranked_matches rm where rm.match_id = p_match_id and rm.ghost_id is not null) then
    raise exception 'opponent_still_connected';
  end if;

  select coalesce(last_seen_at, v_match.created_at) into v_last_seen
  from public.match_teams where match_id = p_match_id and side <> v_side;
  if v_last_seen > now() - make_interval(secs => public.config_int('match.reconnect_grace_seconds')) then
    raise exception 'opponent_still_connected';
  end if;

  update public.match_teams set last_seen_at = now() where match_id = p_match_id and side = v_side;
  perform public.finish_match(p_match_id, v_side, 'forfeit');
  return public.match_state_payload(p_match_id, v_side);
end;
$$;

-- A match left for too long: against a bot or the server's opponent, the player loses.
create or replace function public.close_abandoned_matches(p_user uuid)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  for v_match in
    select m.* from public.matches m
    join public.match_rounds r on r.match_id = m.id and r.round = m.current_round
    where m.status = 'active'
      and (m.player_a = p_user or m.player_b = p_user)
      and r.deadline_at < now() - make_interval(mins => public.config_int('match.abandon_after_minutes'))
    for update of m
  loop
    perform public.finish_match(
      v_match.id,
      case when v_match.bot_difficulty is not null or (v_match.mode = 'ranked' and v_match.player_b is null) then 'b' else 'draw' end,
      'forfeit'
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- The Fama of a finished match
-- ---------------------------------------------------------------------------

-- Written in the transaction that closes the match: for each person, the change
-- of ranked_fama_change against the other side's Fama at the start (0 after
-- `same_opponent_daily` matches with the same person that game day), on the
-- ledger and on the running total. An abandoned match counts: who leaves loses.
-- The server's opponent takes the other side of the change, so the next who
-- meets it finds a believable Fama.
create function public.ranked_record_match(p_match public.matches)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_ranked public.ranked_matches;
  v_side text;
  v_user uuid;
  v_opponent uuid;
  v_outcome text;
  v_state public.ranked_players;
  v_delta integer;
  v_limit integer := public.config_int('ranked.same_opponent_daily');
begin
  if p_match.mode <> 'ranked' or p_match.status <> 'finished' then
    return;
  end if;
  select * into v_ranked from public.ranked_matches where match_id = p_match.id for update;
  if v_ranked.match_id is null or v_ranked.delta_a is not null then
    return;
  end if;

  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then p_match.player_a else p_match.player_b end;
    continue when v_user is null; -- the server's opponent
    v_opponent := case v_side when 'a' then p_match.player_b else p_match.player_a end;
    v_outcome := case when p_match.result = v_side then 'win' when p_match.result = 'draw' then 'draw' else 'loss' end;
    v_state := public.ranked_player_state(v_user);
    v_delta := public.ranked_fama_change(
      v_state.fama,
      case v_side when 'a' then v_ranked.fama_b else v_ranked.fama_a end,
      v_outcome,
      v_state.streak
    );
    if v_opponent is not null and v_limit > 0 and (
      select count(*) from public.ranked_ledger l
      where l.user_id = v_user and l.opponent_id = v_opponent and l.reason = 'match'
        and public.game_day(l.created_at) = public.game_day()
    ) >= v_limit then
      v_delta := 0;
    end if;

    insert into public.ranked_ledger (user_id, season, reason, match_id, format, outcome, opponent_id, delta, fama_after)
    values (v_user, v_state.season, 'match', p_match.id, public.ranked_board_format(p_match.format), v_outcome,
            v_opponent, v_delta, v_state.fama + v_delta);
    update public.ranked_players
    set fama = fama + v_delta,
        best_fama = greatest(best_fama, fama + v_delta),
        wins = wins + (v_outcome = 'win')::integer,
        losses = losses + (v_outcome = 'loss')::integer,
        draws = draws + (v_outcome = 'draw')::integer,
        streak = case when v_outcome = 'win' then streak + 1 else 0 end,
        updated_at = now()
    where user_id = v_user;
    if v_side = 'a' then
      update public.ranked_matches set delta_a = v_delta where match_id = p_match.id;
    else
      update public.ranked_matches set delta_b = v_delta where match_id = p_match.id;
    end if;
  end loop;

  if v_ranked.ghost_id is not null then
    select * into v_ranked from public.ranked_matches where match_id = p_match.id;
    update public.ranked_matches set delta_b = -v_ranked.delta_a where match_id = p_match.id;
    update public.ranked_ghosts
    set fama = greatest(0, fama - v_ranked.delta_a),
        matches = matches + 1,
        level = least(99, level + (random() < 0.15)::integer)
    where id = v_ranked.ghost_id;
  end if;
end;
$$;

create function public.record_match_ranked_fama()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ranked_record_match(new);
  return new;
end;
$$;

create trigger matches_ranked_fama
  after update of status on public.matches
  for each row
  when (old.status = 'active' and new.status = 'finished' and new.mode = 'ranked')
  execute function public.record_match_ranked_fama();

-- Ranked matches have their own board, the Albo: none on the boards of SPEC §8.6.
create or replace function public.leaderboard_record_match(p_match public.matches)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_board text;
  v_day date;
  v_side text;
  v_user uuid;
  v_opponent uuid;
  v_outcome text;
  v_base numeric;
  v_points numeric;
  v_limit integer;
  v_used numeric;
  v_count integer;
begin
  -- Abandoned matches count for nobody, as in events and Imprese; the Story and the
  -- Classificata have their own boards.
  if p_match.status <> 'finished' or p_match.end_reason is distinct from 'completed'
     or p_match.story_mission_id is not null or p_match.mode = 'ranked' then
    return;
  end if;
  v_board := case
    when p_match.mode = 'conquest' then 'conquest'
    when p_match.format in ('quadrant', 'quadrant_shifting') then 'quadrant'
    else p_match.format
  end;
  -- A future format has no board until a migration gives it one.
  if v_board not in ('classic', 'boss', 'triple', 'quadrant', 'conquest') then
    return;
  end if;
  v_day := public.game_day(p_match.finished_at);

  foreach v_side in array array['a', 'b'] loop
    v_user := case v_side when 'a' then p_match.player_a else p_match.player_b end;
    continue when v_user is null; -- a bot
    v_opponent := case v_side when 'a' then p_match.player_b else p_match.player_a end;
    v_outcome := case when p_match.result = v_side then 'win' when p_match.result = 'draw' then 'draw' else 'loss' end;
    v_base := public.config_int(
      'leaderboards.points.' || case when p_match.bot_difficulty is null then 'person' else p_match.bot_difficulty end
    );
    v_points := case v_outcome when 'win' then v_base when 'draw' then v_base / 2 else 0 end;

    if p_match.bot_difficulty is not null then
      -- Bots can be played without end: only so many points a day come from them.
      v_limit := public.config_int('leaderboards.bot_daily_cap');
      if v_limit > 0 and v_points > 0 then
        select coalesce(sum(lp.points), 0) into v_used from public.leaderboard_points lp
        where lp.user_id = v_user and lp.day = v_day and lp.bot_difficulty is not null;
        v_points := greatest(0, least(v_points, v_limit - v_used));
      end if;
    elsif v_opponent is not null then
      -- Two friends playing on and on: only the first matches of the day count.
      v_limit := public.config_int('leaderboards.same_opponent_daily');
      if v_limit > 0 then
        select count(*) into v_count from public.leaderboard_points lp
        where lp.user_id = v_user and lp.opponent_id = v_opponent and lp.day = v_day;
        if v_count >= v_limit then
          v_points := 0;
        end if;
      end if;
    end if;

    insert into public.leaderboard_points
      (match_id, user_id, board, opponent_id, bot_difficulty, outcome, points, day, earned_at)
    values
      (p_match.id, v_user, v_board, v_opponent, p_match.bot_difficulty, v_outcome, v_points, v_day, p_match.finished_at)
    on conflict do nothing;
  end loop;
end;
$$;

-- Imprese that count matches against people count every ranked match, as players see it.
create or replace function public.achievement_match_fits(p_params jsonb, p_match public.matches, p_side text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (not (p_params ? 'format') or case p_params ->> 'format'
            when 'quadrant' then p_match.format in ('quadrant', 'quadrant_shifting')
            else p_match.format = p_params ->> 'format' end)
     and (not (p_params ? 'mode') or p_match.mode = p_params ->> 'mode')
     and (not (p_params ? 'story') or (p_match.story_mission_id is not null) = (p_params ->> 'story')::boolean)
     and (p_params ->> 'opponent' is distinct from 'player' or p_match.player_b is not null or p_match.mode = 'ranked')
     and (p_params ->> 'opponent' is distinct from 'bot' or (p_match.player_b is null and p_match.mode <> 'ranked'))
     and (not (p_params ? 'bot_difficulties') or coalesce(p_params -> 'bot_difficulties' ? p_match.bot_difficulty, false))
     and (not coalesce((p_params ->> 'flawless')::boolean, false)
          or (case p_side when 'a' then p_match.rounds_won_b else p_match.rounds_won_a end) = 0)
$$;

-- ---------------------------------------------------------------------------
-- The Albo dei Reggenti and the Mandati
-- ---------------------------------------------------------------------------

-- The players of a Mandato who played at least one ranked match, with the value
-- the Albo sorts by: their Fama at the end of it (now, for the one in course) or,
-- for one format, the Fama that format gave them in it. reached_at: their last
-- ranked match in it (who got there first stays ahead on a tie).
create function public.ranked_board_rows(p_season text, p_format text)
returns table (user_id uuid, value integer, fama integer, matches integer, wins integer, losses integer, reached_at timestamptz)
language sql
stable
set search_path = ''
as $$
  with played as (
    select l.user_id,
      count(*)::integer as matches,
      (count(*) filter (where l.outcome = 'win'))::integer as wins,
      (count(*) filter (where l.outcome = 'loss'))::integer as losses,
      max(l.created_at) as reached_at,
      sum(l.delta)::integer as gained
    from public.ranked_ledger l
    where l.season = p_season and l.reason = 'match' and (p_format is null or l.format = p_format)
    group by l.user_id
  )
  select p.user_id,
    case when p_format is null then f.fama else p.gained end,
    f.fama, p.matches, p.wins, p.losses, p.reached_at
  from played p
  cross join lateral (
    select coalesce(sum(x.delta), 0)::integer as fama
    from public.ranked_ledger x
    where x.user_id = p.user_id and x.season <= p_season
  ) f
$$;

-- Writes the results of every Mandato that is over and not yet closed: place,
-- final Fama and league; the prize of the league for whoever played at least
-- season.min_matches ranked matches in it; a title for the first three and for
-- Leggenda and O-MEGA. Each player is told with a notification. Called by the
-- Albo and by the player's own ranked view, so the first visit after the end of
-- the month closes it (once: ranked_seasons).
create function public.ranked_close_seasons()
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_current text := public.ranked_current_season();
  v_min integer := public.config_int('ranked.season.min_matches');
  v_season text;
  v_label text;
  v_result public.ranked_season_results;
begin
  for v_season in
    select distinct l.season from public.ranked_ledger l
    where l.reason = 'match' and l.season < v_current
      and not exists (select 1 from public.ranked_seasons s where s.season = l.season)
    order by 1
  loop
    insert into public.ranked_seasons (season) values (v_season) on conflict do nothing;
    continue when not found;
    v_label := public.ranked_season_label(v_season);

    insert into public.ranked_season_results (season, user_id, place, fama, league, matches, wins, coins, packs, title)
    select v_season, r.user_id, r.place, r.fama, public.ranked_league_of(r.fama), r.matches, r.wins,
      case when r.matches >= v_min then public.config_int('ranked.season.rewards.' || public.ranked_league_of(r.fama) || '.coins') else 0 end,
      case when r.matches >= v_min then public.config_int('ranked.season.rewards.' || public.ranked_league_of(r.fama) || '.packs') else 0 end,
      case
        when r.matches < v_min then null
        when r.place <= 3 then r.place || '° Reggente · ' || v_label
        when public.ranked_league_of(r.fama) = 'omega' then 'O-MEGA · ' || v_label
        when public.ranked_league_of(r.fama) = 'leggenda' then 'Leggenda · ' || v_label
      end
    from (
      select b.*, row_number() over (order by b.value desc, b.reached_at, b.user_id)::integer as place
      from public.ranked_board_rows(v_season, null) b
    ) r;

    for v_result in select * from public.ranked_season_results where season = v_season loop
      -- A player without a title shows the new one straight away.
      if v_result.title is not null then
        update public.profiles set title = v_result.title, updated_at = now()
        where id = v_result.user_id and title is null;
      end if;
      perform public.add_player_notification(
        v_result.user_id, 'ranked', 'Mandato concluso!',
        'Mandato di ' || v_label || ': ' || v_result.place || '° posto, '
          || public.ranked_league_name(v_result.league)
          || case when v_result.coins > 0 or v_result.packs > 0 then '. Ritira il premio nell''Albo.' else '.' end,
        jsonb_build_object('season', v_season)
      );
    end loop;
  end loop;
end;
$$;

-- One row of the Albo as the app shows it.
create function public.ranked_board_entry(
  p_place integer, p_user uuid, p_value integer, p_fama integer, p_matches integer, p_wins integer, p_losses integer
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'place', p_place, 'username', pr.username, 'avatar_url', pr.avatar_url, 'title', pr.title,
    'value', p_value, 'fama', p_fama, 'league', public.ranked_league_of(p_fama),
    'matches', p_matches, 'wins', p_wins, 'losses', p_losses, 'is_me', p_user = auth.uid()
  )
  from public.profiles pr where pr.id = p_user
$$;

-- The Albo dei Reggenti of a Mandato (the one in course by default), for all the
-- formats or one: the first ranked.board_size, the caller's own row and how many
-- played. Only people: the server's opponents never appear.
create function public.get_ranked_board(p_season text default null, p_format text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_current text := public.ranked_current_season();
  v_season text := coalesce(p_season, v_current);
  v_size integer := public.config_int('ranked.board_size');
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_season !~ '^\d{4}-(0[1-9]|1[0-2])$' or v_season > v_current then
    raise exception 'ranked_season_invalid';
  end if;
  if p_format is not null and p_format not in ('classic', 'boss', 'triple', 'quadrant') then
    raise exception 'ranked_format_invalid';
  end if;
  perform public.ranked_close_seasons();

  return (
    with ranked as (
      select b.*, row_number() over (order by b.value desc, b.reached_at, b.user_id)::integer as place
      from public.ranked_board_rows(v_season, p_format) b
    ),
    entries as (
      select r.place, r.user_id,
        public.ranked_board_entry(r.place, r.user_id, r.value, r.fama, r.matches, r.wins, r.losses) as entry
      from ranked r
    )
    select jsonb_build_object(
      'season', v_season,
      'label', public.ranked_season_label(v_season),
      'ends_at', public.ranked_season_ends_at(v_season),
      'current', v_season = v_current,
      'format', p_format,
      'players', (select count(*) from entries),
      'top', coalesce((select jsonb_agg(e.entry order by e.place) from entries e where e.place <= v_size), '[]'::jsonb),
      'me', (select e.entry from entries e where e.user_id = v_user)
    )
  );
end;
$$;

-- The podiums of the last Mandati closed (Albo d'oro), the newest first.
create function public.get_ranked_hall()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.ranked_close_seasons();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'season', s.season,
      'label', public.ranked_season_label(s.season),
      'podium', coalesce((
        select jsonb_agg(public.ranked_board_entry(r.place, r.user_id, r.fama, r.fama, r.matches, r.wins, r.matches - r.wins)
                         order by r.place)
        from public.ranked_season_results r
        where r.season = s.season and r.place <= 3
      ), '[]'::jsonb)
    ) order by s.season desc)
    from (select season from public.ranked_seasons order by season desc limit 12) s
  ), '[]'::jsonb);
end;
$$;

-- The caller's Classificata: Fama and league now (with the reset of a new
-- Mandato counted), progress to the next league, the Mandato in course with
-- their place, all-time results, and the prizes of past Mandati still to claim.
create function public.get_my_ranked()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_season text := public.ranked_current_season();
  v_row public.ranked_players;
  v_fama integer;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.ranked_close_seasons();
  select * into v_row from public.ranked_players where user_id = v_user;
  v_fama := public.ranked_current_fama(v_user);

  return jsonb_build_object(
    'season', v_season,
    'season_label', public.ranked_season_label(v_season),
    'season_ends_at', public.ranked_season_ends_at(v_season),
    'fama', v_fama,
    'league', public.ranked_league_of(v_fama),
    'league_start', public.ranked_league_start(v_fama),
    'next_league_at', public.ranked_next_league_at(v_fama),
    'best_fama', coalesce(v_row.best_fama, 0),
    'wins', coalesce(v_row.wins, 0),
    'losses', coalesce(v_row.losses, 0),
    'draws', coalesce(v_row.draws, 0),
    'season_matches', (
      select count(*) from public.ranked_ledger l
      where l.user_id = v_user and l.season = v_season and l.reason = 'match'
    ),
    'min_matches', public.config_int('ranked.season.min_matches'),
    'place', (
      select r.place from (
        select b.user_id, row_number() over (order by b.value desc, b.reached_at, b.user_id)::integer as place
        from public.ranked_board_rows(v_season, null) b
      ) r where r.user_id = v_user
    ),
    'prizes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season', r.season, 'label', public.ranked_season_label(r.season), 'place', r.place,
        'league', r.league, 'fama', r.fama, 'coins', r.coins, 'packs', r.packs, 'title', r.title
      ) order by r.season)
      from public.ranked_season_results r
      where r.user_id = v_user and r.claimed_at is null and (r.coins > 0 or r.packs > 0)
    ), '[]'::jsonb)
  );
end;
$$;

-- Claims the prize of a Mandato: coins on the ledger, packs opened at once.
create function public.claim_ranked_prize(p_season text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result public.ranked_season_results;
  v_openings uuid[] := '{}';
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_result from public.ranked_season_results r
  where r.season = p_season and r.user_id = v_user and (r.coins > 0 or r.packs > 0)
  for update;
  if v_result.id is null then
    raise exception 'ranked_prize_not_found';
  end if;
  if v_result.claimed_at is not null then
    raise exception 'ranked_prize_already_claimed';
  end if;

  if v_result.coins > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    values (v_user, v_result.coins, 'ranked_prize', v_result.id);
  end if;
  for i in 1..v_result.packs loop
    v_openings := v_openings || public.open_pack(v_user, 'ranked');
  end loop;
  update public.ranked_season_results set claimed_at = now(), opening_ids = v_openings where id = v_result.id;

  return jsonb_build_object(
    'coins', v_result.coins,
    'opening_ids', to_jsonb(v_openings),
    'coin_balance', public.coin_balance(v_user)
  );
end;
$$;

-- Titles: a Mandato's title is the player's for good, chosen like the others.
create or replace function public.set_player_title(p_achievement_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_title text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if p_achievement_id is not null then
    select pa.title into v_title from public.player_achievements pa
    where pa.user_id = v_user and pa.achievement_id = p_achievement_id;
    if v_title is null then
      select a.title into v_title from public.leaderboard_awards a
      where a.id = p_achievement_id and a.user_id = v_user and a.expires_at > now();
    end if;
    if v_title is null then
      select r.title into v_title from public.ranked_season_results r
      where r.id = p_achievement_id and r.user_id = v_user;
    end if;
    if v_title is null then
      raise exception 'title_not_available';
    end if;
  end if;
  update public.profiles set title = v_title, updated_at = now() where id = v_user;
  return v_title;
end;
$$;

-- The titles of the Classifiche the player holds: the weekly ones still valid and
-- those of the Mandati (no end: expires_at null).
create or replace function public.get_leaderboard_titles()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  perform public.leaderboard_close_week();
  perform public.ranked_close_seasons();
  return coalesce((
    select jsonb_agg(t.entry order by t.ord, t.at desc)
    from (
      select 0 as ord, a.week::timestamptz as at, jsonb_build_object(
        'id', a.id, 'board', a.board, 'title', a.title, 'week', a.week, 'expires_at', a.expires_at
      ) as entry
      from public.leaderboard_awards a
      where a.user_id = auth.uid() and a.expires_at > now()
      union all
      select 1, public.ranked_season_ends_at(r.season), jsonb_build_object(
        'id', r.id, 'board', 'ranked', 'title', r.title, 'week', null, 'expires_at', null
      )
      from public.ranked_season_results r
      where r.user_id = auth.uid() and r.title is not null
    ) t
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

revoke execute on function public.ranked_season_of(date) from public, anon, authenticated;
revoke execute on function public.ranked_current_season() from public, anon, authenticated;
revoke execute on function public.ranked_season_label(text) from public, anon, authenticated;
revoke execute on function public.ranked_season_ends_at(text) from public, anon, authenticated;
revoke execute on function public.ranked_league_of(integer) from public, anon, authenticated;
revoke execute on function public.ranked_league_name(text) from public, anon, authenticated;
revoke execute on function public.ranked_league_start(integer) from public, anon, authenticated;
revoke execute on function public.ranked_next_league_at(integer) from public, anon, authenticated;
revoke execute on function public.ranked_fama_change(integer, integer, text, integer) from public, anon, authenticated;
revoke execute on function public.ranked_reset_fama(integer) from public, anon, authenticated;
revoke execute on function public.ranked_current_fama(uuid) from public, anon, authenticated;
revoke execute on function public.ranked_player_state(uuid) from public, anon, authenticated;
revoke execute on function public.ranked_board_format(text) from public, anon, authenticated;
revoke execute on function public.ranked_ghost_ready(uuid, integer) from public, anon, authenticated;
revoke execute on function public.ranked_plan_ghost_turn(uuid, integer) from public, anon, authenticated;
revoke execute on function public.ranked_ghost_round_opened() from public, anon, authenticated;
revoke execute on function public.ranked_pick_ghost(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.insert_ranked_ghost_match(text, uuid, uuid[], text, uuid[], uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public.ranked_match_started(uuid) from public, anon, authenticated;
revoke execute on function public.ranked_queue_info(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.ranked_ghost_wait(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.ranked_queue_candidates(uuid, text, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.match_queue_candidates(uuid, text, text, integer, integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.with_ranked(jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.ranked_record_match(public.matches) from public, anon, authenticated;
revoke execute on function public.record_match_ranked_fama() from public, anon, authenticated;
revoke execute on function public.ranked_board_rows(text, text) from public, anon, authenticated;
revoke execute on function public.ranked_close_seasons() from public, anon, authenticated;
revoke execute on function public.ranked_board_entry(integer, uuid, integer, integer, integer, integer, integer) from public, anon, authenticated;

grant execute on function public.ranked_queue_info(uuid, uuid[]) to service_role;

revoke execute on function public.match_state_payload(uuid, text) from public, anon, authenticated;
grant execute on function public.match_state_payload(uuid, text) to service_role;
revoke execute on function public.match_round_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.match_round_context(uuid, uuid) to service_role;
revoke execute on function public.get_match_history(integer) from public, anon;
grant execute on function public.get_match_history(integer) to authenticated;

revoke execute on function public.get_ranked_board(text, text) from public, anon;
revoke execute on function public.get_ranked_hall() from public, anon;
revoke execute on function public.get_my_ranked() from public, anon;
revoke execute on function public.claim_ranked_prize(text) from public, anon;
grant execute on function public.get_ranked_board(text, text) to authenticated;
grant execute on function public.get_ranked_hall() to authenticated;
grant execute on function public.get_my_ranked() to authenticated;
grant execute on function public.claim_ranked_prize(text) to authenticated;
