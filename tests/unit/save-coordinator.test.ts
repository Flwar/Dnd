import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executeCharacterSaveSafely,
  LatestSaveCoordinator,
  mergeSaveReason,
  withExclusiveCharacterSaveLock,
} from "@/lib/game/save-coordinator";

afterEach(() => {
  vi.unstubAllGlobals();
});

function deferred<Result>() {
  let resolve!: (value: Result) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Result>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("LatestSaveCoordinator", () => {
  it("keeps one active save and coalesces queued commits into the newest snapshot", async () => {
    type Result = { ok: boolean; version: number };
    const first = deferred<Result>();
    const second = deferred<Result>();
    let active = 0;
    let maximumActive = 0;
    const execute = vi
      .fn<(snapshot: string, reason: string, commandId: string) => Promise<Result>>()
      .mockImplementation(async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        const response = execute.mock.calls.length === 1 ? first.promise : second.promise;
        try {
          return await response;
        } finally {
          active -= 1;
        }
      });
    let command = 0;
    const coordinator = new LatestSaveCoordinator<string, Result>({
      execute,
      makeCommandId: () => `command-${++command}`,
      shouldContinue: (result) => result.ok,
    });

    const initialResult = coordinator.enqueue("initial", "autosave");
    await Promise.resolve();
    const supersededResult = coordinator.enqueue("middle", "periodic-autosave");
    const latestResult = coordinator.enqueue("latest", "checkpoint:mine-entrance");

    expect(execute).toHaveBeenCalledTimes(1);
    first.resolve({ ok: true, version: 2 });
    await initialResult;
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute).toHaveBeenLastCalledWith(
      "latest",
      "checkpoint:mine-entrance",
      "command-2",
    );

    second.resolve({ ok: true, version: 3 });
    await expect(supersededResult).resolves.toEqual({ ok: true, version: 3 });
    await expect(latestResult).resolves.toEqual({ ok: true, version: 3 });
    expect(maximumActive).toBe(1);
  });

  it("stops draining after a failed save and applies a short circuit breaker", async () => {
    type Result = { ok: boolean; code?: string };
    const first = deferred<Result>();
    let now = 1_000;
    const execute = vi
      .fn<(snapshot: string, reason: string, commandId: string) => Promise<Result>>()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue({ ok: true });
    const coordinator = new LatestSaveCoordinator<string, Result>({
      execute,
      makeCommandId: () => crypto.randomUUID(),
      shouldContinue: (result) => result.ok,
      failureCooldownMs: 5_000,
      now: () => now,
    });

    const active = coordinator.enqueue("initial", "autosave");
    await Promise.resolve();
    const queued = coordinator.enqueue("newest-local-copy", "location-transition");
    first.resolve({ ok: false, code: "busy" });

    await expect(active).resolves.toEqual({ ok: false, code: "busy" });
    await expect(queued).resolves.toEqual({ ok: false, code: "busy" });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(coordinator.isCoolingDown()).toBe(true);
    await expect(coordinator.enqueue("during-cooldown", "manual-save")).resolves.toEqual({ ok: false, code: "busy" });
    expect(execute).toHaveBeenCalledTimes(1);

    now += 5_001;
    await expect(coordinator.enqueue("retry", "manual-save")).resolves.toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("rejects coalesced callers without starting a second request when execution throws", async () => {
    const first = deferred<{ ok: boolean }>();
    const execute = vi
      .fn<(snapshot: string, reason: string, commandId: string) => Promise<{ ok: boolean }>>()
      .mockImplementation(() => first.promise);
    const coordinator = new LatestSaveCoordinator<string, { ok: boolean }>({
      execute,
      makeCommandId: () => "command",
      shouldContinue: (result) => result.ok,
    });

    const active = coordinator.enqueue("initial", "autosave");
    await Promise.resolve();
    const queued = coordinator.enqueue("latest", "checkpoint");
    first.reject(new Error("transport closed"));

    await expect(active).rejects.toThrow("transport closed");
    await expect(queued).rejects.toThrow("transport closed");
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("save coordination helpers", () => {
  it("retains a checkpoint reason when a routine autosave arrives later", () => {
    expect(mergeSaveReason("checkpoint:guardian", "periodic-autosave")).toBe("checkpoint:guardian");
    expect(mergeSaveReason("periodic-autosave", "chapter-complete")).toBe("chapter-complete");
  });

  it("executes without Web Locks in a non-browser runtime", async () => {
    vi.stubGlobal("navigator", {});
    await expect(withExclusiveCharacterSaveLock("character-id", async () => "saved")).resolves.toBe("saved");
  });

  it("uses an exclusive browser lock when the API is available", async () => {
    const request = vi.fn(async (_name: string, task: () => Promise<string>) => task());
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(withExclusiveCharacterSaveLock("hero-7", async () => "saved")).resolves.toBe("saved");
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]?.[0]).toBe("shattered-crown:save:hero-7");
  });

  it("converts a rejected Server Action transport into a typed offline result", async () => {
    vi.stubGlobal("navigator", {});
    const offline = { ok: false as const, code: "network" as const };

    await expect(executeCharacterSaveSafely(
      "hero-7",
      async () => {
        throw new TypeError("Failed to fetch Server Action");
      },
      () => offline,
    )).resolves.toEqual(offline);
  });
});
