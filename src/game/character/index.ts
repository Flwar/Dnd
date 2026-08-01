import type {
  Attributes,
  CharacterBackground,
  CharacterClass,
  CharacterRace,
  ClassId,
  DerivedStats,
  InventoryEntry,
  PlayerCharacter,
} from "../../types/game";
import { attributeModifier } from "../dice";

export const ATTRIBUTE_MINIMUM = 8;
export const ATTRIBUTE_MAXIMUM = 15;
export const POINT_BUY_BUDGET = 27;

const pointCosts: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export interface CharacterValidationInput {
  name: string;
  race?: CharacterRace;
  characterClass?: CharacterClass;
  background?: CharacterBackground;
  portraitKey: string;
  baseAttributes: Attributes;
}

export interface CharacterValidationResult {
  valid: boolean;
  errors: string[];
  pointsSpent: number;
}

export function pointBuyCost(attributes: Attributes): number {
  return Object.values(attributes).reduce((total, value) => total + (pointCosts[value] ?? 1_000), 0);
}

export function validateCharacter(input: CharacterValidationInput): CharacterValidationResult {
  const errors: string[] = [];
  const name = input.name.trim();
  if (name.length < 2 || name.length > 24) {
    errors.push("שם הדמות חייב להכיל בין 2 ל־24 תווים.");
  }
  if (!/^[\p{L}\p{M}'’־ -]+$/u.test(name)) {
    errors.push("שם הדמות יכול להכיל אותיות, רווחים, גרש ומקף בלבד.");
  }
  if (!input.race) errors.push("יש לבחור גזע.");
  if (!input.characterClass) errors.push("יש לבחור מקצוע.");
  if (!input.background) errors.push("יש לבחור רקע.");
  if (!input.portraitKey.trim()) errors.push("יש לבחור דיוקן.");

  for (const value of Object.values(input.baseAttributes)) {
    if (!Number.isInteger(value) || value < ATTRIBUTE_MINIMUM || value > ATTRIBUTE_MAXIMUM) {
      errors.push("כל תכונה חייבת להיות מספר שלם בין 8 ל־15 לפני תוספי גזע.");
      break;
    }
  }
  const pointsSpent = pointBuyCost(input.baseAttributes);
  if (pointsSpent > POINT_BUY_BUDGET) {
    errors.push(`חרגת מתקציב התכונות ב־${pointsSpent - POINT_BUY_BUDGET} נקודות.`);
  }

  return { valid: errors.length === 0, errors, pointsSpent };
}

export function applyRaceAttributes(base: Attributes, race: CharacterRace): Attributes {
  return Object.fromEntries(
    Object.entries(base).map(([key, value]) => [
      key,
      value + (race.attributeEffects[key as keyof Attributes] ?? 0),
    ]),
  ) as unknown as Attributes;
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function deriveStats(
  attributes: Attributes,
  characterClass: CharacterClass,
  level = 1,
): DerivedStats {
  const constitution = attributeModifier(attributes.constitution);
  const dexterity = attributeModifier(attributes.dexterity);
  const strength = attributeModifier(attributes.strength);
  const primaryAttribute = characterClass.recommendedAttributes[0];
  return {
    maximumHealth: Math.max(1, characterClass.startingHealth + constitution + (level - 1) * (4 + Math.max(0, constitution))),
    armor: 10 + dexterity,
    accuracy: proficiencyBonus(level) + attributeModifier(attributes[primaryAttribute]),
    initiative: dexterity,
    maximumPrimaryResource: characterClass.startingResource + Math.max(0, attributeModifier(attributes[primaryAttribute])) + (level - 1) * 2,
    carryCapacity: 30 + Math.max(0, strength) * 5,
  };
}

export function classStartingInventory(
  characterClass: CharacterClass,
  background: CharacterBackground,
  createdAt: string,
): InventoryEntry[] {
  const itemIds = [characterClass.startingWeaponId, background.startingItemId];
  if (characterClass.startingArmorId) itemIds.push(characterClass.startingArmorId);
  return [...new Set(itemIds)].map((itemId, index) => ({
    id: `starting-${index + 1}-${itemId}`,
    itemId,
    quantity: 1,
    durability: 100,
    customData: {},
    acquiredAt: createdAt,
  }));
}

export function reconcileDerivedStats(
  character: PlayerCharacter,
  characterClass: CharacterClass,
): PlayerCharacter {
  const derivedStats = deriveStats(character.attributes, characterClass, character.level);
  return {
    ...character,
    derivedStats,
    currentHealth: Math.min(character.currentHealth, derivedStats.maximumHealth),
    primaryResource: Math.min(character.primaryResource, derivedStats.maximumPrimaryResource),
  };
}

export function primaryAttributeForClass(classId: ClassId): keyof Attributes {
  const map: Record<ClassId, keyof Attributes> = {
    fighter: "strength",
    mage: "intelligence",
    rogue: "dexterity",
    ranger: "dexterity",
    cleric: "wisdom",
    barbarian: "strength",
  };
  return map[classId];
}
