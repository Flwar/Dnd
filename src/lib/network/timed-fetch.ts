export const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 8_000;

type FetchImplementation = typeof globalThis.fetch;

export class ExternalRequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`External request exceeded ${timeoutMs}ms.`);
    this.name = "ExternalRequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}
export function createTimedFetch(
  timeoutMs = DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): FetchImplementation {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive finite number.");
  }

  return async (input, init) => {
    const controller = new AbortController();
    const upstreamSignal = init?.signal;
    let timedOut = false;

    const forwardAbort = () => controller.abort(upstreamSignal?.reason);
    if (upstreamSignal?.aborted) forwardAbort();
    else upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(new ExternalRequestTimeoutError(timeoutMs));
    }, timeoutMs);

    try {
      return await fetchImplementation(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new ExternalRequestTimeoutError(timeoutMs);
      throw error;
    } finally {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", forwardAbort);
    }
  };
}
