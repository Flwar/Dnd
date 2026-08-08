import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationDirectoryUrl = new URL("../../supabase/migrations/", import.meta.url);

async function migrationText() {
  const fileNames = (await readdir(migrationDirectoryUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  return (
    await Promise.all(
      fileNames.map((fileName) => readFile(new URL(fileName, migrationDirectoryUrl), "utf8")),
    )
  ).join("\n");
}

const protectedTables = [
  "profiles",
  "characters",
  "character_attributes",
  "character_inventory",
  "character_equipment",
  "character_quests",
  "character_story_flags",
  "character_relationships",
  "character_discovered_locations",
  "character_chapter_completions",
  "save_snapshots",
  "save_commands",
  "parties",
  "party_members",
  "party_sessions",
  "party_events",
  "party_commands",
  "party_votes",
  "reward_claims",
  "player_presence_connections",
  "player_presence_events",
] as const;

test("every player-owned or multiplayer table enables RLS", async () => {
  const migration = await migrationText();

  for (const table of protectedTables) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`, "i"),
      `${table} must enable RLS`,
    );
  }
});

test("sensitive multiplayer writes are RPC-only", async () => {
  const migration = await migrationText();

  for (const table of [
    "parties",
    "party_members",
    "party_sessions",
    "party_events",
    "party_commands",
    "party_votes",
    "reward_claims",
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on public\\.${table} from anon, authenticated;`, "i"),
    );
    assert.doesNotMatch(
      migration,
      new RegExp(`grant (?:insert|update|delete).*public\\.${table} to authenticated`, "i"),
    );
  }
});

test("authoritative functions cannot be executed by a browser role", async () => {
  const migration = await migrationText();

  for (const functionName of [
    "apply_party_command_result",
    "submit_party_dialogue_vote",
    "resolve_party_vote",
    "resolve_party_loot_claim",
    "grant_character_reward",
    "complete_character_chapter",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${functionName}\\([^;]+from public, anon, authenticated;`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${functionName}\\([^;]+to service_role;`, "i"),
    );
  }
});

test("commands and rewards have explicit idempotency and optimistic locking", async () => {
  const migration = await migrationText();

  assert.match(migration, /command_id uuid primary key/i);
  assert.match(migration, /idempotency_key uuid not null unique/i);
  assert.match(migration, /SESSION_VERSION_CONFLICT/);
  assert.match(migration, /SAVE_VERSION_CONFLICT/);
  assert.match(migration, /SESSION_COMMAND_PENDING/);
  assert.match(migration, /ACTION_OUT_OF_TURN/);
  assert.match(migration, /unique \(reward_key, scope_key\)/i);
  assert.match(migration, /server_seed bigint not null default private\.secure_game_seed\(\)/i);
  assert.match(migration, /pending_started_at > now\(\) - interval '45 seconds'/i);
  assert.match(migration, /CLIENT_REWARD_SELECTION_FORBIDDEN/);
  assert.match(migration, /create or replace function public\.resolve_party_loot_claim/i);
  assert.match(migration, /shared_loot \? scope_key/i);
  assert.match(migration, /authoritative_item_use/i);
  assert.match(migration, /persisted_patch := p_state_patch[\s\S]+- 'authoritative_item_use'/i);
  assert.match(migration, /ITEM_STATE_CONFLICT/);
  assert.match(migration, /Player vitals travel in the validated combat state patch/i);
  assert.match(migration, /update public\.character_inventory/i);
  assert.match(migration, /delete from public\.character_equipment where character_id = p_character_id/i);
  assert.match(migration, /update public\.characters\s+set level = authoritative_level/i);
});

test("migration contains no credential-shaped literals", async () => {
  const migration = await migrationText();

  assert.doesNotMatch(migration, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s]/i);
  assert.doesNotMatch(migration, /SUPABASE_SECRET_KEY\s*=\s*[^\s]/i);
  assert.doesNotMatch(migration, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(migration, /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i);
});

