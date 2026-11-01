-- Artwork variants: the same character with a different, rarer drawing. A
-- variant changes nothing but the art: name, values, power and rarity stay the
-- card's own. It is a property of one card instance, found only in packs, and
-- stays with that instance when it changes hands in Conquest.

insert into public.game_config (key, value, description) values
  ('packs.variant_chance_percent', '10', 'Chance that a drawn card with a variant comes with that art');

create table public.card_variants (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.card_definitions (id) on delete cascade,
  style text not null,
  style_name text not null,
  art_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (definition_id, style),
  -- Target of the composite key below.
  unique (id, definition_id)
);

alter table public.card_variants enable row level security;
revoke all on table public.card_variants from anon, authenticated;
grant select on table public.card_variants to anon, authenticated;
create policy "everyone reads the variants"
  on public.card_variants for select to anon, authenticated
  using (true);

-- The composite key keeps a variant on its own character; starter cards are
-- always the base version.
alter table public.card_instances add column variant_id uuid;
alter table public.card_instances
  add constraint card_instances_variant_fkey foreign key (variant_id, definition_id)
    references public.card_variants (id, definition_id),
  add constraint card_instances_starter_is_base check (not (is_starter and variant_id is not null));
create index card_instances_variant_id_idx on public.card_instances (variant_id) where variant_id is not null;

-- First series, neon style. Characters unlocked at a level never come from
-- packs, so they cannot have a variant to find there.
insert into public.card_variants (definition_id, style, style_name, art_url)
select d.id, 'neon', 'Neon', '/cards/variants/' || d.code || '-neon.webp'
from public.card_definitions d
where d.code in (
  'P080', 'P079', 'P053', 'P043', 'P046', 'P077', 'P072', 'P070', 'P071', 'P069',
  'P028', 'P026', 'P001', 'P004', 'P005', 'P012', 'P016', 'P062', 'P064', 'P066'
);

-- The album says how many variants of a character exist, never what they look like.
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
  d.unlock_level,
  (select count(*)::integer from public.card_variants v where v.definition_id = d.id and v.is_active) as variant_count
from public.card_definitions d
join public.rarity_definitions r on r.code = d.rarity_code
left join public.power_definitions p on p.code = d.power_code
where d.is_active;

-- ---------------------------------------------------------------------------
-- Drawing a variant
-- ---------------------------------------------------------------------------

-- The rarity and the character are already drawn: this roll cannot change their odds.
create function public.draw_variant(p_definition_id uuid)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_variant uuid;
begin
  if random() * 100 >= public.config_int('packs.variant_chance_percent') then
    return null;
  end if;
  select v.id into v_variant
  from public.card_variants v
  where v.definition_id = p_definition_id and v.is_active
  order by random()
  limit 1;
  return v_variant;
end;
$$;

revoke execute on function public.draw_variant(uuid) from public, anon, authenticated;

create or replace function public.open_pack(p_user uuid, p_pack_type text)
returns uuid
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_definitions uuid[] := public.draw_pack_definitions(
    public.config_int('packs.cards_per_pack'),
    public.config_int('packs.guaranteed_min_rarity_rank')
  );
  v_definition uuid;
  v_instance uuid;
  v_is_new boolean;
  v_instance_ids uuid[] := '{}';
  v_new_ids uuid[] := '{}';
  v_opening uuid := gen_random_uuid();
begin
  foreach v_definition in array v_definitions loop
    v_is_new := not exists (
      select 1 from public.card_instances i where i.owner_id = p_user and i.definition_id = v_definition
    );

    insert into public.card_instances (definition_id, owner_id, acquired_via, variant_id)
    values (v_definition, p_user, 'pack', public.draw_variant(v_definition))
    returning id into v_instance;

    insert into public.card_transfers (instance_id, from_user, to_user, reason)
    values (v_instance, null, p_user, 'pack');

    v_instance_ids := v_instance_ids || v_instance;
    if v_is_new then
      v_new_ids := v_new_ids || v_instance;
    end if;
  end loop;

  insert into public.pack_openings (id, user_id, pack_type, card_instance_ids, new_card_instance_ids)
  values (v_opening, p_user, p_pack_type, v_instance_ids, v_new_ids);

  return v_opening;
end;
$$;

