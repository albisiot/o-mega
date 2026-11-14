-- The map of Nuova Megara (SPEC §5.13): Allarme Triplo now tells a round on a map of the
-- city, where each threat lights up in its district. Every threat of Nuova Megara gets one
-- of nine districts; the triple payload gives it with each threat, and admins can change it.
-- Threats without one (rare threats, the places beyond Nuova Megara) are placed by the
-- client from their name. Rules do not change.

alter table public.threat_definitions add column district text
  check (district is null or district in (
    'necropoli', 'alti', 'vulcano', 'centro', 'stazione', 'popolari', 'lungomare', 'porto', 'cantiere'
  ));

comment on column public.threat_definitions.district is
  'District of Nuova Megara where the threat lights up on the Allarme Triplo map; null: placed by the client.';

update public.threat_definitions t set district = d.district
from (values
  ('T105', 'necropoli'), ('T303', 'necropoli'), ('T503', 'necropoli'), ('T508', 'necropoli'), ('T603', 'necropoli'), ('T606', 'necropoli'),
  ('T103', 'alti'), ('T208', 'alti'), ('T209', 'alti'), ('T305', 'alti'), ('T406', 'alti'), ('T410', 'alti'), ('T502', 'alti'), ('T505', 'alti'), ('T608', 'alti'),
  ('T501', 'vulcano'), ('T609', 'vulcano'), ('T610', 'vulcano'),
  ('T108', 'centro'), ('T109', 'centro'), ('T203', 'centro'), ('T205', 'centro'), ('T306', 'centro'), ('T309', 'centro'), ('T402', 'centro'), ('T510', 'centro'), ('T602', 'centro'),
  ('T110', 'stazione'), ('T202', 'stazione'), ('T206', 'stazione'), ('T301', 'stazione'), ('T307', 'stazione'),
  ('T101', 'popolari'), ('T102', 'popolari'), ('T104', 'popolari'), ('T204', 'popolari'), ('T401', 'popolari'), ('T506', 'popolari'), ('T605', 'popolari'),
  ('T207', 'lungomare'), ('T210', 'lungomare'), ('T308', 'lungomare'), ('T407', 'lungomare'), ('T408', 'lungomare'), ('T504', 'lungomare'), ('T607', 'lungomare'),
  ('T107', 'porto'), ('T201', 'porto'), ('T310', 'porto'), ('T404', 'porto'), ('T405', 'porto'), ('T509', 'porto'),
  ('T106', 'cantiere'), ('T302', 'cantiere'), ('T304', 'cantiere'), ('T403', 'cantiere'), ('T409', 'cantiere'), ('T507', 'cantiere'), ('T601', 'cantiere'), ('T604', 'cantiere')
) as d(code, district)
where t.code = d.code;

-- The district of each threat of an Allarme Triplo, added to the payload's threats.
create function public.with_triple_districts(p_payload jsonb, p_match_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_payload -> 'threats') is distinct from 'array' then p_payload
    else p_payload || jsonb_build_object('threats', coalesce((
      select jsonb_agg(e.value || jsonb_build_object('district', t.district) order by e.ordinality)
      from jsonb_array_elements(p_payload -> 'threats') with ordinality as e(value, ordinality)
      join public.matches m on m.id = p_match_id
      left join public.threat_definitions t on t.id = m.threat_ids[(e.value ->> 'slot')::integer + 1]
    ), '[]'::jsonb))
  end
$$;

-- As in 20261114110000_play_parts_modes.sql, with the districts of an Allarme Triplo.
create or replace function public.match_state_payload(p_match_id uuid, p_side text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_format text := (select format from public.matches where id = p_match_id);
begin
  if v_format = 'boss' then
    return public.with_play_parts(public.boss_state_payload(p_match_id, p_side), p_match_id, p_side);
  elsif v_format = 'triple' then
    return public.with_triple_districts(
      public.with_triple_play_parts(
        public.with_rare_triple_rules(public.triple_state_payload(p_match_id, p_side), p_match_id),
        p_match_id,
        p_side
      ),
      p_match_id
    );
  elsif public.is_quadrant(v_format) then
    return public.quadrant_state_payload(p_match_id, p_side);
  end if;
  return public.with_play_parts(
    public.with_rare_rules(public.classic_match_state_payload(p_match_id, p_side), p_match_id, p_side),
    p_match_id,
    p_side
  );
end;
$$;

-- The map takes a little longer than the pages one after the other: the camera moves to
-- each place and back. The pages still leave earlier once they are over.
update public.game_config set value = to_jsonb(50), updated_at = now() where key = 'triple.reveal_pause_seconds';

-- Admins: the districts of every threat, and a way to change one.
create function public.admin_threat_districts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return coalesce((select jsonb_object_agg(code, district) from public.threat_definitions), '{}'::jsonb);
end;
$$;

create function public.admin_set_threat_district(p_code text, p_district text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_district is not null and p_district not in (
    'necropoli', 'alti', 'vulcano', 'centro', 'stazione', 'popolari', 'lungomare', 'porto', 'cantiere'
  ) then
    raise exception 'invalid_district';
  end if;
  update public.threat_definitions set district = p_district where code = p_code;
  if not found then
    raise exception 'threat_not_found';
  end if;
end;
$$;

revoke execute on function public.with_triple_districts(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.with_triple_districts(jsonb, uuid) to service_role;
revoke execute on function public.admin_threat_districts() from public, anon;
grant execute on function public.admin_threat_districts() to authenticated;
revoke execute on function public.admin_set_threat_district(text, text) from public, anon;
grant execute on function public.admin_set_threat_district(text, text) to authenticated;
