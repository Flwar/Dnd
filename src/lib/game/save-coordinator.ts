type SaveRequest<Snapshot, Result> = {
  snapshot: Snapshot;
  reason: string;
  waiters: Array<{
    resolve: (result: Result) => void;
    reject: (error: unknown) => void;
  }>;
};

type SaveCoordinatorOptions<Snapshot, Result> = {
  execute: (snapshot: Snapshot, reason: string, commandId: string) => Promise<Result>;
  makeCommandId: () => string;
  shouldContinue: (result: Result) => boolean;
  mergeReason?: (currentReason: string, incomingReason: string) => string;
  failureCooldownMs?: number;
  now?: () => number;
};

const DEFAULT_FAILURE_COOLDOWN_MS = 10_000;

function saveReasonPriority(reason: string) {
  if (reason.includes("chapter-complete")) return 100;
  if (reason.includes("combat-victory")) return 90;
  if (reason.includes("level")) return 80;
  if (reason.includes("checkpoint") || reason.includes("location") || reason.includes("opening")) return 70;
  if (reason.includes("manual")) return 60;
  return 10;
}

/**
 * Retains the strongest persistence reason while always saving the newest
 * snapshot. This keeps a checkpoint from being downgraded by an autosave that
 * was queued a few milliseconds later.
 */
export function mergeSaveReason(currentReason: string, incomingReason: string) {
  return saveReasonPriority(incomingReason) >= saveReasonPriority(currentReason)
    ? incomingReason
    : currentReason;
}

/**
 * A bounded latest-value queue for expensive cloud saves.
 *
 * At most one request is executing and one newest snapshot is waiting. Rapid
 * gameplay commits are coalesced instead of becoming an unbounded chain of
 * database transactions. A failed request also opens a short circuit breaker,
 * so an unavailable backend is not hammered by every subsequent click.
 */
export class LatestSaveCoordinator<Snapshot, Result> {
  private readonly execute: SaveCoordinatorOptions<Snapshot, Result>["execute"];
  private readonly makeCommandId: SaveCoordinatorOptions<Snapshot, Result>["makeCommandId"];
  private readonly shouldContinue: SaveCoordinatorOptions<Snapshot, Result>["shouldContinue"];
  private readonly mergeReason: NonNullable<SaveCoordinatorOptions<Snapshot, Result>["mergeReason"]>;
  private readonly failureCooldownMs: number;
  private readonly now: () => number;
  private pending: SaveRequest<Snapshot, Result> | null = null;
  private running = false;
  private blockedUntil = 0;
  private lastFailure: Result | null = null;

  constructor(options: SaveCoordinatorOptions<Snapshot, Result>) {
    this.execute = options.execute;
    this.makeCommandId = options.makeCommandId;
    this.shouldContinue = options.shouldContinue;
    this.mergeReason = options.mergeReason ?? mergeSaveReason;
    this.failureCooldownMs = options.failureCooldownMs ?? DEFAULT_FAILURE_COOLDOWN_MS;
    this.now = options.now ?? Date.now;
  }

  hasPending() {
    return this.pending !== null;
  }

  isCoolingDown() {
    return this.lastFailure !== null && this.now() < this.blockedUntil;
  }

  enqueue(snapshot: Snapshot, reason: string): Promise<Result> {
    if (this.isCoolingDown()) {
      return Promise.resolve(this.lastFailure!);
    }

    const result = new Promise<Result>((resolve, reject) => {
      if (this.pending) {
        this.pending.snapshot = snapshot;
        this.pending.reason = this.mergeReason(this.pending.reason, reason);
        this.pending.waiters.push({ resolve, reject });
        return;
      }

      this.pending = {
        snapshot,
        reason,
        waiters: [{ resolve, reject }],
      };
    });

    void this.drain();
    return result;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;

    try {
      while (this.pending) {
        const request = this.pending;
        this.pending = null;

        try {
          const result = await this.execute(
            request.snapshot,
            request.reason,
            this.makeCommandId(),
          );
          request.waiters.forEach(({ resolve }) => resolve(result));

          if (!this.shouldContinue(result)) {
            this.lastFailure = result;
            this.blockedUntil = this.now() + this.failureCooldownMs;
            this.resolvePendingWith(result);
            break;
          }

          this.lastFailure = null;
          this.blockedUntil = 0;
        } catch (error) {
          request.waiters.forEach(({ reject }) => reject(error));
          this.rejectPendingWith(error);
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }

  private resolvePendingWith(result: Result) {
    const pending = this.pending;
    this.pending = null;
    pending?.waiters.forEach(({ resolve }) => resolve(result));
  }

  private rejectPendingWith(error: unknown) {
    const pending = this.pending;
    this.pending = null;
    pending?.waiters.forEach(({ reject }) => reject(error));
  }
}

/**
 * Serializes saves for the same character across tabs in browsers that expose
 * the Web Locks API. The server still validates versions and command IDs; this
 * is only client-side pressure control.
 */
export async function withExclusiveCharacterSaveLock<Result>(
  characterId: string,
  task: () => Promise<Result>,
) {
  const lockManager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!lockManager || typeof lockManager.request !== "function") {
    return task();
  }

  return lockManager.request(`shattered-crown:save:${characterId}`, task);
}

/**
 * A Server Action can reject at the browser transport boundary before its
 * typed return value is received. Convert that rejection into the same result
 * channel as backend failures so callers get offline state and the coordinator
 * opens its circuit breaker instead of leaking an unhandled promise rejection.
 */
export async function executeCharacterSaveSafely<Result>(
  characterId: string,
  task: () => Promise<Result>,
  transportFailure: (error: unknown) => Result,
) {
  try {
    return await withExclusiveCharacterSaveLock(characterId, task);
  } catch (error) {
    return transportFailure(error);
  }
}