-- Public odds, now with the chance of a variant and how many characters have one.
create or replace function public.get_pack_odds()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cards_per_pack', public.config_int('packs.cards_per_pack'),
    'standard_pack_price', public.config_int('packs.standard_pack_price'),
    'guaranteed_min_rarity_rank', public.config_int('packs.guaranteed_min_rarity_rank'),
    'guaranteed_rarity_name', (
      select r.name from public.rarity_definitions r
      where r.rank = public.config_int('packs.guaranteed_min_rarity_rank')
    ),
    'variant_chance_percent', public.config_int('packs.variant_chance_percent'),
    'characters_with_variants', (
      select count(distinct v.definition_id) from public.card_variants v where v.is_active
    ),
    'odds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', w.code, 'name', w.name, 'rank', w.rank, 'color', w.color,
        'probability', round(w.probability, 4)
      ) order by w.rank)
      from (
        select e.*, e.drop_weight / sum(e.drop_weight) over () as probability
        from public.eligible_rarities() e
      ) w
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Payloads
-- ---------------------------------------------------------------------------

-- A card as one instance shows it: the base payload, with the variant's art if
-- it has one. A null instance (a bot's card) is always the base version.
create function public.card_payload(p_definition_id uuid, p_instance_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.card_payload(p_definition_id) || coalesce((
    select jsonb_build_object(
      'art_url', v.art_url,
      'variant', jsonb_build_object('style', v.style, 'name', v.style_name)
    )
    from public.card_instances i
    join public.card_variants v on v.id = i.variant_id
    where i.id = p_instance_id
  ), '{}'::jsonb)
$$;

revoke execute on function public.card_payload(uuid, uuid) from public, anon, authenticated;

create or replace function public.pack_opening_payload(p_opening_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'pack_type', o.pack_type,
    'opened_at', o.opened_at,
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instance_id', i.id,
        'is_new', i.id = any (o.new_card_instance_ids),
        'code', d.code,
        'name', d.name,
        'faction', d.faction,
        'flavor', d.flavor,
        'art_url', coalesce(v.art_url, d.art_url),
        'variant', case when v.id is null then null
                        else jsonb_build_object('style', v.style, 'name', v.style_name) end,
        'stats', d.stats,
        'rarity', jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color),
        'power', case when d.power_code is null then null else jsonb_build_object(
          'name', p.name,
          'text', public.power_text(d.power_code, d.power_params)
        ) end
      ) order by r.rank, u.slot)
      from unnest(o.card_instance_ids) with ordinality as u(instance_id, slot)
      join public.card_instances i on i.id = u.instance_id
      join public.card_definitions d on d.id = i.definition_id
      join public.rarity_definitions r on r.code = d.rarity_code
      left join public.card_variants v on v.id = i.variant_id
      left join public.power_definitions p on p.code = d.power_code
    ), '[]'::jsonb)
  )
  from public.pack_openings o
  where o.id = p_opening_id
$$;

-- Same as before, with the art of the fielded and offered copies.
create or replace function public.conquest_payload(p_match_id uuid, p_side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'role', case when c.winner_id is not distinct from (case p_side when 'a' then m.player_a else m.player_b end)
                 then 'winner' else 'loser' end,
    'deadline_at', c.deadline_at,
    'resolved', c.resolved_at is not null,
    'auto_assigned', c.auto_assigned,
    'bonus_coins', c.bonus_coins,
    'chosen', case when c.chosen_instance_id is null then null else
      (select public.card_payload(i.definition_id, i.id) from public.card_instances i where i.id = c.chosen_instance_id)
    end,
    -- The loser's whole team, shown to the winner only and only while picking.
    'offered', case
      when c.resolved_at is null and c.winner_id is not distinct from (case p_side when 'a' then m.player_a else m.player_b end) then (
        select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
          'instance_id', u.instance_id,
          'eligible', u.instance_id = any (c.eligible_instance_ids)
        ) order by u.ord)
        from public.match_teams t,
             unnest(t.card_instance_ids, t.definition_ids) with ordinality as u(instance_id, definition_id, ord)
        where t.match_id = p_match_id and t.user_id is not distinct from c.loser_id
      )
      else null
    end
  )
  from public.conquest_claims c
  join public.matches m on m.id = c.match_id
  where c.match_id = p_match_id
$$;

