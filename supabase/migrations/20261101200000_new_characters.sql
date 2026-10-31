-- Twenty new characters of Nuova Megara (docs/WORLD.md), with the same rarity
-- proportions, ability budgets and power tiers as the first sixty.
--
-- Four of them are unlocked by level instead of being found in packs: every
-- player receives one copy when reaching the level. That copy is bound to the
-- account like a starter card, so it can be neither conquered nor converted.
-- Players already at that level receive it now.

alter table public.card_definitions
  add column unlock_level integer check (unlock_level >= 2);

alter table public.card_instances drop constraint card_instances_acquired_via_check;
alter table public.card_instances add constraint card_instances_acquired_via_check
  check (acquired_via in ('starter', 'pack', 'conquest', 'trade', 'level_unlock'));

alter table public.card_transfers drop constraint card_transfers_reason_check;
alter table public.card_transfers add constraint card_transfers_reason_check
  check (reason in ('starter', 'pack', 'conquest', 'trade', 'conversion', 'level_unlock'));

insert into public.card_definitions (code, name, faction, rarity_code, stats, power_code, power_params, flavor, art_url, unlock_level) values
  ('P061', 'Nico Icaro', 'heroes', 'delta',
   '{"FOR":3,"VEL":8,"RES":1,"INT":5,"VOL":7,"PER":5,"ENE":3,"MAG":2,"PSI":2,"COM":6,"TEC":7,"FUR":5}',
   null, '{}', 'Vola benissimo. È l''atterraggio che deve ancora imparare.', '/cards/P061.webp', 3),
  ('P062', 'Gina Razzo', 'heroes', 'delta',
   '{"FOR":4,"VEL":10,"RES":4,"INT":3,"VOL":6,"PER":0,"ENE":5,"MAG":2,"PSI":2,"COM":6,"TEC":9,"FUR":3}',
   null, '{}', 'Parte in un secondo. Per fermarsi, chiede a un muro.', '/cards/P062.webp', null),
  ('P063', 'Tom Magnete', 'heroes', 'delta',
   '{"FOR":7,"VEL":3,"RES":5,"INT":4,"VOL":5,"PER":1,"ENE":8,"MAG":3,"PSI":3,"COM":5,"TEC":6,"FUR":4}',
   null, '{}', 'Se ti mancano le chiavi, guarda sulla sua giacca.', '/cards/P063.webp', null),
  ('P064', 'Bibi Gomma', 'heroes', 'delta',
   '{"FOR":3,"VEL":0,"RES":10,"INT":4,"VOL":6,"PER":4,"ENE":2,"MAG":3,"PSI":3,"COM":6,"TEC":4,"FUR":9}',
   null, '{}', 'Il braccio arriva subito. Il resto, con calma.', '/cards/P064.webp', null),
  ('P065', 'Vito Acido', 'villains', 'delta',
   '{"FOR":5,"VEL":4,"RES":6,"INT":3,"VOL":4,"PER":3,"ENE":8,"MAG":5,"PSI":2,"COM":7,"TEC":1,"FUR":6}',
   null, '{}', 'Ti scioglie la serratura. Poi anche i guanti.', '/cards/P065.webp', null),
  ('P066', 'Ruby Rasoio', 'villains', 'delta',
   '{"FOR":4,"VEL":7,"RES":0,"INT":3,"VOL":5,"PER":5,"ENE":2,"MAG":1,"PSI":2,"COM":10,"TEC":6,"FUR":9}',
   null, '{}', 'Si affila le lame da sola. Si vede dai cerotti.', '/cards/P066.webp', null),
  ('P067', 'Zeno Sciame', 'villains', 'delta',
   '{"FOR":2,"VEL":4,"RES":3,"INT":7,"VOL":1,"PER":6,"ENE":5,"MAG":3,"PSI":7,"COM":3,"TEC":8,"FUR":5}',
   null, '{}', 'Lo sciame gli obbedisce. Lui dorme con la luce accesa.', '/cards/P067.webp', null),
  ('P068', 'Mara Nebbia', 'neutrals', 'delta',
   '{"FOR":1,"VEL":6,"RES":5,"INT":4,"VOL":4,"PER":5,"ENE":3,"MAG":7,"PSI":5,"COM":2,"TEC":4,"FUR":8}',
   null, '{}', 'Sparisce in un attimo. Dove ricompare, lo scopre anche lei.', '/cards/P068.webp', 5),

  ('P069', 'Aurora Kane', 'heroes', 'gamma',
   '{"FOR":3,"VEL":5,"RES":4,"INT":5,"VOL":6,"PER":8,"ENE":9,"MAG":3,"PSI":3,"COM":3,"TEC":4,"FUR":1}',
   'ability_bonus', '{"ability":"ENE","bonus":2}', 'Di notte è un faro. A mezzogiorno, una lampadina.', '/cards/P069.webp', null),
  ('P070', 'Falco Neri', 'heroes', 'gamma',
   '{"FOR":4,"VEL":8,"RES":3,"INT":5,"VOL":5,"PER":9,"ENE":2,"MAG":2,"PSI":3,"COM":1,"TEC":6,"FUR":6}',
   'ability_bonus', '{"ability":"PER","bonus":2}', 'Ti legge la targa da un chilometro. Il menù, no.', '/cards/P070.webp', null),
  ('P071', 'Mr. Cenere', 'villains', 'gamma',
   '{"FOR":4,"VEL":5,"RES":2,"INT":4,"VOL":6,"PER":4,"ENE":7,"MAG":6,"PSI":4,"COM":4,"TEC":3,"FUR":5}',
   'ability_bonus', '{"ability":"ENE","bonus":2}', 'Brucia tutto ciò che tocca. Per questo non stringe mani.', '/cards/P071.webp', null),
  ('P072', 'Sirena Nera', 'villains', 'gamma',
   '{"FOR":2,"VEL":5,"RES":1,"INT":6,"VOL":5,"PER":6,"ENE":3,"MAG":4,"PSI":9,"COM":2,"TEC":3,"FUR":8}',
   'ability_bonus', '{"ability":"PSI","bonus":2}', 'Una parola e fai tutto. Due, e perde la voce.', '/cards/P072.webp', null),
  ('P073', 'Vic Cromo', 'neutrals', 'gamma',
   '{"FOR":6,"VEL":5,"RES":5,"INT":3,"VOL":5,"PER":5,"ENE":3,"MAG":2,"PSI":2,"COM":7,"TEC":6,"FUR":5}',
   'ability_bonus', '{"ability":"COM","bonus":2}', 'Il braccio è cromato. Le rate al Banco, in ritardo.', '/cards/P073.webp', null),

  ('P074', 'Cap. Zefiro', 'heroes', 'beta',
   '{"FOR":3,"VEL":10,"RES":3,"INT":3,"VOL":1,"PER":6,"ENE":9,"MAG":3,"PSI":2,"COM":6,"TEC":2,"FUR":5}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Arriva col vento. Riparte prima del grazie.', '/cards/P074.webp', 7),
  ('P075', 'Ercole Neo', 'heroes', 'beta',
   '{"FOR":10,"VEL":3,"RES":6,"INT":5,"VOL":6,"PER":2,"ENE":1,"MAG":1,"PSI":2,"COM":7,"TEC":9,"FUR":1}',
   'level_bonus', '{"min_level":1,"max_level":2,"bonus":2}', 'Solleva un autobus. Con la batteria scarica, nemmeno il caffè.', '/cards/P075.webp', null),
  ('P076', 'Dr. Caos', 'villains', 'beta',
   '{"FOR":2,"VEL":4,"RES":3,"INT":7,"VOL":6,"PER":1,"ENE":6,"MAG":5,"PSI":4,"COM":3,"TEC":7,"FUR":5}',
   'family_bonus', '{"family":"mind","min_count":2,"bonus":2}', 'Ha previsto ogni imprevisto. Tranne quello.', '/cards/P076.webp', null),
  ('P077', 'Lord Kraken', 'villains', 'beta',
   '{"FOR":7,"VEL":1,"RES":7,"INT":5,"VOL":5,"PER":3,"ENE":6,"MAG":3,"PSI":2,"COM":6,"TEC":5,"FUR":3}',
   'family_bonus', '{"family":"body","min_count":2,"bonus":2}', 'In porto fa tremare tutti. Sulle scale, chiede aiuto.', '/cards/P077.webp', null),

  ('P078', 'Stella Nova', 'heroes', 'alfa',
   '{"FOR":9,"VEL":10,"RES":1,"INT":3,"VOL":5,"PER":3,"ENE":10,"MAG":2,"PSI":2,"COM":4,"TEC":1,"FUR":2}',
   'comeback', '{"bonus":2}', 'Brilla come una stella. Anche lei, prima o poi, si spegne.', '/cards/P078.webp', 10),
  ('P079', 'Lady Medusa', 'villains', 'alfa',
   '{"FOR":4,"VEL":1,"RES":4,"INT":3,"VOL":10,"PER":3,"ENE":2,"MAG":10,"PSI":9,"COM":3,"TEC":1,"FUR":2}',
   'underdog', '{"bonus":2}', 'Ti ferma con uno sguardo. Da anni evita gli specchi.', '/cards/P079.webp', null),

  ('P080', 'Re Tifeo', 'villains', 'omega',
   '{"FOR":10,"VEL":0,"RES":10,"INT":2,"VOL":6,"PER":3,"ENE":4,"MAG":10,"PSI":2,"COM":2,"TEC":1,"FUR":1}',
   'underdog', '{"bonus":3}', 'Sta sotto il vulcano da tremila anni. Ogni tanto si gira nel sonno.', '/cards/P080.webp', null);

