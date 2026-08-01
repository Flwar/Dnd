import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migrationDirectory = "supabase/migrations";
const seedPath = "supabase/seed.sql";
const userId = "11111111-1111-4111-a111-111111111111";
const createCommandId = "22222222-2222-4222-a222-222222222222";
const saveCommandId = "33333333-3333-4333-a333-333333333333";
const presenceConnectionOne = "44444444-4444-4444-a444-444444444444";
const presenceConnectionTwo = "55555555-5555-4555-a555-555555555555";
const customPortraitObjectId = "66666666-6666-4666-a666-666666666666";
const customPortraitCommandId = "77777777-7777-4777-a777-777777777777";

async function bootstrap(database) {
  await database.exec(`
    create role anon noinherit;
    create role authenticated noinherit;
    create role service_role noinherit bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz default now()
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
    $$;
    create function public.gen_random_uuid() returns uuid language sql volatile as $$
      select (
        substr(value, 1, 8) || '-' || substr(value, 9, 4) || '-4' ||
        substr(value, 14, 3) || '-a' || substr(value, 18, 3) || '-' ||
        substr(value, 21, 12)
      )::uuid
      from (select md5(random()::text || clock_timestamp()::text) as value) source
    $$;
    create function extensions.gen_random_bytes(length integer) returns bytea language sql volatile as $$
      select decode(
        substr(md5(random()::text || clock_timestamp()::text), 1, length * 2),
        'hex'
      )
    $$;
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default public.gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null,
      owner_id text,
      metadata jsonb not null default '{}'::jsonb,
      unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    create function storage.extension(name text) returns text language sql immutable as $$
      select lower(substring(name from '\\.([^.]*)$'))
    $$;
  `);
}

function loadMigrations() {
  return readdirSync(migrationDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readFileSync(`${migrationDirectory}/${fileName}`, "utf8"))
    .join("\n")
    .replace(
    /create extension if not exists pgcrypto with schema extensions;/i,
    "-- pgcrypto is emulated by this local validation harness",
  );
}

async function scalar(database, query, parameters = []) {
  const result = await database.query(query, parameters);
  return Object.values(result.rows[0] ?? {})[0];
}

