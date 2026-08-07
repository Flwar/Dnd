export const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 8_000;
export const DEFAULT_SAFE_REQUEST_RETRY_BACKOFF_MS = 300;

type FetchImplementation = typeof globalThis.fetch;

type TimedFetchOptions = {
  retrySafeRequests?: boolean;
  retryBackoffMs?: number;
};

const retryableResponseStatuses = new Set([502, 503, 504]);

export class ExternalRequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`External request exceeded ${timeoutMs}ms.`);
    this.name = "ExternalRequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }
  return "GET";
}

function requestSignal(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.signal) return init.signal;
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.signal;
  }
  return undefined;
}

function isRetryableNetworkError(error: unknown) {
  if (error instanceof ExternalRequestTimeoutError || error instanceof TypeError) {
    return true;
  }
  return error instanceof DOMException && ["NetworkError", "TimeoutError"].includes(error.name);
}

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function waitForRetry(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(abortReason(signal));

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createTimedFetch(
  timeoutMs = DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  fetchImplementation: FetchImplementation = globalThis.fetch,
  options: TimedFetchOptions = {},
): FetchImplementation {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive finite number.");
  }
  const retryBackoffMs = options.retryBackoffMs ?? DEFAULT_SAFE_REQUEST_RETRY_BACKOFF_MS;
  if (!Number.isFinite(retryBackoffMs) || retryBackoffMs < 0) {
    throw new RangeError("retryBackoffMs must be a non-negative finite number.");
  }

  return async (input, init) => {
    const method = requestMethod(input, init);
    const upstreamSignal = requestSignal(input, init);
    const safeToRetry = options.retrySafeRequests === true && ["GET", "HEAD"].includes(method);
    const maximumAttempts = safeToRetry ? 2 : 1;

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const forwardAbort = () => controller.abort(abortReason(upstreamSignal!));

      if (upstreamSignal?.aborted) forwardAbort();
      else upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });

      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort(new ExternalRequestTimeoutError(timeoutMs));
      }, timeoutMs);

      try {
        const response = await fetchImplementation(input, { ...init, signal: controller.signal });
        const shouldRetry =
          attempt < maximumAttempts && retryableResponseStatuses.has(response.status);
        if (!shouldRetry) return response;
        try {
          await response.body?.cancel();
        } catch {
          // The retry does not depend on cleanup of an already failed response body.
        }
      } catch (error) {
        const resolvedError = upstreamSignal?.aborted
          ? abortReason(upstreamSignal)
          : timedOut
            ? new ExternalRequestTimeoutError(timeoutMs)
            : error;
        const shouldRetry =
          attempt < maximumAttempts &&
          !upstreamSignal?.aborted &&
          isRetryableNetworkError(resolvedError);
        if (!shouldRetry) throw resolvedError;
      } finally {
        clearTimeout(timeout);
        upstreamSignal?.removeEventListener("abort", forwardAbort);
      }

      await waitForRetry(retryBackoffMs, upstreamSignal);
    }

    throw new Error("Timed fetch exhausted without returning a response.");
  };
}
