import { z } from "zod";
import type { SaveData, SaveDataV1, SaveDataV2 } from "../../types/game";

const isoDate = z.string().datetime({ offset: true });
const nonNegativeInteger = z.number().int().nonnegative();

const attributesSchema = z.object({
  strength: z.number().int().min(1).max(30),
  dexterity: z.number().int().min(1).max(30),
  constitution: z.number().int().min(1).max(30),
  intelligence: z.number().int().min(1).max(30),
  wisdom: z.number().int().min(1).max(30),
  charisma: z.number().int().min(1).max(30),
});

const derivedStatsSchema = z.object({
  maximumHealth: z.number().int().positive(),
  armor: z.number().int().min(0),
  accuracy: z.number().int(),
  initiative: z.number().int(),
  maximumPrimaryResource: z.number().int().nonnegative(),
  carryCapacity: z.number().nonnegative(),
});

const characterSchema = z
  .object({
    id: z.string().min(1),
    ownerId: z.string().min(1),
    name: z.string().trim().min(2).max(24),
    description: z.string().max(600),
    formOfAddress: z.string().max(40).nullable(),
    raceId: z.enum(["human", "elf", "dwarf", "halfling", "orc", "dragonborn"]),
    classId: z.enum(["fighter", "mage", "rogue", "ranger", "cleric", "barbarian"]),
    backgroundId: z.enum([
      "former-soldier",
      "wandering-scholar",
      "border-hunter",
      "former-criminal",
      "fallen-noble",
      "temple-servant",
      "road-orphan",
    ]),
    portraitKey: z.string().min(1),
    level: z.number().int().min(1).max(10),
    experience: nonNegativeInteger,
    attributes: attributesSchema,
    derivedStats: derivedStatsSchema,
    currentHealth: z.number().int().nonnegative(),
    primaryResource: z.number().int().nonnegative(),
    gold: nonNegativeInteger,
    reputation: z.number().int().min(-100).max(100),
    currentLocationId: z.string().min(1),
    chapterId: z.string().min(1),
    createdAt: isoDate,
    updatedAt: isoDate,
    lastPlayedAt: isoDate,
    isActive: z.boolean(),
  })
  .superRefine((character, context) => {
    if (character.currentHealth > character.derivedStats.maximumHealth) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["currentHealth"], message: "החיים הנוכחיים חורגים מן המרב." });
    }
    if (character.primaryResource > character.derivedStats.maximumPrimaryResource) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["primaryResource"], message: "המשאב הנוכחי חורג מן המרב." });
    }
  });

const inventoryEntrySchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  durability: z.number().min(0).max(100).nullable(),
  customData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  acquiredAt: isoDate,
});

const equipmentSchema = z
  .object({
    weapon: z.string().optional(),
    offhand: z.string().optional(),
    armor: z.string().optional(),
    helmet: z.string().optional(),
    gloves: z.string().optional(),
    boots: z.string().optional(),
    ring: z.string().optional(),
    amulet: z.string().optional(),
  })
  .strict();

const questStateSchema = z.object({
  questId: z.string().min(1),
  status: z.enum(["hidden", "available", "active", "completed", "failed"]),
  objectives: z.record(z.string(), z.enum(["hidden", "active", "completed", "failed"])),
  startedAt: isoDate.nullable(),
  completedAt: isoDate.nullable(),
  rewardClaimed: z.boolean(),
});

const relationshipSchema = z.object({
  npcId: z.string().min(1),
  trust: z.number().int().min(-100).max(100),
  respect: z.number().int().min(-100).max(100),
  fear: z.number().int().min(-100).max(100),
});

const storySchema = z.object({
  flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  relationships: z.record(z.string(), relationshipSchema),
  reputation: z.number().int().min(-100).max(100),
  currentSceneId: z.string().min(1),
  currentLocationId: z.string().min(1),
  visitedLocationIds: z.array(z.string().min(1)),
});

const journalEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  discoveredAt: isoDate,
});

const saveBaseShape = {
  character: characterSchema,
  inventory: z.array(inventoryEntrySchema),
  equipment: equipmentSchema,
  quests: z.array(questStateSchema),
  story: storySchema,
  journal: z.array(journalEntrySchema),
  playtimeSeconds: nonNegativeInteger,
  rewardedEventIds: z.array(z.string().min(1)),
  savedAt: isoDate,
};

export const saveDataV1Schema = z.object({ saveVersion: z.literal(1), ...saveBaseShape });
export const saveDataV2Schema = z.object({
  saveVersion: z.literal(2),
  ...saveBaseShape,
  discoveredLocationIds: z.array(z.string().min(1)),
  activeCheckpointId: z.string().min(1),
});

export const anySaveDataSchema = z.discriminatedUnion("saveVersion", [saveDataV1Schema, saveDataV2Schema]);

export type SaveValidationResult =
  | { ok: true; data: SaveData }
  | { ok: false; message: string; issues: string[] };

export function migrateSave(input: unknown): SaveData {
  const parsed = anySaveDataSchema.parse(input);
  if (parsed.saveVersion === 2) return parsed as unknown as SaveDataV2;
  const v1 = parsed as unknown as SaveDataV1;
  return {
    ...v1,
    saveVersion: 2,
    discoveredLocationIds: [...new Set(v1.story.visitedLocationIds)],
    activeCheckpointId: `checkpoint-${v1.story.currentSceneId}`,
  };
}

export function validateAndMigrateSave(input: unknown): SaveValidationResult {
  try {
    return { ok: true, data: migrateSave(input) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        message: "השמירה אינה תקינה או שייכת לגרסה שאינה נתמכת.",
        issues: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
      };
    }
    return { ok: false, message: "לא הצלחנו לקרוא את השמירה.", issues: [] };
  }
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(saveDataV2Schema.parse(save));
}

export function parseSaveJson(serialized: string): SaveValidationResult {
  try {
    return validateAndMigrateSave(JSON.parse(serialized) as unknown);
  } catch {
    return { ok: false, message: "קובץ השמירה אינו מכיל מידע תקין.", issues: [] };
  }
}
