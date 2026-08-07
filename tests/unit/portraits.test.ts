import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTRAIT_KEY,
  getPortraitSource,
  isCustomPortraitKey,
  isPresetPortraitKey,
  portraitAfterRaceChange,
} from "../../src/lib/portraits";

const customPortraitKey = "custom:1b26a8d4-736f-47c8-8f8d-cfca3762e92f/4b83adf0-e228-4650-9f90-caa77385f308.webp";

describe("פתרון מקור דיוקן", () => {
  it("מזהה מפתח מותאם רק בתבנית המאובטחת", () => {
    expect(isCustomPortraitKey(customPortraitKey)).toBe(true);
    expect(isCustomPortraitKey("custom:../portrait.webp")).toBe(false);
    expect(isCustomPortraitKey("custom:javascript:alert(1)")).toBe(false);
  });

  it("מחזיר נתיב מקומי לדיוקן מובנה", () => {
    expect(isPresetPortraitKey("portrait-elf-01")).toBe(true);
    expect(getPortraitSource("portrait-elf-01")).toEqual({
      kind: "preset",
      src: "/assets/art-v2/portraits/portrait-elf-01.webp",
    });
  });

  it("מחזיר נתיב API מקודד לדיוקן מותאם שנשמר", () => {
    expect(getPortraitSource(customPortraitKey)).toEqual({
      kind: "custom",
      src: `/api/character-portraits?portraitKey=${encodeURIComponent(customPortraitKey)}`,
    });
  });

  it("שומר תמונה אישית בשינוי גזע ומחליף דיוקן מובנה", () => {
    expect(portraitAfterRaceChange(customPortraitKey, "portrait-elf-01")).toBe(customPortraitKey);
    expect(portraitAfterRaceChange("portrait-human-03", "portrait-elf-01")).toBe("portrait-elf-01");
  });

  it("משתמש בתצוגה מקדימה בטוחה ובברירת מחדל למפתח לא מוכר", () => {
    expect(getPortraitSource(customPortraitKey, "blob:https://example.test/preview")).toEqual({
      kind: "custom",
      src: "blob:https://example.test/preview",
    });
    expect(getPortraitSource(customPortraitKey, "javascript:alert(1)").src).toContain("/api/character-portraits?");
    expect(getPortraitSource("portrait-unknown")).toEqual(getPortraitSource(DEFAULT_PORTRAIT_KEY));
  });
});
