-- Threats beyond Nuova Megara (SPEC §5.4): fifteen threats in five places of the
-- world, each place with its own rule. The rule is fixed for every threat of the
-- place, never drawn: a match stores it in matches.threat_modifiers like a drawn
-- modifier, so the Edge Function, the state payload and Veggente need no change.
-- The drawn modifiers (1 or 2 per match) go only to the threats of Nuova Megara.
-- Emergenza draws only threats of Nuova Megara: its targets cannot be reached
-- under Gelo or Duello (the Edge Function filters on region).

insert into public.game_config (key, value, description) values
  ('places.long_count_bonus', '3', 'Il conto lungo: points of the side that has won fewer rounds'),
  ('places.frost_cap', '6', 'Gelo: the most a required ability counts'),
  ('places.duel_count', '2', 'Duello: how many of the highest required abilities count');

alter table public.threat_definitions
  add column region text not null default 'megara'
    check (region in ('megara', 'giza', 'yucatan', 'atlantis', 'arctic', 'japan'));

alter table public.threat_definitions
  add constraint threat_definitions_modifier_code
    check (modifier_code is null or modifier_code in ('tomb_silence', 'long_count', 'abyss', 'frost', 'duel'));

-- Abissi names the abilities it doubles: configured codes, at least one.
create or replace function public.validate_threat_definition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.required_abilities) as r(code)
    where r.code is null or r.code not in (select a.code from public.ability_definitions a)
  ) then
    raise exception 'threat %: unknown ability in required_abilities', new.code;
  end if;

  if (select count(distinct r.code) from unnest(new.required_abilities) as r(code))
     <> cardinality(new.required_abilities) then
    raise exception 'threat %: required abilities must be distinct', new.code;
  end if;

  if new.modifier_code = 'abyss' and (
    jsonb_typeof(new.modifier_params -> 'abilities') is distinct from 'array'
    or jsonb_array_length(new.modifier_params -> 'abilities') = 0
    or exists (
      select 1 from jsonb_array_elements_text(new.modifier_params -> 'abilities') as a(code)
      where a.code not in (select d.code from public.ability_definitions d)
    )
  ) then
    raise exception 'threat %: abyss needs a list of known abilities', new.code;
  end if;

  return new;
end;
$$;

-- The rule of a place as the rules engine reads it (ThreatModifier), numbers from
-- the configuration. Null for a threat of Nuova Megara.
create function public.place_modifier(p_code text, p_params jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case p_code
    when 'tomb_silence' then jsonb_build_object('code', p_code)
    when 'long_count' then jsonb_build_object('code', p_code, 'bonus', public.config_int('places.long_count_bonus'))
    when 'abyss' then jsonb_build_object('code', p_code, 'abilities', p_params -> 'abilities')
    when 'frost' then jsonb_build_object('code', p_code, 'cap', public.config_int('places.frost_cap'))
    when 'duel' then jsonb_build_object('code', p_code, 'count', public.config_int('places.duel_count'))
  end
$$;

revoke execute on function public.place_modifier(text, jsonb) from public, anon, authenticated;

-- The modifiers of a match: the place rule of every threat that has one, then 1 or 2
-- drawn modifiers among the other rounds (as many as there are, if fewer).
create function public.draw_match_modifiers(p_threat_ids uuid[])
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_fixed jsonb[] := array(
    select public.place_modifier(t.modifier_code, t.modifier_params)
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    order by u.ord
  );
  v_levels integer[] := array(
    select t.level
    from unnest(p_threat_ids) with ordinality as u(id, ord)
    join public.threat_definitions t on t.id = u.id
    order by u.ord
  );
  v_open integer[] := array(select g from generate_subscripts(v_fixed, 1) as g where v_fixed[g] is null);
  v_drawn jsonb;
  v_result jsonb[] := v_fixed;
  v_slot integer := 0;
  v_round integer;
begin
  if cardinality(v_fixed) <> cardinality(p_threat_ids) then
    raise exception 'invalid_threats';
  end if;
  if cardinality(v_open) > 0 then
    -- Drawn on the open rounds only, as if they were the whole match.
    v_drawn := public.draw_threat_modifiers(array(select v_levels[g] from unnest(v_open) as g));
    foreach v_round in array v_open loop
      v_slot := v_slot + 1;
      v_result[v_round] := case when jsonb_typeof(v_drawn -> (v_slot - 1)) = 'object' then v_drawn -> (v_slot - 1) end;
    end loop;
  end if;
  return to_jsonb(v_result);
end;
$$;

revoke execute on function public.draw_match_modifiers(uuid[]) from public, anon, authenticated;

-- Every round with a threat of a place keeps that place's rule, whatever else
-- writes the modifiers (a story mission sets its own after creating the match).
create function public.with_place_modifiers(p_modifiers jsonb, p_threat_ids uuid[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    coalesce(public.place_modifier(t.modifier_code, t.modifier_params), p_modifiers -> (u.ord::integer - 1), 'null'::jsonb)
    order by u.ord
  ), '[]'::jsonb)
  from unnest(p_threat_ids) with ordinality as u(id, ord)
  join public.threat_definitions t on t.id = u.id
$$;

revoke execute on function public.with_place_modifiers(jsonb, uuid[]) from public, anon, authenticated;

create or replace function public.set_threat_modifiers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.threat_modifiers := public.draw_match_modifiers(new.threat_ids);
  else
    new.threat_modifiers := public.with_place_modifiers(new.threat_modifiers, new.threat_ids);
  end if;
  return new;
end;
$$;

create trigger matches_keep_place_modifiers
  before update of threat_modifiers on public.matches
  for each row execute function public.set_threat_modifiers();

-- Whether the power of the character `p_side` played in a round was off: an opposing
-- Annullatore, or Silenzio della tomba, which silences both sides (and leaves the
-- Annullatore nothing to do). Spia and Veggente read it: they reveal nothing then.
create or replace function public.nullified_in_round(p_match_id uuid, p_round integer, p_side text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select m.threat_modifiers -> (p_round - 1) ->> 'code' = 'tomb_silence'
    from public.matches m where m.id = p_match_id
  ), false)
  or exists (
    select 1 from public.round_plays o
    join public.card_definitions d on d.id = o.definition_id
    where o.match_id = p_match_id and o.round = p_round and o.side <> p_side and d.power_code = 'nullifier'
  )
