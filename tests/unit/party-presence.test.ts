import { describe, expect, it } from "vitest";
import {
  PARTY_PRESENCE_LEASE_MS,
  partyMemberIsPresent,
} from "@/lib/party/presence";

describe("חכירת נוכחות בחבורה", () => {
  const now = Date.parse("2026-08-08T12:00:00.000Z");

  it("מקבל חבר מחובר עם heartbeat טרי", () => {
    expect(partyMemberIsPresent({
      connection_state: "connected",
      last_seen_at: new Date(now - PARTY_PRESENCE_LEASE_MS + 1).toISOString(),
    }, now)).toBe(true);
  });

  it("לא מציג connected ישן כאילו השחקן עדיין בחדר", () => {
    expect(partyMemberIsPresent({
      connection_state: "connected",
      last_seen_at: new Date(now - PARTY_PRESENCE_LEASE_MS - 1).toISOString(),
    }, now)).toBe(false);
  });

  it("מכבד ניתוק מפורש גם כאשר last_seen טרי", () => {
    expect(partyMemberIsPresent({
      connection_state: "disconnected",
      last_seen_at: new Date(now).toISOString(),
    }, now)).toBe(false);
  });
});
