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
  assert.doesNotMatch(route, /createServiceRoleSupabaseClient/);
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
