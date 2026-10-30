-- First real content of the catalog (docs/WORLD.md): the four Omega characters
-- get their name, flavor text and art. Stats and powers do not change.
--
-- art_url is a path inside public/; the client adds the basePath.

update public.card_definitions set
  name = 'Il Superstite',
  flavor = 'Era al centro dell''Ora Zero. Da allora non ha ancora finito di resistere.',
  art_url = '/cards/P057.webp'
where code = 'P057';

update public.card_definitions set
  name = 'Sentinella Vuota',
  flavor = 'Protegge la città ogni notte. Dentro non c''è nessuno.',
  art_url = '/cards/P058.webp'
where code = 'P058';

update public.card_definitions set
  name = 'La Folla',
  flavor = 'Sente tutti i tuoi pensieri. Non ne ha nemmeno uno suo.',
  art_url = '/cards/P059.webp'
where code = 'P059';

update public.card_definitions set
  name = 'Mongibello',
  flavor = 'Contiene un vulcano. Il telefono, invece, non ha mai funzionato.',
  art_url = '/cards/P060.webp'
where code = 'P060';

-- The two card payloads now carry the art too.

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
        'art_url', d.art_url,
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
      left join public.power_definitions p on p.code = d.power_code
    ), '[]'::jsonb)
  )
  from public.pack_openings o
  where o.id = p_opening_id
$$;

create or replace function public.card_payload(p_definition_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'definition_id', d.id,
    'code', d.code,
    'name', d.name,
    'faction', d.faction,
    'flavor', d.flavor,
    'art_url', d.art_url,
    'stats', d.stats,
    'rarity', jsonb_build_object('code', r.code, 'name', r.name, 'rank', r.rank, 'color', r.color),
    'power', case when d.power_code is null then null else jsonb_build_object(
      'code', d.power_code,
      'params', d.power_params,
      'name', p.name,
      'text', public.power_text(d.power_code, d.power_params)
    ) end
  )
  from public.card_definitions d
  join public.rarity_definitions r on r.code = d.rarity_code
  left join public.power_definitions p on p.code = d.power_code
  where d.id = p_definition_id
$$;
