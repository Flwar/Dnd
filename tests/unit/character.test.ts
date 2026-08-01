import { describe, expect, it } from "vitest";
import { characterBackgrounds, characterClasses, characterRaces } from "../../src/content";
import {
  POINT_BUY_BUDGET,
  applyRaceAttributes,
  classStartingInventory,
  deriveStats,
  pointBuyCost,
  validateCharacter,
} from "../../src/game/character";
import type { Attributes } from "../../src/types/game";
import { now } from "./fixtures";

const validAttributes: Attributes = {
  strength: 15,
  dexterity: 12,
  constitution: 14,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

describe("יצירת דמות", () => {
  it("מאמת בנייה חוקית בתקציב נקודות", () => {
    const result = validateCharacter({
      name: "ליאורה",
      race: characterRaces[0],
      characterClass: characterClasses[0],
      background: characterBackgrounds[0],
      portraitKey: "portrait-human-01",
      baseAttributes: validAttributes,
    });
    expect(result.valid).toBe(true);
    expect(result.pointsSpent).toBeLessThanOrEqual(POINT_BUY_BUDGET);
  });

  it("דוחה שם לא תקין ובנייה שחורגת מן התקציב", () => {
    const attributes: Attributes = {
      strength: 15,
      dexterity: 15,
      constitution: 15,
      intelligence: 15,
      wisdom: 15,
      charisma: 15,
    };
    const result = validateCharacter({
      name: "A!",
      race: characterRaces[0],
      characterClass: characterClasses[0],
      background: characterBackgrounds[0],
      portraitKey: "portrait-human-01",
      baseAttributes: attributes,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(pointBuyCost(attributes)).toBeGreaterThan(POINT_BUY_BUDGET);
  });

  it("מיישם תוספי גזע בלי לשנות את ערכי הבסיס", () => {
    const elf = characterRaces.find((race) => race.id === "elf")!;
    const result = applyRaceAttributes(validAttributes, elf);
    expect(result.dexterity).toBe(validAttributes.dexterity + 2);
    expect(result.wisdom).toBe(validAttributes.wisdom + 1);
    expect(validAttributes.dexterity).toBe(12);
  });

  it("מחשב נתוני פתיחה שונים בין לוחם לקוסם", () => {
    const fighter = deriveStats(validAttributes, characterClasses.find((entry) => entry.id === "fighter")!);
    const mage = deriveStats(validAttributes, characterClasses.find((entry) => entry.id === "mage")!);
    expect(fighter.maximumHealth).toBeGreaterThan(mage.maximumHealth);
    expect(mage.maximumPrimaryResource).toBeGreaterThan(fighter.maximumPrimaryResource);
  });

  it("יוצר ציוד התחלתי מן המקצוע ומן הרקע ללא כפילויות", () => {
    const characterClass = characterClasses.find((entry) => entry.id === "fighter")!;
    const background = characterBackgrounds.find((entry) => entry.id === "former-soldier")!;
    const inventory = classStartingInventory(characterClass, background, now);
    expect(inventory.map((entry) => entry.itemId)).toEqual(
      expect.arrayContaining(["iron-longsword", "chain-shirt", "soldier-rope"]),
    );
    expect(new Set(inventory.map((entry) => entry.itemId)).size).toBe(inventory.length);
  });
});
