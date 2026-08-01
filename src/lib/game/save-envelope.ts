import type { SaveData } from "@/types/game";

export type CloudSaveReason = "autosave" | "checkpoint" | "combat_victory" | "level_up" | "chapter_complete" | "manual" | "migration";

export function cloudSaveReason(reason: string): CloudSaveReason {
  if (reason.includes("combat-victory")) return "combat_victory";
  if (reason.includes("level")) return "level_up";
  if (reason.includes("chapter")) return "chapter_complete";
  if (reason.includes("manual")) return "manual";
  if (reason.includes("checkpoint") || reason.includes("location") || reason.includes("opening")) return "checkpoint";
  if (reason.includes("migration")) return "migration";
  return "autosave";
}

export function createCloudSaveEnvelope(save: SaveData) {
  return {
    schema_version: save.saveVersion,
    character_id: save.character.id,
    chapter_id: save.character.chapterId,
    current_location_id: save.story.currentLocationId,
    game_state: save,
  };
}

export function unwrapCloudSaveEnvelope(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const envelope = value as Record<string, unknown>;
  return envelope.game_state ?? value;
}