-- The album shows how to get a level card. New columns go last in a replaced view.
create or replace view public.card_catalog
with (security_invoker = true)
as
select
  d.id,
  d.code,
  d.name,
  d.faction,
  d.flavor,
  d.stats,
  d.art_url,
  r.code as rarity_code,
  r.name as rarity_name,
  r.rank as rarity_rank,
  r.color as rarity_color,
  r.duplicate_coin_value,
  p.name as power_name,
  public.power_text(d.power_code, d.power_params) as power_text,
  d.unlock_level
from public.card_definitions d
join public.rarity_definitions r on r.code = d.rarity_code
left join public.power_definitions p on p.code = d.power_code
where d.is_active;

-- Level cards never come from packs nor from the starter set.
create or replace function public.draw_pack_definitions(p_count integer, p_guaranteed_min_rank integer)
returns uuid[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := '{}';
  v_ranks integer[] := '{}';
  v_rank integer;
  v_definition uuid;
begin
  for slot in 1..p_count loop
    if slot = p_count and not (p_guaranteed_min_rank <= any (v_ranks)) then
      v_rank := public.draw_rarity_rank(p_guaranteed_min_rank);
    else
      v_rank := public.draw_rarity_rank(1);
    end if;

    select d.id into v_definition
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and d.unlock_level is null and r.rank = v_rank
    order by random()
    limit 1;

    v_definitions := v_definitions || v_definition;
    v_ranks := v_ranks || v_rank;
  end loop;
  return v_definitions;
end;
$$;

create or replace function public.grant_starter_set(p_user uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_size integer := public.config_int('conquest.starter_set_size');
  v_max_rank integer := public.config_int('conquest.starter_set_max_rarity_rank');
  v_granted integer;
begin
  with picked as (
    select d.id
    from public.card_definitions d
    join public.rarity_definitions r on r.code = d.rarity_code
    where d.is_active and d.unlock_level is null and r.rank <= v_max_rank
    order by random()
    limit v_size
  ), created as (
    insert into public.card_instances (definition_id, owner_id, acquired_via, is_starter)
    select picked.id, p_user, 'starter', true from picked
    returning id
  ), logged as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    select created.id, null, p_user, 'starter' from created
    returning 1
  )
  select count(*) into v_granted from logged;

  if v_granted < v_size then
    raise exception 'starter pool too small: % of % cards available', v_granted, v_size;
  end if;
  return v_granted;
end;
$$;

create table public.level_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  definition_id uuid not null references public.card_definitions (id),
  instance_id uuid not null references public.card_instances (id) on delete cascade,
  -- The match that reached the level; null for cards granted retroactively.
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, definition_id)
);

