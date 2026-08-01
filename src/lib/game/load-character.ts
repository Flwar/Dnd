import "server-only";

import { requireUser } from "@/lib/auth/require-user";
import { validateAndMigrateSave } from "@/game/persistence";
import { deriveStats } from "@/game/character";
import { equipmentStatBonuses } from "@/game/inventory";
import { normalizeQuestObjectives } from "@/game/quests";
import { classesById } from "@/content/classes";
import { itemsById } from "@/content/items";
import { questsById } from "@/content/quests";
import { unwrapCloudSaveEnvelope } from "@/lib/game/save-envelope";
import { npcs } from "@/content/npcs";
import type {
  Attributes,
  BackgroundId,
  CharacterId,
  CharacterQuestState,
  ClassId,
  Equipment,
  InventoryEntry,
  PlayerCharacter,
  RaceId,
  Relationship,
  SaveData,
  UserId,
} from "@/types/game";

export type LoadedGame = { save: SaveData; expectedSaveVersion: number };

function recordFromJson(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item))) as Record<string, string | number | boolean | null>;
}

export async function loadCharacterGame(characterId: string): Promise<LoadedGame | null> {
  const { supabase, user } = await requireUser(`/game/${characterId}`);
  const [characterResult, attributesResult, inventoryResult, equipmentResult, questsResult, flagsResult, relationshipsResult, locationsResult, latestResult] = await Promise.all([
    supabase.from("characters").select("*").eq("id", characterId).eq("owner_id", user.id).maybeSingle(),
    supabase.from("character_attributes").select("*").eq("character_id", characterId).maybeSingle(),
    supabase.from("character_inventory").select("*").eq("character_id", characterId).order("acquired_at", { ascending: true }),
    supabase.from("character_equipment").select("*").eq("character_id", characterId),
    supabase.from("character_quests").select("*").eq("character_id", characterId),
    supabase.from("character_story_flags").select("*").eq("character_id", characterId),
    supabase.from("character_relationships").select("*").eq("character_id", characterId),
    supabase.from("character_discovered_locations").select("*").eq("character_id", characterId),
    supabase.rpc("get_latest_character_save", { p_character_id: characterId }),
  ]);
  const row = characterResult.data;
  const attributeRow = attributesResult.data;
  if (!row || !attributeRow) return null;

  const latest = latestResult.data?.[0];
  let latestSave: SaveData | null = null;
  if (latest) {
    const validated = validateAndMigrateSave(unwrapCloudSaveEnvelope(latest.snapshot));
    if (validated.ok && validated.data.character.ownerId === user.id && validated.data.character.id === characterId) {
      latestSave = validated.data;
    }
  }

  const attributes: Attributes = {
    strength: attributeRow.strength,
    dexterity: attributeRow.dexterity,
    constitution: attributeRow.constitution,
    intelligence: attributeRow.intelligence,
    wisdom: attributeRow.wisdom,
    charisma: attributeRow.charisma,
  };
  const characterClass = classesById[row.class_id as ClassId];
  if (!characterClass) return null;
  const calculated = deriveStats(attributes, characterClass, row.level);
  let character: PlayerCharacter = {
    id: row.id as CharacterId,
    ownerId: row.owner_id as UserId,
    name: row.name,
    description: row.description ?? "",
    formOfAddress: row.form_of_address,
    raceId: row.race_id as RaceId,
    classId: row.class_id as ClassId,
    backgroundId: row.background_id as BackgroundId,
    portraitKey: row.portrait_key,
    level: row.level,
    experience: row.experience,
    attributes,
    derivedStats: { ...calculated, maximumHealth: row.maximum_health, maximumPrimaryResource: row.maximum_primary_resource },
    currentHealth: row.current_health,
    primaryResource: row.primary_resource,
    gold: row.gold,
    reputation: row.reputation,
    currentLocationId: row.current_location_id,
    chapterId: row.chapter_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPlayedAt: row.last_played_at,
    isActive: row.is_active,
  };
  const inventory: InventoryEntry[] = (inventoryResult.data ?? []).map((entry) => ({
    id: entry.id,
    itemId: entry.item_id,
    quantity: entry.quantity,
    durability: entry.durability,
    customData: recordFromJson(entry.custom_data),
    acquiredAt: entry.acquired_at,
  }));
  const equipment: Equipment = Object.fromEntries((equipmentResult.data ?? []).map((entry) => [entry.slot === "off_hand" ? "offhand" : entry.slot, entry.inventory_entry_id]));
  const bonuses = equipmentStatBonuses(equipment, inventory, itemsById);
  const equippedAttributes = Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [key, value + (bonuses[key] ?? 0)]),
  ) as Attributes;
  const equippedBase = deriveStats(equippedAttributes, characterClass, row.level);
  character = {
    ...character,
    derivedStats: {
      maximumHealth: row.maximum_health,
      armor: equippedBase.armor + (bonuses.armor ?? 0),
      accuracy: equippedBase.accuracy + (bonuses.accuracy ?? 0),
      initiative: equippedBase.initiative + (bonuses.initiative ?? 0),
      maximumPrimaryResource: row.maximum_primary_resource,
      carryCapacity: equippedBase.carryCapacity + (bonuses.carryCapacity ?? 0),
    },
  };
  const flags = Object.fromEntries((flagsResult.data ?? []).flatMap((flag) => ["string", "number", "boolean"].includes(typeof flag.value) ? [[flag.flag_key, flag.value as string | number | boolean]] : []));
  const quests: CharacterQuestState[] = (questsResult.data ?? []).flatMap((quest) => {
    const definition = questsById[quest.quest_id];
    if (!definition) return [];
    const questData = quest.quest_data && typeof quest.quest_data === "object" && !Array.isArray(quest.quest_data) ? quest.quest_data : {};
    const objectiveData = "objectives" in questData && questData.objectives && typeof questData.objectives === "object" && !Array.isArray(questData.objectives) ? questData.objectives : {};
    return [{
      questId: quest.quest_id,
      status: quest.status,
      objectives: normalizeQuestObjectives(definition, objectiveData, flags),
      startedAt: quest.started_at,
      completedAt: quest.completed_at,
      rewardClaimed: questData.reward_claimed === true,
    }];
  });
  const relationships: Record<string, Relationship> = Object.fromEntries(npcs.map((npc) => [npc.id, npc.initialRelationship]));
  for (const relation of relationshipsResult.data ?? []) {
    relationships[relation.npc_id] = { npcId: relation.npc_id, trust: relation.trust, respect: relation.respect, fear: relation.fear };
  }
  const visited = [...new Set((locationsResult.data ?? []).map((location) => location.location_id))];
  const now = new Date().toISOString();
  const relationalSave: SaveData = {
    saveVersion: 2,
    character,
    inventory,
    equipment,
    quests,
    story: {
      flags,
      relationships,
      reputation: row.reputation,
      currentSceneId: "scene-arrival",
      currentLocationId: row.current_location_id,
      visitedLocationIds: visited.length ? visited : [row.current_location_id],
    },
    journal: [],
    playtimeSeconds: 0,
    rewardedEventIds: [],
    savedAt: now,
    discoveredLocationIds: visited.length ? visited : [row.current_location_id],
    activeCheckpointId: "checkpoint-arrival",
  };
  if (!latestSave) return { save: relationalSave, expectedSaveVersion: row.save_version };

  // A snapshot owns narrative presentation state, while the normalized tables
  // own security-sensitive character, inventory and equipment state. Overlaying
  // the two also makes a server-granted reward visible after a refresh even
  // when it was granted immediately after the latest autosave.
  const discoveredLocationIds = [...new Set([
    ...latestSave.discoveredLocationIds,
    ...relationalSave.discoveredLocationIds,
  ])];
  const save: SaveData = {
    ...latestSave,
    character: relationalSave.character,
    inventory: relationalSave.inventory,
    equipment: relationalSave.equipment,
    quests: latestSave.quests.length ? latestSave.quests : relationalSave.quests,
    story: {
      ...latestSave.story,
      flags: { ...latestSave.story.flags, ...relationalSave.story.flags },
      relationships: { ...latestSave.story.relationships, ...relationalSave.story.relationships },
      reputation: relationalSave.character.reputation,
      currentLocationId: relationalSave.character.currentLocationId,
      visitedLocationIds: [...new Set([
        ...latestSave.story.visitedLocationIds,
        ...relationalSave.story.visitedLocationIds,
      ])],
    },
    discoveredLocationIds,
  };
  return { save, expectedSaveVersion: latest?.save_version ?? row.save_version };
}