async function main() {
  const database = new PGlite();
  try {
    await bootstrap(database);
    await database.exec(loadMigrations());
    await database.exec(readFileSync(seedPath, "utf8"));

    const tableCount = await scalar(
      database,
      "select count(*)::int from information_schema.tables where table_schema = 'public'",
    );
    const policyCount = await scalar(
      database,
      "select count(*)::int from pg_policies where schemaname = 'public'",
    );
    const functionCount = await scalar(
      database,
      "select count(*)::int from information_schema.routines where routine_schema in ('public', 'private')",
    );
    const rewardCount = await scalar(database, "select count(*)::int from public.reward_definitions");
    assert.equal(tableCount, 23);
    assert.equal(policyCount, 25);
    assert.ok(functionCount >= 34);
    assert.equal(rewardCount, 6);

    await database.query(
      "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)",
      [userId, "hero@example.test", JSON.stringify({ display_name: "גיבור" })],
    );
    await database.query(
      "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)",
      [userId],
    );

    await scalar(
      database,
      "select public.heartbeat_player_presence($1::uuid)",
      [presenceConnectionOne],
    );
    await scalar(
      database,
      "select public.heartbeat_player_presence($1::uuid)",
      [presenceConnectionTwo],
    );
    assert.equal(
      await scalar(
        database,
        "select count(*)::int from public.player_presence_events where event_type = 'joined'",
      ),
      1,
    );
    const onlinePlayer = (
      await database.query("select * from public.get_online_players()")
    ).rows[0];
    assert.equal(onlinePlayer.display_name, "גיבור");
    assert.equal(onlinePlayer.connection_count, 2);
    assert.equal("email" in onlinePlayer, false);

    await scalar(
      database,
      "select public.disconnect_player_presence($1::uuid)",
      [presenceConnectionOne],
    );
    assert.equal(
      await scalar(
        database,
        "select count(*)::int from public.player_presence_events where event_type = 'left'",
      ),
      0,
    );
    await scalar(
      database,
      "select public.disconnect_player_presence($1::uuid)",
      [presenceConnectionTwo],
    );
    assert.equal(
      await scalar(
        database,
        "select count(*)::int from public.player_presence_events where event_type = 'left'",
      ),
      1,
    );

    const customPortraitPath = `${userId}/${customPortraitObjectId}.png`;
    const customPortraitKey = `custom:${customPortraitPath}`;
    await database.query(
      "insert into storage.objects (bucket_id, name, owner_id, metadata) values ('character-portraits', $1, $2, $3::jsonb)",
      [customPortraitPath, userId, JSON.stringify({ mimetype: "image/png", size: 128 })],
    );
    const customCreateResult = await scalar(
      database,
      "select public.create_character($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::uuid)",
      [
        "נריה",
        "human",
        "fighter",
        "former-soldier",
        customPortraitKey,
        JSON.stringify({
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        }),
        "",
        null,
        customPortraitCommandId,
      ],
    );
    assert.equal(
      await scalar(database, "select portrait_key from public.characters where id = $1", [customCreateResult.character_id]),
      customPortraitKey,
    );
    const duplicateCustomCreate = await scalar(
      database,
      "select public.create_character($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::uuid)",
      [
        "שם שלא יחליף",
        "human",
        "fighter",
        "former-soldier",
        "portrait-human-05",
        JSON.stringify({
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        }),
        "",
        null,
        customPortraitCommandId,
      ],
    );
    assert.equal(duplicateCustomCreate.duplicate, true);
    assert.equal(
      await scalar(database, "select portrait_key from public.characters where id = $1", [customCreateResult.character_id]),
      customPortraitKey,
    );
    assert.equal(
      await scalar(database, "select private.can_delete_character_portrait($1)", [customPortraitPath]),
      false,
    );

    const createResult = await scalar(
      database,
      "select public.create_character($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::uuid)",
      [
        "ארדן",
        "human",
        "fighter",
        "former-soldier",
        "portrait-human-01",
        JSON.stringify({
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        }),
        "",
        null,
        createCommandId,
      ],
    );
    const characterId = createResult.character_id;
    assert.match(characterId, /^[0-9a-f-]{36}$/i);

    const character = (
      await database.query("select * from public.characters where id = $1", [characterId])
    ).rows[0];
    const attributes = (
      await database.query("select * from public.character_attributes where character_id = $1", [characterId])
    ).rows[0];
    const inventoryRows = (
      await database.query(
        "select * from public.character_inventory where character_id = $1 order by acquired_at, id",
        [characterId],
      )
    ).rows;
    const equipmentRows = (
      await database.query("select * from public.character_equipment where character_id = $1", [characterId])
    ).rows;
    const now = new Date().toISOString();
    const maximumHealth = character.maximum_health + 6;
    const maximumResource = character.maximum_primary_resource + 2;
    const inventory = inventoryRows.map((row) => ({
      id: row.id,
      itemId: row.item_id,
      quantity: row.quantity,
      durability: row.durability,
      customData: {},
      acquiredAt: new Date(row.acquired_at).toISOString(),
    }));
    const equipment = Object.fromEntries(
      equipmentRows.map((row) => [
        row.slot === "off_hand" ? "offhand" : row.slot,
        row.inventory_entry_id,
      ]),
    );
    const gameState = {
      saveVersion: 2,
      character: {
        id: characterId,
        ownerId: userId,
        name: character.name,
        description: "",
        formOfAddress: null,
        raceId: "human",
        classId: "fighter",
        backgroundId: "former-soldier",
        portraitKey: "portrait-human-01",
        level: 99,
        experience: 500,
        attributes: {
          strength: attributes.strength,
          dexterity: attributes.dexterity,
          constitution: attributes.constitution,
          intelligence: attributes.intelligence,
          wisdom: attributes.wisdom,
          charisma: attributes.charisma,
        },
        derivedStats: {
          maximumHealth,
          armor: 10,
          accuracy: 2,
          initiative: 0,
          maximumPrimaryResource: maximumResource,
          carryCapacity: 30,
        },
        currentHealth: maximumHealth,
        primaryResource: maximumResource,
        gold: 55,
        reputation: 1,
        currentLocationId: "arfelon-square",
        chapterId: "shadows-beneath-mistvale",
        createdAt: now,
        updatedAt: now,
        lastPlayedAt: now,
        isActive: true,
      },
      inventory,
      equipment,
      quests: [
        {
          questId: "shadows-beneath-village",
          status: "active",
          objectives: { "speak-to-headman": "completed", "prepare-for-mine": "active" },
          startedAt: now,
          completedAt: null,
          rewardClaimed: false,
        },
      ],
      story: {
        flags: { met_elric: true },
        relationships: { elric: { npcId: "elric", trust: 2, respect: 1, fear: 0 } },
        reputation: 1,
        currentSceneId: "scene-preparation",
        currentLocationId: "arfelon-square",
        visitedLocationIds: ["village-gate", "arfelon-square"],
      },
      journal: [],
      playtimeSeconds: 60,
      rewardedEventIds: [],
      savedAt: now,
      discoveredLocationIds: ["village-gate", "arfelon-square"],
      activeCheckpointId: "checkpoint-preparation",
    };
    const envelope = {
      schema_version: 2,
      character_id: characterId,
      chapter_id: "shadows-beneath-mistvale",
      current_location_id: "arfelon-square",
      game_state: gameState,
    };
    const saveResult = await scalar(
      database,
      "select public.save_character_snapshot($1::uuid, $2::uuid, 1, $3::jsonb, 'checkpoint')",
      [saveCommandId, characterId, JSON.stringify(envelope)],
    );
    assert.equal(saveResult.save_version, 2);
    assert.equal(saveResult.duplicate, false);

    const duplicateSave = await scalar(
      database,
      "select public.save_character_snapshot($1::uuid, $2::uuid, 1, $3::jsonb, 'checkpoint')",
      [saveCommandId, characterId, JSON.stringify(envelope)],
    );
    assert.equal(duplicateSave.duplicate, true);

    const synchronized = (
      await database.query(
        "select level, experience, current_location_id, save_version from public.characters where id = $1",
        [characterId],
      )
    ).rows[0];
    assert.deepEqual(synchronized, {
      level: 2,
      experience: 500,
      current_location_id: "arfelon-square",
      save_version: 2,
    });
    assert.equal(
      await scalar(database, "select count(*)::int from public.character_inventory where character_id = $1", [characterId]),
      inventory.length,
    );
    assert.equal(
      await scalar(database, "select count(*)::int from public.character_equipment where character_id = $1", [characterId]),
      Object.keys(equipment).length,
    );
    assert.equal(
      await scalar(database, "select count(*)::int from public.character_story_flags where character_id = $1", [characterId]),
      1,
    );
    assert.equal(
      await scalar(database, "select count(*)::int from public.character_relationships where character_id = $1", [characterId]),
      1,
    );
    assert.equal(
      await scalar(database, "select count(*)::int from public.character_discovered_locations where character_id = $1", [characterId]),
      2,
    );

    console.log(
      `Migration verified: ${tableCount} tables, ${policyCount} policies, ${functionCount} functions, ${rewardCount} rewards, transactional save sync passed.`,
    );
  } finally {
    await database.close();
  }
}

await main();