create index level_unlocks_definition_id_idx on public.level_unlocks (definition_id);
create index level_unlocks_instance_id_idx on public.level_unlocks (instance_id);
create index level_unlocks_match_id_idx on public.level_unlocks (match_id);

alter table public.level_unlocks enable row level security;
revoke all on table public.level_unlocks from anon, authenticated;
grant select on table public.level_unlocks to authenticated;
create policy "Players read their own level unlocks"
  on public.level_unlocks for select to authenticated
  using (user_id = (select auth.uid()));

-- Grants every level card the player has reached and not received yet. The
-- caller holds the lock on the player's profile row (finish_match has just
-- updated it), so two matches cannot grant the same card twice.
create function public.grant_level_unlocks(p_user uuid, p_match_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  with due as (
    select d.id as definition_id, gen_random_uuid() as instance_id
    from public.card_definitions d
    join public.profiles p on p.id = p_user
    where d.is_active
      and d.unlock_level <= p.level
      and not exists (
        select 1 from public.level_unlocks u where u.user_id = p_user and u.definition_id = d.id
      )
  ), created as (
    insert into public.card_instances (id, definition_id, owner_id, acquired_via, is_starter)
    select instance_id, definition_id, p_user, 'level_unlock', true from due
  ), logged as (
    insert into public.card_transfers (instance_id, from_user, to_user, reason, match_id)
    select instance_id, null, p_user, 'level_unlock', p_match_id from due
  )
  insert into public.level_unlocks (user_id, definition_id, instance_id, match_id)
  select p_user, definition_id, instance_id, p_match_id from due
$$;

revoke execute on function public.grant_level_unlocks(uuid, uuid) from public, anon, authenticated;

-- finish_match already calls this after every match: levels now pay coins and cards.
create or replace function public.grant_level_rewards(p_user uuid, p_match_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  with granted as (
    insert into public.level_rewards (user_id, level, coins, match_id)
    select p_user, l.level,
           public.config_int('progression.level_reward_base') + public.config_int('progression.level_reward_per_level') * l.level,
           p_match_id
    from public.profiles p
    cross join lateral generate_series(2, p.level) as l(level)
    where p.id = p_user
    on conflict (user_id, level) do nothing
    returning coins
  )
  insert into public.coin_ledger (user_id, amount, reason, ref_id)
  select p_user, coins, 'level_reward', p_match_id from granted;

  select public.grant_level_unlocks(p_user, p_match_id);
$$;

select public.grant_level_unlocks(id, null) from public.profiles;

create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select * from public.matches where id = p_match_id
  ), mine as (
    select * from public.match_teams where match_id = p_match_id and side = p_side
  ), theirs as (
    select * from public.match_teams where match_id = p_match_id and side <> p_side
  )
  select jsonb_build_object(
    'id', m.id,
    'mode', m.mode,
    'bot_difficulty', m.bot_difficulty,
    'status', m.status,
    'my_side', p_side,
    'current_round', m.current_round,
    'threat_levels', to_jsonb(m.threat_levels),
    'rounds_won', jsonb_build_object(
      'me', case p_side when 'a' then m.rounds_won_a else m.rounds_won_b end,
      'opponent', case p_side when 'a' then m.rounds_won_b else m.rounds_won_a end
    ),
    'total_score', jsonb_build_object(
      'me', case p_side when 'a' then m.total_score_a else m.total_score_b end,
      'opponent', case p_side when 'a' then m.total_score_b else m.total_score_a end
    ),
    'result', case when m.result is null then null when m.result = 'draw' then 'draw'
                   when m.result = p_side then 'win' else 'loss' end,
    'end_reason', m.end_reason,
    'reward_coins', case p_side when 'a' then m.reward_coins_a else m.reward_coins_b end,
    'level_rewards', coalesce((
      select jsonb_agg(jsonb_build_object('level', lr.level, 'coins', lr.coins) order by lr.level)
      from public.level_rewards lr
      where lr.match_id = p_match_id and lr.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'level_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('name', d.name, 'level', d.unlock_level) order by d.unlock_level)
      from public.level_unlocks lu
      join public.card_definitions d on d.id = lu.definition_id
      where lu.match_id = p_match_id and lu.user_id = (select user_id from mine)
    ), '[]'::jsonb),
    'server_now', now(),
    'conquest', public.conquest_payload(p_match_id, p_side),
    'opponent', (
      select jsonb_build_object(
        'username', pr.username, 'avatar_url', pr.avatar_url, 'level', pr.level,
        'last_seen_at', theirs.last_seen_at
      )
      from theirs join public.profiles pr on pr.id = theirs.user_id
    ),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id) || jsonb_build_object(
        'instance_id', u.instance_id,
        'played_round', (
          select rp.round from public.round_plays rp
          where rp.match_id = p_match_id and rp.side = p_side and rp.card_instance_id = u.instance_id
        )
      ) order by u.ord)
      from mine, unnest(mine.card_instance_ids, mine.definition_ids) with ordinality as u(instance_id, definition_id, ord)
    ),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'round', mr.round,
        'level', t.level,
        'threat', jsonb_build_object('name', t.name, 'abilities', to_jsonb(t.required_abilities), 'flavor', t.flavor),
        'deadline_at', mr.deadline_at,
        'resolved', mr.resolved_at is not null,
        'winner', case
          when mr.resolved_at is null then null
          when mr.winner_side = 'none' then 'none'
          when mr.winner_side = p_side then 'me'
          else 'opponent' end,
        'my_pending_instance_id', (
          select pp.card_instance_id from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side = p_side
        ),
        -- Only whether the opponent has chosen, never what.
        'opponent_has_chosen', exists (
          select 1 from public.pending_plays pp
          where pp.match_id = p_match_id and pp.round = mr.round and pp.side <> p_side
        ),
        'my_play', (
          select jsonb_build_object(
            'instance_id', rp.card_instance_id, 'definition_id', rp.definition_id,
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side = p_side
        ),
        -- The opponent's play only once the round is resolved.
        'opponent_play', case when mr.resolved_at is null then null else (
          select public.card_payload(rp.definition_id) || jsonb_build_object(
            'base', rp.base_score, 'bonus', rp.bonus, 'score', rp.score,
            'highest', rp.highest_value, 'auto_played', rp.auto_played
          )
          from public.round_plays rp
          where rp.match_id = p_match_id and rp.round = mr.round and rp.side <> p_side
        ) end
      ) order by mr.round)
      from public.match_rounds mr
      join public.threat_definitions t on t.id = mr.threat_id
      where mr.match_id = p_match_id
    ), '[]'::jsonb)
  )
  from m
$$;