test("global presence is authenticated, sanitized, multi-tab safe, and realtime", async () => {
  const migration = await migrationText();
  const presenceMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260801000400_global_player_presence.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /create table public\.player_presence_connections/i);
  assert.match(migration, /connection_id uuid primary key/i);
  assert.match(migration, /user_id uuid not null references public\.profiles/i);
  assert.match(migration, /last_seen_at < now\(\) - interval '60 seconds'/i);
  assert.match(migration, /fresh_connection_count >= 8/i);
  assert.match(migration, /where player_presence_connections\.user_id = current_user_id/i);
  assert.match(migration, /PRESENCE_CONNECTION_OWNED_BY_OTHER/);
  assert.match(migration, /pg_advisory_xact_lock/i);

  for (const functionName of [
    "heartbeat_player_presence",
    "disconnect_player_presence",
    "get_online_players",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${functionName}\\([^;]+from public, anon, authenticated;`,
        "i",
      ),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${functionName}\\([^;]+to authenticated;`, "i"),
    );
  }

  assert.match(migration, /grant select on public\.player_presence_events to authenticated/i);
  assert.match(migration, /alter publication supabase_realtime add table public\.player_presence_events/i);
  assert.match(presenceMigration, /display_name text/i);
  assert.match(presenceMigration, /avatar_key text/i);
  assert.match(presenceMigration, /account_title text/i);
  assert.doesNotMatch(presenceMigration, /\bemail\b(?! addresses)/i);
});

test("presence heartbeat lease tolerates mobile timer drift", async () => {
  const leaseMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260808000100_presence_lease_resilience.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(leaseMigration, /last_seen_at < now\(\) - interval '180 seconds'/i);
  assert.match(leaseMigration, /last_seen_at >= now\(\) - interval '180 seconds'/i);
  assert.match(leaseMigration, /notify pgrst, 'reload schema'/i);
});

