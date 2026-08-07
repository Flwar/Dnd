import { describe, expect, it } from "vitest";
import { classifyAuthError } from "../../src/lib/auth/auth-error-classifier";

describe("auth error classifier", () => {
  it.each([
    { name: "AuthRetryableFetchError", status: 0 },
    { name: "AuthApiError", status: 429 },
    { name: "AuthApiError", status: 500 },
    { name: "AuthApiError", status: 503 },
  ])("keeps a session intact for a retryable failure", (error) => {
    expect(classifyAuthError(error)).toBe("retryable");
  });

  it.each([
    null,
    new Error("invalid token"),
    { name: "AuthSessionMissingError", status: 400 },
    { name: "AuthApiError", status: 401 },
    { name: "AuthApiError", status: 403 },
  ])("treats a permanent auth failure as an invalid session", (error) => {
    expect(classifyAuthError(error)).toBe("invalid-session");
  });
});
