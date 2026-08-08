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
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
    });
    const controller = new AbortController();
    const reason = new Error("navigation cancelled");

    const request = timedFetch("https://example.test/cancelled", {
      signal: controller.signal,
    });
    controller.abort(reason);

    await expect(request).rejects.toBe(reason);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("forwards a Request signal when init does not provide one", async () => {
    const fetchImplementation = abortAwarePendingFetch();
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
    });
    const controller = new AbortController();
    const reason = new Error("request cancelled");
    const input = new Request("https://example.test/cancelled", {
      signal: controller.signal,
    });

    const request = timedFetch(input);
    controller.abort(reason);

    await expect(request).rejects.toBe(reason);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
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
    expect(() => createTimedFetch(500, globalThis.fetch, { retryBackoffMs: -1 })).toThrow(
      RangeError,
    );
    expect(new ExternalRequestTimeoutError(500).message).toContain("500ms");
  });

  it.each([
    { method: "GET", status: 502 },
    { method: "GET", status: 503 },
    { method: "GET", status: 504 },
    { method: "HEAD", status: 503 },
  ])("retries a safe $method request once after a $status", async ({ method, status }) => {
    vi.useFakeTimers();
    const retryableResponse = new Response("temporary failure", { status });
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(retryableResponse)
      .mockResolvedValueOnce(new Response("ok", { status: 200 })) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 100,
    });

    const responsePromise = timedFetch("https://example.test/recovering", { method });
    await vi.advanceTimersByTimeAsync(100);

    await expect(responsePromise).resolves.toMatchObject({ status: 200 });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(retryableResponse.bodyUsed).toBe(true);
  });

  it("returns the final retryable response after exactly two attempts", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 100,
    });

    const responsePromise = timedFetch("https://example.test/unavailable");
    await vi.advanceTimersByTimeAsync(100);

    await expect(responsePromise).resolves.toMatchObject({ status: 503 });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "does not retry a %s mutation after a 503",
    async (method) => {
      const fetchImplementation = vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
      const timedFetch = createTimedFetch(1_000, fetchImplementation, {
        retrySafeRequests: true,
        retryBackoffMs: 0,
      });

      await expect(
        timedFetch("https://example.test/mutation", { method }),
      ).resolves.toMatchObject({ status: 503 });
      expect(fetchImplementation).toHaveBeenCalledTimes(1);
    },
  );

  it("does not retry a safe request after a non-retryable response", async () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 0,
    });

    await expect(timedFetch("https://example.test/server-error")).resolves.toMatchObject({
      status: 500,
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("retries a safe request once after a network failure", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("ok")) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 100,
    });

    const responsePromise = timedFetch("https://example.test/network");
    await vi.advanceTimersByTimeAsync(100);

    await expect(responsePromise).resolves.toMatchObject({ status: 200 });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("does not retry an arbitrary error from a safe request", async () => {
    const failure = new Error("unexpected implementation failure");
    const fetchImplementation = vi.fn(async () => {
      throw failure;
    }) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 0,
    });

    await expect(timedFetch("https://example.test/failure")).rejects.toBe(failure);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the upstream signal aborts during backoff", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    const timedFetch = createTimedFetch(1_000, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 100,
    });
    const controller = new AbortController();
    const reason = new Error("navigation superseded retry");

    const request = timedFetch("https://example.test/recovering", {
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(reason);

    await expect(request).rejects.toBe(reason);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries a safe request once after a timeout and then surfaces the timeout", async () => {
    vi.useFakeTimers();
    const fetchImplementation = abortAwarePendingFetch();
    const timedFetch = createTimedFetch(250, fetchImplementation, {
      retrySafeRequests: true,
      retryBackoffMs: 100,
    });

    const request = timedFetch("https://example.test/slow");
    const rejection = expect(request).rejects.toMatchObject({
      name: "ExternalRequestTimeoutError",
      timeoutMs: 250,
    });

    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(250);
    await rejection;

    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("can fail fast after one timed-out safe request", async () => {
    vi.useFakeTimers();
    const fetchImplementation = abortAwarePendingFetch();
    const timedFetch = createTimedFetch(250, fetchImplementation, {
      retrySafeRequests: true,
      retryTimeouts: false,
    });

    const request = timedFetch("https://example.test/slow");
    const rejection = expect(request).rejects.toMatchObject({
      name: "ExternalRequestTimeoutError",
      timeoutMs: 250,
    });

    await vi.advanceTimersByTimeAsync(250);
    await rejection;

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