test("environment helper accepts publishable keys and exposes a safe probe", async () => {
  const environmentModule = await readFile(
    new URL("../../src/lib/env.ts", import.meta.url),
    "utf8",
  );

  assert.match(environmentModule, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(environmentModule, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(environmentModule, /SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(environmentModule, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
  assert.match(environmentModule, /export function isSupabaseConfigured\(\): boolean/);
});

test("custom portraits are owner-scoped, type-limited, and protected while referenced", async () => {
  const migration = await migrationText();
  const route = await readFile(
    new URL("../../src/app/api/character-portraits/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /'character-portraits'[\s\S]+true[\s\S]+2097152[\s\S]+array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.match(migration, /create policy character_portraits_insert_own[\s\S]+private\.is_owned_character_portrait_path\(name\)/i);
  assert.match(migration, /create policy character_portraits_delete_unreferenced_own[\s\S]+private\.can_delete_character_portrait\(name\)/i);
  assert.match(migration, /portrait_key ~ '\^portrait-\(human\|elf\|dwarf\|halfling\|orc\|dragonborn\)-0\[1-5\]\$'/i);
  assert.doesNotMatch(migration, /is_owned_character_portrait_path\(\s*p_object_name text,\s*p_user_id uuid/i);
  assert.match(migration, /c\.portrait_key = 'custom:' \|\| p_object_name/i);
  assert.match(migration, /split_part\(portrait_key, '\/', 1\) = 'custom:' \|\| owner_id::text/i);
  assert.match(migration, /rename to create_character_legacy/i);
  assert.match(migration, /revoke all on function public\.create_character_legacy\([\s\S]+from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /image\/svg\+xml|\.svg/i);

  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /detectCharacterPortraitFile\(bytes\)/);
  assert.match(route, /\.eq\("portrait_key", parsed\.portraitKey\)/);
  assert.match(route, /MAX_CHARACTER_PORTRAIT_BYTES/);
  assert.match(route, /\.eq\("avatar_key", parsed\.portraitKey\)/);
  assert.doesNotMatch(route, /createServiceRoleSupabaseClient/);
});

test("custom profile avatars stay owner-scoped and cannot be deleted while referenced", async () => {
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20260808000300_profile_avatar_uploads.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const profileAction = await readFile(
    new URL("../../src/lib/actions/profile.ts", import.meta.url),
    "utf8",
  );
  const clientPreparation = await readFile(
    new URL("../../src/lib/portrait-upload-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(migration, /add constraint profiles_avatar_key_check check/i);
  assert.match(migration, /split_part\(avatar_key, '\/', 1\) = 'custom:' \|\| id::text/i);
  assert.match(migration, /profile\.avatar_key = 'custom:' \|\| p_object_name/i);
  assert.match(profileAction, /customAvatar\.ownerId !== data\.user\.id/);
  assert.match(profileAction, /\.from\(CHARACTER_PORTRAIT_BUCKET\)[\s\S]+\.list\(customAvatar\.ownerId/);
  assert.match(clientPreparation, /MAX_PORTRAIT_SOURCE_BYTES/);
  assert.match(clientPreparation, /TARGET_OPTIMIZED_PORTRAIT_BYTES/);
  assert.match(clientPreparation, /createImageBitmap/);
  assert.doesNotMatch(clientPreparation, /image\/svg\+xml/);
});

test("King access is server-provisioned and enforced again inside character creation", async () => {
  const migration = await migrationText();
  const kingMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260801000500_king_account_entitlement.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(kingMigration, /account_role text not null default 'player'/i);
  assert.match(kingMigration, /is_king boolean not null default false/i);
  assert.match(kingMigration, /not is_king or account_role = 'administrator'/i);
  assert.match(kingMigration, /revoke update \(account_role, is_king, account_title\)[\s\S]+from authenticated/i);
  assert.match(kingMigration, /create or replace function public\.provision_account_access/i);
  assert.match(kingMigration, /grant execute on function public\.provision_account_access\([^;]+to service_role/i);
  assert.doesNotMatch(kingMigration, /grant execute on function public\.provision_account_access\([^;]+to authenticated/i);
  assert.match(kingMigration, /p_class_id = 'king' and not private\.is_king_account\(caller_id\)/i);
  assert.match(kingMigration, /message = 'KING_CLASS_FORBIDDEN'/i);
  assert.match(kingMigration, /'crown-of-the-shattered-king'/i);
  assert.match(migration, /primary_resource_type in \([^)]*'authority'/i);
  assert.doesNotMatch(kingMigration, /@/);
  assert.doesNotMatch(kingMigration, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test("party dialogue voting is atomic, idempotent, and does not race on a client version", async () => {
  const recoveryMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260807000100_party_recovery.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    recoveryMigration,
    /create or replace function public\.submit_party_dialogue_vote\(\s*p_command_id uuid,\s*p_session_id uuid,\s*p_character_id uuid,\s*p_scene_id text,\s*p_decision_id text,\s*p_choice_id text\s*\)/i,
  );
  assert.match(
    recoveryMigration,
    /select \* into target_session\s+from public\.party_sessions\s+where id = p_session_id\s+for update;/i,
  );
  assert.match(
    recoveryMigration,
    /select \* into existing_command\s+from public\.party_commands\s+where command_id = p_command_id;[\s\S]+COMMAND_ID_ALREADY_USED[\s\S]+return jsonb_build_object\([\s\S]+?'duplicate', true/i,
  );
  assert.match(
    recoveryMigration,
    /insert into public\.party_votes[\s\S]+on conflict \(session_id, scene_id, decision_id, character_id\) do update[\s\S]+set choice_id = excluded\.choice_id/i,
  );
  assert.match(
    recoveryMigration,
    /insert into public\.party_commands[\s\S]+p_command_id, p_session_id, p_character_id, 'SUBMIT_DIALOGUE_VOTE',[\s\S]+target_session\.version, command_server_seed, command_payload, 'accepted'/i,
  );
  assert.match(
    recoveryMigration,
    /next_version := target_session\.version \+ 1;[\s\S]+update public\.party_sessions[\s\S]+set version = next_version/i,
  );
  assert.doesNotMatch(
    recoveryMigration,
    /submit_party_dialogue_vote\([\s\S]{0,300}p_expected_session_version/i,
  );
});

test("leaving a party transfers leadership and safely releases active sessions", async () => {
  const recoveryMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260807000100_party_recovery.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    recoveryMigration,
    /if target_party\.leader_character_id = p_character_id and other_members > 0 then[\s\S]+order by joined_at, character_id[\s\S]+update public\.parties\s+set leader_character_id = next_leader/i,
  );
  assert.match(
    recoveryMigration,
    /update public\.party_members\s+set role = case when character_id = next_leader then 'leader' else 'member' end[\s\S]+where party_id = p_party_id and left_at is null/i,
  );
  assert.match(
    recoveryMigration,
    /update public\.party_members\s+set left_at = now\(\),[\s\S]+ready_state = false,[\s\S]+connection_state = 'disconnected'/i,
  );
  assert.match(
    recoveryMigration,
    /elsif active_session_found and \(combat_active or other_members < 2\) then[\s\S]+set status = 'abandoned',[\s\S]+update public\.parties\s+set status = 'open'[\s\S]+set ready_state = false/i,
  );
  assert.match(
    recoveryMigration,
    /update public\.party_sessions\s+set status = 'abandoned',[\s\S]+where status in \('forming', 'active'\);[\s\S]+update public\.parties\s+set status = 'closed',[\s\S]+update public\.party_members\s+set left_at = coalesce\(left_at, now\(\)\)/i,
  );
});

test("party vote resolution excludes departed and stale presence", async () => {
  const recoveryMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260807000100_party_recovery.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const eligibleMemberFilter = /pm\.left_at is null\s+and pm\.connection_state in \('connected', 'reconnecting'\)\s+and pm\.last_seen_at >= now\(\) - interval '60 seconds'/gi;

  assert.match(
    recoveryMigration,
    /create or replace function public\.resolve_party_vote\(/i,
  );
  assert.equal(
    [...recoveryMigration.matchAll(eligibleMemberFilter)].length,
    2,
    "both the leader tie-break lookup and the vote tally must use live members only",
  );
  assert.match(
    recoveryMigration,
    /join public\.party_members pm[\s\S]+pm\.character_id = pv\.character_id/i,
  );
});

test("party heartbeat recovery is owner-bound and only cleans clearly stale rooms", async () => {
  const recoveryMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260808000400_party_heartbeat_recovery.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(recoveryMigration, /create or replace function public\.recover_party_membership\(/i);
  assert.match(recoveryMigration, /if not private\.is_character_owner\(p_character_id\)/i);
  assert.match(
    recoveryMigration,
    /create or replace function public\.submit_party_dialogue_vote\([\s\S]+pg_catalog\.pg_advisory_xact_lock\([\s\S]+command_id = p_command_id/i,
  );
  assert.match(
    recoveryMigration,
    /revoke all on function public\.submit_party_dialogue_vote\(uuid, uuid, uuid, text, text, text\)[\s\S]+drop function public\.submit_party_dialogue_vote\(uuid, uuid, uuid, text, text, text\)/i,
  );
  assert.match(
    recoveryMigration,
    /create or replace function public\.submit_party_dialogue_vote\(\s*p_command_id uuid,\s*p_session_id uuid,\s*p_character_id uuid,\s*p_owner_id uuid/i,
  );
  assert.match(recoveryMigration, /if auth\.role\(\) <> 'service_role'/i);
  assert.match(
    recoveryMigration,
    /from public\.characters c[\s\S]+c\.id = p_character_id[\s\S]+c\.owner_id = p_owner_id/i,
  );
  assert.match(
    recoveryMigration,
    /revoke all on function public\.submit_party_dialogue_vote\(uuid, uuid, uuid, uuid, text, text, text\)\s+from public, anon, authenticated;[\s\S]+grant execute on function public\.submit_party_dialogue_vote\(uuid, uuid, uuid, uuid, text, text, text\)\s+to service_role;/i,
  );
  assert.doesNotMatch(
    recoveryMigration,
    /grant execute on function public\.submit_party_dialogue_vote\([^;]+to authenticated/i,
  );
  assert.match(
    recoveryMigration,
    /grant execute on function public\.recover_party_membership\(uuid\)\s+to authenticated/i,
  );
  assert.match(recoveryMigration, /last_seen_at >= now\(\) - interval '180 seconds'/i);
  assert.match(
    recoveryMigration,
    /from public\.party_members member[\s\S]+order by member\.character_id\s+for update;[\s\S]+submitted_members < eligible_members/i,
  );
  assert.match(recoveryMigration, /'pending', true,[\s\S]+'required_votes', eligible_members/i);
  assert.match(recoveryMigration, /#> array\['resolved_votes', p_scene_id, p_decision_id\]/i);
  assert.match(recoveryMigration, /'DIALOGUE_VOTE_RESOLVED'/i);
  assert.match(recoveryMigration, /version = version \+ 1/i);
  assert.match(
    recoveryMigration,
    /'session_version', target_session\.version \+ 1/i,
  );
  assert.match(
    recoveryMigration,
    /'leader_broke_tie', tied_choices > 1 and winning_choice = leader_choice/i,
  );
  assert.match(recoveryMigration, /member\.last_seen_at >= now\(\) - interval '15 minutes'/i);
  assert.match(
    recoveryMigration,
    /not exists \([\s\S]+session\.status in \('forming', 'active'\)[\s\S]+\)\s+loop/i,
  );
  assert.match(
    recoveryMigration,
    /loop[\s\S]+from public\.parties party[\s\S]+for update;[\s\S]+from public\.party_members member[\s\S]+for update;[\s\S]+and not exists \([\s\S]+session\.status in \('forming', 'active'\)[\s\S]+then[\s\S]+update public\.party_members/i,
  );
  assert.match(recoveryMigration, /notify pgrst, 'reload schema'/i);
});

test("cloud saves apply account backpressure and avoid unbounded snapshot scans", async () => {
  const saveMigration = await readFile(
    new URL(
      "../../supabase/migrations/20260808000500_save_snapshot_backpressure.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(saveMigration, /create or replace function private\.calculate_profile_playtime/i);
  assert.match(
    saveMigration,
    /left join lateral \([\s\S]+order by ss\.save_version desc[\s\S]+limit 1/i,
  );
  assert.match(
    saveMigration,
    /profile_total_start_marker constant text := 'total_playtime_seconds = coalesce\(\('/i,
  );
  assert.match(
    saveMigration,
    /profile_total_end_marker constant text := 'last_active_at = now\(\)'/i,
  );
  assert.match(
    saveMigration,
    /if strpos\(save_function_definition, optimized_marker\) > 0 then[\s\S]+optimized_function_definition := save_function_definition/i,
  );
  assert.doesNotMatch(saveMigration, /optimized_function_definition := replace\(/i);
  assert.match(saveMigration, /new\.level is distinct from old\.level/i);
  assert.match(
    saveMigration,
    /alter function public\.save_character_snapshot\([^;]+rename to save_character_snapshot_core/i,
  );
  assert.match(
    saveMigration,
    /revoke all on function public\.save_character_snapshot_core\([^;]+from public, anon, authenticated/i,
  );
  assert.doesNotMatch(
    saveMigration,
    /grant execute on function public\.save_character_snapshot_core\([^;]+to authenticated/i,
  );
  assert.match(saveMigration, /set lock_timeout = '1500ms'/i);
  assert.match(
    saveMigration,
    /pg_try_advisory_xact_lock\([\s\S]+hashtextextended\('profile-save:' \|\| caller_id::text, 0\)/i,
  );
  assert.match(saveMigration, /errcode = '55P03',[\s\S]+message = 'SAVE_IN_PROGRESS'/i);
});
