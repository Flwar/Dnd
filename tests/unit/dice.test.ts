import { describe, expect, it } from "vitest";
import { attributeModifier, resolveD20, rollDie } from "../../src/game/dice";

function seedForNatural(target: number): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    if (rollDie(seed, 20).roll === target) return seed;
  }
  throw new Error(`לא נמצא זרע לתוצאה ${target}`);
}

describe("מנוע הקוביות", () => {
  it.each([
    [8, -1],
    [9, -1],
    [10, 0],
    [12, 1],
    [15, 2],
    [18, 4],
  ])("מחשב תוסף תכונה עבור %i", (score, expected) => {
    expect(attributeModifier(score)).toBe(expected);
  });

  it("מחזיר אותה תוצאה לאותו זרע", () => {
    expect(resolveD20(42, 3, 12)).toEqual(resolveD20(42, 3, 12));
  });

  it("בוחר את הגבוה מבין שני גלגולים ביתרון", () => {
    const result = resolveD20(7_331, 0, 30, "advantage");
    expect(result.rolls).toHaveLength(2);
    expect(result.selectedRoll).toBe(Math.max(...result.rolls));
  });

  it("בוחר את הנמוך מבין שני גלגולים בחיסרון", () => {
    const result = resolveD20(7_331, 0, 1, "disadvantage");
    expect(result.rolls).toHaveLength(2);
    expect(result.selectedRoll).toBe(Math.min(...result.rolls));
  });

  it("מזהה הצלחה מכרעת לפי 20 טבעי גם מול קושי גבוה", () => {
    const result = resolveD20(seedForNatural(20), -5, 40);
    expect(result.selectedRoll).toBe(20);
    expect(result.outcome).toBe("critical-success");
  });

  it("מזהה כישלון מכריע לפי 1 טבעי גם עם תוסף גבוה", () => {
    const result = resolveD20(seedForNatural(1), 30, 2);
    expect(result.selectedRoll).toBe(1);
    expect(result.outcome).toBe("critical-failure");
  });
});
