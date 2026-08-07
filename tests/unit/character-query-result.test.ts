import { describe, expect, it, vi } from "vitest";
import { assertCharacterQuerySucceeded } from "../../src/lib/game/character-query-result";

describe("character load query result", () => {
  it("does nothing for a successful query", () => {
    const logError = vi.fn();
    expect(() => assertCharacterQuerySucceeded({ error: null }, "inventory", logError)).not.toThrow();
    expect(logError).not.toHaveBeenCalled();
  });

  it("surfaces a temporary database failure instead of treating data as empty", () => {
    const databaseError = { code: "PGRST002", message: "schema cache unavailable" };
    const logError = vi.fn();

    try {
      assertCharacterQuerySucceeded({ error: databaseError }, "inventory", logError);
      expect.unreachable("the failed query must throw");
    } catch (error) {
      expect(error).toMatchObject({
        message: "CHARACTER_LOAD_UNAVAILABLE",
        cause: databaseError,
      });
    }
    expect(logError).toHaveBeenCalledWith(
      "[game] character load query failed",
      { query: "inventory", code: "PGRST002" },
    );
  });
});
