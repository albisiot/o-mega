-- The catalog dump read by scripts/simulate-emergency.mts (read only):
--   npx supabase db query --linked -f scripts/emergency-catalog.sql > emergency-raw.json
-- Characters, rarities with their pack weights, threats (rare ones with their
-- chance and Emergenza target), abilities and game_config.
select jsonb_build_object(
  'cards', (
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'code', d.code, 'faction', d.faction, 'rarity', d.rarity_code, 'rank', r.rank,
      'unlock', d.unlock_level, 'stats', d.stats, 'power_code', d.power_code, 'power_params', d.power_params,
      'active', d.is_active
    ) order by d.code)
    from public.card_definitions d join public.rarity_definitions r on r.code = d.rarity_code
  ),
  'rarities', (
    select jsonb_agg(jsonb_build_object('code', r.code, 'rank', r.rank, 'weight', r.drop_weight) order by r.rank)
    from public.rarity_definitions r
  ),
  'threats', (
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'code', t.code, 'level', t.level, 'abilities', t.required_abilities,
      'active', t.is_active, 'region', t.region, 'modifier_code', t.modifier_code,
      'modifier_params', t.modifier_params, 'rarity', t.rarity_code, 'target', t.emergency_target,
      'district', t.district
    ) order by t.code)
    from public.threat_definitions t
  ),
  'threat_rarities', (select jsonb_object_agg(r.code, r.one_in) from public.threat_rarities r),
  'abilities', (select jsonb_agg(jsonb_build_object('code', a.code, 'family', a.family)) from public.ability_definitions a),
  'config', (select jsonb_object_agg(c.key, c.value) from public.game_config c)
) as data;
