import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("character load query safety contract", () => {
  it("checks all nine Supabase results before reading their data", async () => {
    const source = await readFile(
      new URL("../../src/lib/game/load-character.ts", import.meta.url),
      "utf8",
    );
    const dataReadIndex = source.indexOf("const row = characterResult.data");
    const assertions = [
      "characterResult",
      "attributesResult",
      "inventoryResult",
      "equipmentResult",
      "questsResult",
      "flagsResult",
      "relationshipsResult",
      "locationsResult",
      "latestResult",
    ];

    expect(dataReadIndex).toBeGreaterThan(0);
    for (const result of assertions) {
      const assertionIndex = source.indexOf(`assertCharacterQuerySucceeded(${result},`);
      expect(assertionIndex, `${result} must be checked`).toBeGreaterThan(0);
      expect(assertionIndex, `${result} must be checked before data is read`).toBeLessThan(dataReadIndex);
    }
  });
});
