import { describe, expect, it } from "vitest";
import { classifyAuthError } from "@/lib/auth/auth-error-classifier";

describe("auth error classification", () => {
  it.each([429, 500, 503, 599])("treats HTTP %i as retryable", (status) => {
    expect(classifyAuthError({ status, name: "AuthApiError" })).toBe("retryable");
  });

  it("recognizes Supabase transport failures even when their status is zero", () => {
    expect(classifyAuthError({ status: 0, name: "AuthRetryableFetchError" })).toBe("retryable");
  });

  it.each([
    { status: 401, name: "AuthSessionMissingError" },
    { status: 403, name: "AuthApiError" },
    { status: 400, name: "AuthInvalidTokenResponseError" },
    new Error("unknown auth failure"),
  ])("routes non-temporary failures through session recovery", (error) => {
    expect(classifyAuthError(error)).toBe("invalid-session");
  });
});
