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
