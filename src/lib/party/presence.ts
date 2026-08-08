export const PARTY_PRESENCE_HEARTBEAT_MS = 20_000;
export const PARTY_PRESENCE_LEASE_MS = 180_000;

type PartyPresenceRecord = {
  connection_state: string;
  last_seen_at: string;
};

export function partyMemberIsPresent(
  member: PartyPresenceRecord,
  nowMs = Date.now(),
): boolean {
  if (member.connection_state !== "connected" && member.connection_state !== "reconnecting") {
    return false;
  }
  const lastSeenMs = Date.parse(member.last_seen_at);
  return Number.isFinite(lastSeenMs) && lastSeenMs >= nowMs - PARTY_PRESENCE_LEASE_MS;
}
