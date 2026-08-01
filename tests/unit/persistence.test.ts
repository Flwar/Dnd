import { describe, expect, it } from "vitest";
import {
  migrateSave,
  parseSaveJson,
  serializeSave,
  validateAndMigrateSave,
} from "../../src/game/persistence";
import {
  cloudSaveReason,
  createCloudSaveEnvelope,
  unwrapCloudSaveEnvelope,
} from "../../src/lib/game/save-envelope";
import { makeCharacter, makeSaveV1 } from "./fixtures";

describe("שמירה וגרסאות", () => {
  it("מעביר שמירה מגרסה 1 לגרסה 2 בלי לאבד התקדמות", () => {
    const migrated = migrateSave(makeSaveV1());
    expect(migrated.saveVersion).toBe(2);
    expect(migrated.character.name).toBe("נעמה");
    expect(migrated.discoveredLocationIds).toEqual(["village-gate"]);
    expect(migrated.activeCheckpointId).toBe("checkpoint-scene-arrival");
  });

  it("דוחה שמירה עם חיים מעל המקסימום", () => {
    const invalid = makeSaveV1({
      character: makeCharacter({ currentHealth: 99 }),
    });
    const result = validateAndMigrateSave(invalid);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.includes("currentHealth"))).toBe(true);
  });

  it("דוחה גרסת שמירה לא מוכרת", () => {
    const result = validateAndMigrateSave({ ...makeSaveV1(), saveVersion: 99 });
    expect(result.ok).toBe(false);
  });

  it("מבצע סבב כתיבה וקריאה של שמירה תקינה", () => {
    const migrated = migrateSave(makeSaveV1());
    const parsed = parseSaveJson(serializeSave(migrated));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.character.id).toBe(migrated.character.id);
    expect(parsed.data.saveVersion).toBe(2);
  });

  it("מחזיר שגיאה ידידותית עבור מידע שאינו JSON", () => {
    const result = parseSaveJson("{not-json}");
    expect(result).toMatchObject({ ok: false });
  });

  it("עוטף שמירת ענן בחוזה מסד הנתונים וטוען את מצב המשחק בחזרה", () => {
    const save = migrateSave(makeSaveV1());
    const envelope = createCloudSaveEnvelope(save);

    expect(envelope).toMatchObject({
      schema_version: 2,
      character_id: save.character.id,
      chapter_id: save.character.chapterId,
      current_location_id: save.story.currentLocationId,
    });
    expect(unwrapCloudSaveEnvelope(envelope)).toEqual(save);
    expect(validateAndMigrateSave(unwrapCloudSaveEnvelope(envelope))).toMatchObject({ ok: true });
  });

  it("ממפה סיבות שמירה חופשיות לערכים המאושרים במסד הנתונים", () => {
    expect(cloudSaveReason("combat-victory:guardian")).toBe("combat_victory");
    expect(cloudSaveReason("chapter-complete")).toBe("chapter_complete");
    expect(cloudSaveReason("location-transition")).toBe("checkpoint");
    expect(cloudSaveReason("periodic")).toBe("autosave");
  });
});
