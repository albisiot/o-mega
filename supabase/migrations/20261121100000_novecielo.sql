-- The Novecielo (SPEC §5.4): a sixth place beyond Nuova Megara, on the other side of the
-- tear, with three threats and its rule. The rule is Una sola forza, the rare threats' rule
-- (§5.15), on Energia and Psiche ("la Trama"): of the two, only the higher counts, as many
-- times as they are required. Every threat of the place requires both, or the rule would do
-- nothing. Proposed and simulated on 21 November 2026 (SPEC §5.4).

alter table public.threat_definitions drop constraint threat_definitions_region_check;
alter table public.threat_definitions add constraint threat_definitions_region_check
  check (region in ('megara', 'giza', 'yucatan', 'atlantis', 'arctic', 'japan', 'novecielo'));

insert into public.threat_definitions (code, name, level, required_abilities, region, modifier_code, modifier_params, flavor) values
  ('T213', 'Il faro della Trama', 2, array['ENE', 'PSI'], 'novecielo', 'one_force', '{"abilities": ["ENE", "PSI"]}',
   'Dall''altra parte dello strappo un faro imperiale chiama la flotta verso il golfo. Va spento prima che qualcuno risponda.'),
  ('T414', 'Le sonde che ascoltano', 4, array['PSI', 'ENE', 'FUR', 'TEC'], 'novecielo', 'one_force', '{"abilities": ["ENE", "PSI"]}',
   'Sfere di vetro nero scivolano nei corridoi della stazione imperiale e ascoltano i pensieri. Si passa solo senza farsi sentire.'),
  ('T613', 'La corazzata del Novecielo', 6, array['TEC', 'VOL', 'COM', 'FUR', 'ENE', 'PSI'], 'novecielo', 'one_force', '{"abilities": ["ENE", "PSI"]}',
   'L''ultima corazzata dell''impero ha perso l''ammiraglio ma non l''ultimo ordine: tornare a casa. Per lei, adesso, casa è il golfo.');

-- The Sfide a tema can be set on the Novecielo like on the other places (SPEC §8.8).
-- Unchanged from 20261118270000_challenges_stage3.sql but for the list of places.
create or replace function public.challenge_normalize_match_rules(p_format text, p_rules jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_rules jsonb := coalesce(nullif(p_rules, 'null'::jsonb), '{}'::jsonb);
  v_modifier text;
  v_place text;
  v_levels integer[];
  v_multiplier integer;
begin
  if jsonb_typeof(v_rules) <> 'object'
     or (v_rules -> 'levels' is not null and jsonb_typeof(v_rules -> 'levels') not in ('array', 'null')) then
    raise exception 'challenge_invalid_match_rules';
  end if;
  begin
    v_modifier := nullif(v_rules ->> 'modifier', '');
    v_place := nullif(v_rules ->> 'place', '');
    v_levels := array(
      select distinct l::integer from jsonb_array_elements_text(coalesce(nullif(v_rules -> 'levels', 'null'::jsonb), '[]'::jsonb)) as l
      order by 1
    );
    v_multiplier := coalesce((v_rules ->> 'rare_multiplier')::integer, 1);
  exception when others then
    raise exception 'challenge_invalid_match_rules';
  end;
  if (v_modifier is not null and v_modifier not in ('focus', 'weak_link', 'hostile_ground', 'underdogs'))
     or (v_place is not null and v_place not in ('megara', 'giza', 'yucatan', 'atlantis', 'arctic', 'japan', 'novecielo'))
     or exists (select 1 from unnest(v_levels) as l where l not between 1 and 6)
     or cardinality(v_levels) = 6
     or (v_place is not null and cardinality(v_levels) > 0)
     or v_multiplier not between 1 and public.config_int('challenges.max_rare_multiplier') then
    raise exception 'challenge_invalid_match_rules';
  end if;
  if p_format <> 'classic' and (v_modifier is not null or v_place is not null or cardinality(v_levels) > 0 or v_multiplier > 1) then
    raise exception 'challenge_invalid_match_rules';
  end if;
  return jsonb_build_object('modifier', v_modifier, 'place', v_place, 'levels', to_jsonb(v_levels), 'rare_multiplier', v_multiplier);
end;
$$;

revoke execute on function public.challenge_normalize_match_rules(text, jsonb) from public, anon, authenticated;
