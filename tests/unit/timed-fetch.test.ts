import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTimedFetch,
  ExternalRequestTimeoutError,
} from "../../src/lib/network/timed-fetch";

afterEach(() => {
  vi.useRealTimers();
});

function abortAwarePendingFetch() {
  const implementation = vi.fn((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  return implementation as typeof implementation & typeof fetch;
}

describe("timed external fetch", () => {
  it("aborts the underlying request and rejects with a typed timeout", async () => {
    vi.useFakeTimers();
    const fetchImplementation = abortAwarePendingFetch();
    const timedFetch = createTimedFetch(250, fetchImplementation);

    const request = timedFetch("https://example.test/slow");
    const rejection = expect(request).rejects.toMatchObject({
      name: "ExternalRequestTimeoutError",
      timeoutMs: 250,
    });

    await vi.advanceTimersByTimeAsync(250);
    await rejection;

    const signal = fetchImplementation.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(true);
  });

  it("forwards an upstream abort without misreporting it as a timeout", async () => {
    const fetchImplementation = abortAwarePendingFetch();
    const timedFetch = createTimedFetch(1_000, fetchImplementation);
    const controller = new AbortController();
    const reason = new Error("navigation cancelled");

    const request = timedFetch("https://example.test/cancelled", {
      signal: controller.signal,
    });
    controller.abort(reason);

    await expect(request).rejects.toBe(reason);
  });

  it("cleans up its timeout after a successful response", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn(async () => new Response("ok")) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(250, fetchImplementation);

    await expect(timedFetch("https://example.test/fast")).resolves.toBeInstanceOf(Response);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects invalid timeout configuration immediately", () => {
    expect(() => createTimedFetch(0)).toThrow(RangeError);
    expect(() => createTimedFetch(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(new ExternalRequestTimeoutError(500).message).toContain("500ms");
  });
});
