begin;

-- Authored reward definitions are production data and therefore travel as a
-- versioned migration. supabase/seed.sql mirrors these rows for local resets.
insert into public.reward_definitions (
  reward_key,
  item_id,
  item_quantity,
  gold,
  experience,
  metadata,
  enabled
) values
  (
    'opening.tutorial_combat',
    'minor-healing-potion',
    1,
    12,
    75,
    '{"source":"corrupted_cave_rat","category":"encounter"}'::jsonb,
    true
  ),
  (
    'opening.rescue_danor',
    'miners-pick',
    1,
    20,
    75,
    '{"source":"rescue_danor","category":"optional_objective"}'::jsonb,
    true
  ),
  (
    'opening.hidden_mine_cache',
    'fogglass-ring',
    1,
    35,
    100,
    '{"source":"hidden_mine_cache","category":"secret"}'::jsonb,
    true
  ),
  (
    'opening.cult_symbol_insight',
    null,
    0,
    0,
    50,
    '{"source":"cult_symbol","category":"discovery"}'::jsonb,
    true
  ),
  (
    'opening.stone_guardian_victory',
    'guardian-core',
    1,
    100,
    250,
    '{"source":"ancient_stone_guardian","category":"boss"}'::jsonb,
    true
  ),
  (
    'opening.chapter_complete',
    null,
    0,
    0,
    0,
    '{"source":"shadows-beneath-mistvale","category":"chapter_completion_record","economic_rewards_saved_in_validated_snapshot":true}'::jsonb,
    true
  )
on conflict (reward_key) do update
set item_id = excluded.item_id,
    item_quantity = excluded.item_quantity,
    gold = excluded.gold,
    experience = excluded.experience,
    metadata = excluded.metadata,
    enabled = excluded.enabled;

commit;