create or replace function public.get_conquest_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'won', t.to_user is not distinct from auth.uid(),
    'created_at', t.created_at,
    'opponent', case when m.bot_difficulty is not null then 'Bot' else (
      select p.username from public.profiles p
      where p.id = case when t.to_user = auth.uid() then t.from_user else t.to_user end
    ) end,
    'card', public.card_payload(i.definition_id, i.id)
  ) order by t.created_at desc), '[]'::jsonb)
  from public.card_transfers t
  join public.card_instances i on i.id = t.instance_id
  left join public.matches m on m.id = t.match_id
  where t.reason = 'conquest' and auth.uid() in (t.from_user, t.to_user)
$$;

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
    -- Veggente: only for the side that played it, only the rounds still to come.
    'foreseen_threats', coalesce(case when exists (
      select 1 from public.round_plays rp
      join public.card_definitions d on d.id = rp.definition_id
      where rp.match_id = p_match_id and rp.side = p_side and d.power_code = 'foresight'
    ) then (
      select jsonb_agg(jsonb_build_object(
        'round', u.ord, 'level', t.level, 'name', t.name, 'abilities', to_jsonb(t.required_abilities)
      ) order by u.ord)
      from unnest(m.threat_ids) with ordinality as u(id, ord)
      join public.threat_definitions t on t.id = u.id
      where u.ord > m.current_round
    ) end, '[]'::jsonb),
    'my_team', (
      select jsonb_agg(public.card_payload(u.definition_id, u.instance_id) || jsonb_build_object(
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
          select public.card_payload(rp.definition_id, rp.card_instance_id) || jsonb_build_object(
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

-- ---------------------------------------------------------------------------
-- Conversion: variants are never turned into coins
-- ---------------------------------------------------------------------------

-- The copy to keep is a base one too: a variant does not make a base copy a duplicate.
create or replace function public.collection_summary(p_user uuid)
returns table (
  definition_id uuid,
  copies integer,
  starter_copies integer,
  locked_copies integer,
  convertible_copies integer
)
language sql
stable
set search_path = ''
as $$
  select
    s.definition_id,
    s.copies,
    s.starter_copies,
    s.locked_copies,
    greatest(0, least(s.free_copies, s.base_copies - 1)) as convertible_copies
  from (
    select
      i.definition_id,
      count(*)::integer as copies,
      (count(*) filter (where i.variant_id is null))::integer as base_copies,
      (count(*) filter (where i.is_starter))::integer as starter_copies,
      (count(*) filter (where i.locked_until > now()))::integer as locked_copies,
      (count(*) filter (
        where not i.is_starter
          and i.variant_id is null
          and (i.locked_until is null or i.locked_until <= now())
          and not public.instance_in_active_match(i.id)
      ))::integer as free_copies
    from public.card_instances i
    where i.owner_id = p_user
    group by i.definition_id
  ) s
$$;

create or replace function public.convert_definition_duplicates(
  p_user uuid,
  p_definition_id uuid,
  p_count integer,
  out converted integer,
  out coins integer
)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_convertible integer;
  v_value integer;
  v_ids uuid[];
begin
  select s.convertible_copies into v_convertible
  from public.collection_summary(p_user) s
  where s.definition_id = p_definition_id;

  select coalesce(array_agg(c.id), '{}') into v_ids from (
    select i.id
    from public.card_instances i
    where i.owner_id = p_user
      and i.definition_id = p_definition_id
      and not i.is_starter
      and i.variant_id is null
      and (i.locked_until is null or i.locked_until <= now())
      and not public.instance_in_active_match(i.id)
    order by i.acquired_at desc, i.id
    limit greatest(0, least(coalesce(p_count, v_convertible, 0), coalesce(v_convertible, 0)))
  ) c;

  converted := cardinality(v_ids);
  coins := 0;
  if converted = 0 then
    return;
  end if;

  update public.card_instances set owner_id = null, converted_at = now() where id = any (v_ids);

  insert into public.card_transfers (instance_id, from_user, to_user, reason)
  select u.id, p_user, null, 'conversion' from unnest(v_ids) as u(id);

  select r.duplicate_coin_value into v_value
  from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  where d.id = p_definition_id;

  -- One ledger row per converted card, referencing it.
  if v_value > 0 then
    insert into public.coin_ledger (user_id, amount, reason, ref_id)
    select p_user, v_value, 'duplicate_conversion', u.id from unnest(v_ids) as u(id);
  end if;
  coins := v_value * converted;
end;
$$;