$$;

insert into public.threat_definitions (code, name, level, required_abilities, region, modifier_code, modifier_params, flavor) values
  ('T111', 'Trappola della tomba', 1, array['PER'], 'giza', 'tomb_silence', '{}',
   'Giza, camera bassa. Una lastra del pavimento suona vuota: nessuno la calpesti.'),
  ('T112', 'Canto dagli abissi', 1, array['PSI'], 'atlantis', 'abyss', '{"abilities": ["ENE", "MAG", "PSI"]}',
   'Al largo di Gibilterra sale un canto dall''acqua, e i pescherecci cambiano rotta da soli.'),
  ('T211', 'Gioco della palla', 2, array['VEL', 'COM'], 'yucatan', 'long_count', '{}',
   'Un campo di pietra si è svegliato e vuole una partita. L''anello è a sei metri.'),
  ('T212', 'Tormenta', 2, array['RES', 'PER'], 'arctic', 'frost', '{}',
   'Base Aurora, Polo Nord. Visibilità zero, temperatura peggio.'),
  ('T311', 'Calendario impazzito', 3, array['INT', 'PER', 'MAG'], 'yucatan', 'long_count', '{}',
   'Il calendario di pietra corre in avanti: per il paese è già martedì prossimo.'),
  ('T312', 'Guardiano di oricalco', 3, array['FOR', 'RES', 'ENE'], 'atlantis', 'abyss', '{"abilities": ["ENE", "MAG", "PSI"]}',
   'Atlantide è riemersa di un metro, e il suo guardiano di metallo vuole vedere il passaporto.'),
  ('T313', 'Spadaccino del ponte', 3, array['COM', 'VEL', 'PER'], 'japan', 'duel', '{}',
   'Kyoto. Un''Eco con la spada sfida chi attraversa il ponte, e ha già vinto novantanove volte.'),
  ('T411', 'Mummia del cantiere', 4, array['FOR', 'RES', 'MAG', 'VOL'], 'giza', 'tomb_silence', '{}',
   'Una mummia si è alzata durante gli scavi e chiede di parlare con il responsabile.'),
  ('T412', 'Base sotto il ghiaccio', 4, array['TEC', 'INT', 'RES', 'FUR'], 'arctic', 'frost', '{}',
   'Sotto la calotta qualcuno ha costruito una base, e le luci sono ancora accese.'),
  ('T413', 'Volpe a nove code', 4, array['FUR', 'MAG', 'PSI', 'VEL'], 'japan', 'duel', '{}',
   'Una volpe ha preso il posto del capostazione: i treni arrivano in orario, ma nel posto sbagliato.'),
  ('T511', 'Serpente di luce', 5, array['ENE', 'MAG', 'VEL', 'RES', 'PER'], 'yucatan', 'long_count', '{}',
   'All''equinozio il serpente d''ombra è sceso dalla scalinata, e non è più un''ombra.'),
  ('T512', 'Atlantide riemerge', 5, array['MAG', 'ENE', 'RES', 'VEL', 'INT'], 'atlantis', 'abyss', '{"abilities": ["ENE", "MAG", "PSI"]}',
   'Un continente intero torna a galla. Le assicurazioni non coprono.'),
  ('T513', 'Kaiju nella baia', 5, array['FOR', 'RES', 'ENE', 'COM', 'TEC'], 'japan', 'duel', '{}',
   'Baia di Tokyo, livello 5. È alto come un grattacielo e ha appena morso un treno.'),
  ('T611', 'Risveglio della Sfinge', 6, array['INT', 'PER', 'MAG', 'PSI', 'VOL', 'FOR'], 'giza', 'tomb_silence', '{}',
   'La Sfinge fa una domanda: chi sbaglia la risposta diventa sabbia.'),
  ('T612', 'Cosa nel ghiaccio', 6, array['FOR', 'RES', 'ENE', 'VOL', 'PER', 'COM'], 'arctic', 'frost', '{}',
   'Il ghiaccio si è aperto e ha lasciato uscire qualcosa che ci dormiva da centomila anni.');
