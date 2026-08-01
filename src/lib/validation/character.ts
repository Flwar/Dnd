import { z } from "zod";
import { pointBuyCost } from "@/game/character";
import { racePortraitKeys } from "@/lib/assets/manifest";
import { parseCustomPortraitKey } from "@/lib/portrait-upload";

const racePortraitKeySet = new Set<string>(racePortraitKeys);

const attributesSchema = z.object({
  strength: z.number().int().min(8).max(15),
  dexterity: z.number().int().min(8).max(15),
  constitution: z.number().int().min(8).max(15),
  intelligence: z.number().int().min(8).max(15),
  wisdom: z.number().int().min(8).max(15),
  charisma: z.number().int().min(8).max(15),
});

export const characterDraftSchema = z
  .object({
    name: z.string().trim().min(2, "שם הדמות חייב להכיל לפחות שני תווים.").max(24, "שם הדמות יכול להכיל עד עשרים וארבעה תווים.").regex(/^[\p{L}\p{M}'’־\- ]+$/u, "שם הדמות יכול להכיל אותיות, רווחים, גרש ומקף בלבד."),
    description: z.string().trim().max(240, "התיאור יכול להכיל עד מאתיים וארבעים תווים."),
    formOfAddress: z.string().trim().max(32, "צורת הפנייה ארוכה מדי."),
    raceId: z.enum(["human", "elf", "dwarf", "halfling", "orc", "dragonborn"]),
    classId: z.enum(["fighter", "mage", "rogue", "ranger", "cleric", "barbarian", "king"]),
    backgroundId: z.enum(["former-soldier", "wandering-scholar", "border-hunter", "former-criminal", "fallen-noble", "temple-servant", "road-orphan"]),
    portraitKey: z.string().refine(
      (key) => racePortraitKeySet.has(key) || parseCustomPortraitKey(key) !== null,
      "יש לבחור דיוקן זמין.",
    ),
    attributes: attributesSchema,
  })
  .refine((value) => pointBuyCost(value.attributes) <= 27, { path: ["attributes"], message: "חרגת מתקציב התכונות." });

export type CharacterDraftInput = z.infer<typeof characterDraftSchema>;
