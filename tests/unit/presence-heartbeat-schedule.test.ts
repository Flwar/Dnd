import { describe, expect, it } from "vitest";
import {
  canSendPresenceHeartbeat,
  getPresenceHeartbeatDelay,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  PRESENCE_HEARTBEAT_MAX_BACKOFF_MS,
  PRESENCE_ROSTER_REFRESH_INTERVAL_MS,
} from "../../src/lib/presence/heartbeat-schedule";

describe("presence heartbeat schedule", () => {
  it("uses a 60 second healthy interval and exponential retry delays", () => {
    expect(getPresenceHeartbeatDelay(0)).toBe(PRESENCE_HEARTBEAT_INTERVAL_MS);
    expect(getPresenceHeartbeatDelay(1)).toBe(60_000);
    expect(getPresenceHeartbeatDelay(2)).toBe(120_000);
    expect(getPresenceHeartbeatDelay(3)).toBe(240_000);
  });

  it("caps retry backoff at five minutes", () => {
    expect(getPresenceHeartbeatDelay(4)).toBe(PRESENCE_HEARTBEAT_MAX_BACKOFF_MS);
    expect(getPresenceHeartbeatDelay(20)).toBe(PRESENCE_HEARTBEAT_MAX_BACKOFF_MS);
  });

  it("uses a five minute roster fallback because realtime handles join and leave events", () => {
    expect(PRESENCE_ROSTER_REFRESH_INTERVAL_MS).toBe(5 * PRESENCE_HEARTBEAT_INTERVAL_MS);
  });

  it("allows heartbeats only from an online, visible tab", () => {
    expect(canSendPresenceHeartbeat("visible", true)).toBe(true);
    expect(canSendPresenceHeartbeat("hidden", true)).toBe(false);
    expect(canSendPresenceHeartbeat("visible", false)).toBe(false);
  });
});
