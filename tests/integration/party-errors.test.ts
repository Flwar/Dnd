import { describe, expect, it } from "vitest";
import { mapPartyError } from "@/lib/party/errors";
import {
  createPartyInputSchema,
  joinPartyInputSchema,
  normalizeRoomCode,
} from "@/lib/party/validation";

describe("שגיאות וולידציה של לובי החבורה", () => {
  it.each([
    ["PARTY_NOT_FOUND", "PARTY_NOT_FOUND", "לא נמצאה חבורה"],
    ["PARTY_FULL", "PARTY_FULL", "החבורה מלאה"],
    ["LEADER_REQUIRED", "LEADER_REQUIRED", "רק מוביל החבורה"],
    ["TRANSFER_LEADERSHIP_BEFORE_LEAVING", "TRANSFER_LEADERSHIP_REQUIRED", "להעביר את הנהגת"],
    ["SESSION_VERSION_CONFLICT", "SESSION_CONFLICT", "מצב החבורה השתנה"],
  ] as const)("ממפה את %s להודעה עברית", (databaseMessage, code, messagePart) => {
    const result = mapPartyError({ message: databaseMessage });
    expect(result).toMatchObject({ ok: false, code });
    expect(result.message).toContain(messagePart);
  });

  it("מנרמל קוד חדר לפני השליחה", () => {
    expect(normalizeRoomCode(" a7-k 9q2 ")).toBe("A7K9Q2");
    const result = joinPartyInputSchema.parse({
      characterId: "10000000-0000-4000-8000-000000000001",
      roomCode: " a7k9q2 ",
    });
    expect(result.roomCode).toBe("A7K9Q2");
  });

  it("דוחה שם חבורה וגודל שאינם תקינים", () => {
    expect(createPartyInputSchema.safeParse({
      characterId: "10000000-0000-4000-8000-000000000001",
      name: "א",
      maximumMembers: 5,
    }).success).toBe(false);
  });
});
