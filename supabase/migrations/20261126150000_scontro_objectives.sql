-- Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 6c: objectives of the day for the Scontro,
-- in the catalog admins already keep (/gestione-obiettivi, admin-only). Four metrics: battles against
-- the computer finished (combat_played) and won (combat_won), challenges finished (arena_played) and
-- won (arena_won); a battle given up counts for nothing. The game counts them; admins choose which
-- objectives to put in the catalog and with what prize. An objective of the Scontro is drawn only
-- for a player who can play it: the mode open, enough characters with their kit unlocked, and for the
-- challenges a defence that can fight. The defences held are not a metric: they depend on others.

alter table public.daily_objective_definitions drop constraint daily_objective_definitions_metric_check;
alter table public.daily_objective_definitions add constraint daily_objective_definitions_metric_check check (metric in (
  'matches_played', 'matches_won', 'threats_won', 'cards_played',
  'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
  'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars',
  'raid_played', 'raid_won', 'raid_damage', 'raid_stars',
  'combat_played', 'combat_won', 'arena_played', 'arena_won'
));

-- Same as in 20261123220000_caccia_grossa_stage_three.sql, with the metrics of the Scontro.
create or replace function public.admin_save_daily_objective(
  p_code text,
  p_title text,
  p_difficulty text,
  p_metric text,
  p_params jsonb,
  p_target integer,
  p_coins integer,
  p_packs integer,
  p_random_variants jsonb default null,
  p_card_codes text[] default null,
  p_shards integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_params jsonb := coalesce(p_params, '{}'::jsonb);
  v_random jsonb;
  v_cards record;
  v_definition_ids uuid[] := '{}';
  v_variant_ids uuid[] := '{}';
  v_card_count integer;
  v_shards integer;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if char_length(v_title) not between 3 and 80
     or p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard')
     or p_metric is null or p_metric not in (
       'matches_played', 'matches_won', 'threats_won', 'cards_played',
       'emergency_passed', 'packs_opened', 'duplicates_converted', 'cards_conquered',
       'variants_found', 'variant_wins', 'coop_played', 'coop_won', 'coop_threats', 'coop_stars',
       'raid_played', 'raid_won', 'raid_damage', 'raid_stars',
       'combat_played', 'combat_won', 'arena_played', 'arena_won')
     or not public.daily_objective_params_valid(p_metric, v_params)
     or p_target is null or p_target not between 1 and 100
     or (p_coins is not null and p_coins not between 0 and 100000)
     or p_packs is null or p_packs not between 0 and 5
     or (p_shards is not null and not public.shard_reward_valid(p_shards)) then
    raise exception 'invalid_objective';
  end if;
  v_shards := coalesce(p_shards, (select d.shards from public.daily_objective_definitions d where d.code = p_code), 0);
  v_random := public.random_variants_spec(p_random_variants);
  if p_card_codes is not null then
    if cardinality(p_card_codes) > 5 then
      raise exception 'invalid_objective';
    end if;
    begin
      select * into v_cards from public.event_reward_cards(p_card_codes);
    exception when raise_exception then
      raise exception 'invalid_objective';
    end;
    v_definition_ids := v_cards.definition_ids;
    v_variant_ids := v_cards.variant_ids;
    v_card_count := cardinality(v_definition_ids);
  else
    v_card_count := coalesce((
      select cardinality(d.card_definition_ids) from public.daily_objective_definitions d where d.code = p_code), 0);
  end if;

  -- No reward at all.
  if p_coins = 0 and p_packs = 0 and v_random is null and v_card_count = 0 and v_shards = 0 then
    raise exception 'invalid_objective';
  end if;

  if p_code is null then
    insert into public.daily_objective_definitions (code, title, difficulty, metric, params, target, coins, packs,
                                                    random_variants, card_definition_ids, card_variant_ids, shards)
    values ('obj_' || substr(md5(gen_random_uuid()::text), 1, 10), v_title, p_difficulty, p_metric, v_params,
            p_target, p_coins, p_packs, v_random, v_definition_ids, v_variant_ids, v_shards);
  else
    update public.daily_objective_definitions d
    set title = v_title, difficulty = p_difficulty, metric = p_metric, params = v_params,
        target = p_target, coins = p_coins, packs = p_packs, random_variants = v_random, shards = v_shards,
        card_definition_ids = case when p_card_codes is null then d.card_definition_ids else v_definition_ids end,
        card_variant_ids = case when p_card_codes is null then d.card_variant_ids else v_variant_ids end
    where d.code = p_code;
    if not found then
      raise exception 'objective_not_found';
    end if;
  end if;

  perform public.check_daily_objectives_enough();
  return public.admin_daily_objectives_payload();
end;
$$;

-- Whether a player can play an objective's metric today: every metric but the Scontro's; those only
-- with the mode open and combat.team_size characters with their kit unlocked (as get_combat_unlocks
-- counts them), and the challenges' only with a defence that can fight.
create function public.combat_objective_available(p_user uuid, p_metric text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_metric not in ('combat_played', 'combat_won', 'arena_played', 'arena_won')
    or (public.mode_open('combat')
        and (p_metric not in ('arena_played', 'arena_won') or public.combat_defense_ok(p_user))
        and (
          with counts as (select * from public.combat_unlock_counts(p_user))
          select count(distinct i.definition_id)
          from public.card_instances i
          join public.combat_kits k on k.definition_id = i.definition_id
          join public.card_definitions d on d.id = i.definition_id and d.is_active
          left join counts c on c.definition_id = i.definition_id
          where i.owner_id = p_user
            and (public.config_text('combat_unlock.mode') = 'always'
                 or coalesce(case when public.config_text('combat_unlock.basis') = 'played' then c.played else c.wins end, 0)
                    >= public.config_int('combat_unlock.count'))
        ) >= public.config_int('combat.team_size'))
$$;
revoke execute on function public.combat_objective_available(uuid, text) from public, anon, authenticated;

-- Same as in 20261119200000_shard_rewards.sql, drawing an objective of the Scontro only for a player
-- who can play it (combat_objective_available).
create or replace function public.draw_daily_objective(p_user uuid, p_day date, p_difficulty text, p_slot integer)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_def public.daily_objective_definitions;
  v_id uuid;
begin
  select d.* into v_def
  from public.daily_objective_definitions d
  where d.is_active and d.difficulty = p_difficulty
    and public.combat_objective_available(p_user, d.metric)
    and not exists (
      select 1 from public.daily_objectives o
      where o.user_id = p_user and o.day = p_day
        and (o.definition_code = d.code or (o.replaced_at is null and o.metric = d.metric and o.params = d.params))
    )
  order by random()
  limit 1;
  if v_def.code is null then
    return null;
  end if;

  insert into public.daily_objectives (
    user_id, day, slot, definition_code, difficulty, title, metric, params, target,
    coins, packs, card_definition_ids, card_variant_ids, random_variants, shards
  ) values (
    p_user, p_day, p_slot, v_def.code, v_def.difficulty, v_def.title, v_def.metric, v_def.params, v_def.target,
    coalesce(v_def.coins, public.config_int('daily_objectives.reward_coins.' || v_def.difficulty)),
    v_def.packs, v_def.card_definition_ids, v_def.card_variant_ids, v_def.random_variants, v_def.shards
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- A battle that ends (not given up): the battles against the computer and the challenges, finished
-- and won.
create function public.advance_combat_daily_objectives()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'active' and new.status in ('won', 'lost', 'draw') then
    perform public.advance_daily_objectives(new.user_id, case when new.kind = 'arena' then 'arena_played' else 'combat_played' end, 1);
    if new.status = 'won' then
      perform public.advance_daily_objectives(new.user_id, case when new.kind = 'arena' then 'arena_won' else 'combat_won' end, 1);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.advance_combat_daily_objectives() from public, anon, authenticated;

create trigger combat_battles_daily_objectives
  after update of status on public.combat_battles
  for each row execute function public.advance_combat_daily_objectives();
