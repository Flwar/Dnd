export const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000;
export const PRESENCE_HEARTBEAT_MAX_BACKOFF_MS = 5 * 60_000;
export const PRESENCE_ROSTER_REFRESH_INTERVAL_MS = 5 * 60_000;

export function getPresenceHeartbeatDelay(consecutiveFailures: number): number {
  const normalizedFailures = Number.isFinite(consecutiveFailures)
    ? Math.max(0, Math.floor(consecutiveFailures))
    : 0;
  const retryExponent = Math.max(0, normalizedFailures - 1);

  return Math.min(
    PRESENCE_HEARTBEAT_INTERVAL_MS * 2 ** retryExponent,
    PRESENCE_HEARTBEAT_MAX_BACKOFF_MS,
  );
}

export function canSendPresenceHeartbeat(
  visibilityState: DocumentVisibilityState,
  online: boolean,
): boolean {
  return visibilityState === "visible" && online;
}
