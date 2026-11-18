-- The catalog dump read by scripts/simulate-story.mts (read only):
--   npx supabase db query --linked -f scripts/story-catalog.sql > story-raw.json
-- Characters with their traits, threats, abilities, traits, game_config and the
-- story missions with their opponents, threats, modifiers and star rules.
select jsonb_build_object(
  'cards', (
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'code', d.code, 'name', d.name, 'faction', d.faction, 'rarity', d.rarity_code, 'rank', r.rank,
      'unlock', d.unlock_level, 'stats', d.stats, 'power_code', d.power_code, 'power_params', d.power_params,
      'active', d.is_active,
      'traits', (select coalesce(jsonb_agg(ct.trait_code order by ct.trait_code), '[]'::jsonb)
                 from public.card_definition_traits ct where ct.definition_id = d.id)
    ) order by d.code)
    from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
  ),
  'threats', (
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'code', t.code, 'name', t.name, 'level', t.level, 'abilities', t.required_abilities,
      'active', t.is_active, 'region', t.region, 'modifier_code', t.modifier_code,
      'modifier_params', t.modifier_params, 'rarity', t.rarity_code
    ) order by t.code)
    from public.threat_definitions t
  ),
  'abilities', (select jsonb_agg(jsonb_build_object('code', a.code, 'family', a.family)) from public.ability_definitions a),
  'traits', (
    select jsonb_agg(jsonb_build_object('code', t.code, 'category', t.category_code, 'name', t.name)
                     order by t.category_code, t.sort_order)
    from public.traits t
  ),
  'config', (select jsonb_object_agg(c.key, c.value) from public.game_config c),
  'missions', (
    select jsonb_agg(jsonb_build_object(
      'code', m.code, 'chapter', m.chapter, 'ord', m.ord, 'title', m.title, 'opponent', m.opponent,
      'difficulty', m.bot_difficulty,
      'bot', (select jsonb_agg(d.code order by u.o) from unnest(m.bot_definition_ids) with ordinality u(id, o)
              join public.card_definitions d on d.id = u.id),
      'threats', (select jsonb_agg(t.code order by u.o) from unnest(m.threat_ids) with ordinality u(id, o)
                  join public.threat_definitions t on t.id = u.id),
      'mods', m.threat_modifiers,
      -- Absent before the stars migration (20261118100000_story_stars.sql).
      'star_rarities', to_jsonb(m) -> 'star_rarities',
      'star_traits', to_jsonb(m) -> 'star_traits'
    ) order by m.chapter, m.ord)
    from public.story_missions m
  )
) as data;
