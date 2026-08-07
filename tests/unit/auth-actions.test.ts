import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/env", () => ({
  getSiteUrl: () => "https://crown.example",
  isSupabaseConfigured: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: mocks }),
}));

import {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/lib/actions/auth";

const credentials = { email: "hero@example.com", password: "Dragon1234" };
const serviceMessage = "שירות החשבונות אינו זמין כרגע. נסו שוב בעוד רגע.";

describe("safe authentication action failures", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a signup database outage to Hebrew and redacts credentials from structured logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.signUp.mockResolvedValue({
      data: { session: null },
      error: {
        code: "unexpected_failure",
        status: 503,
        message: "Database error saving new user hero@example.com password=Dragon1234",
      },
    });

    await expect(signUpAction({
      displayName: "Hero King",
      ...credentials,
      confirmPassword: credentials.password,
      acceptTerms: true,
    })).resolves.toEqual({ ok: false, message: serviceMessage });

    expect(log).toHaveBeenCalledWith("[auth-action] request failed", expect.objectContaining({
      operation: "sign-up",
      code: "unexpected_failure",
      status: 503,
    }));
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(credentials.email);
    expect(logged).not.toContain(credentials.password);
  });

  it("keeps known sign-in errors friendly while logging only safe metadata", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
    });

    const result = await signInAction(credentials);

    expect(result).toEqual({ ok: false, message: "כתובת האימייל או הסיסמה אינם נכונים." });
    expect(log).toHaveBeenCalledWith("[auth-action] request failed", expect.objectContaining({
      operation: "sign-in",
      code: "invalid_credentials",
      status: 400,
      message: "Invalid login credentials",
    }));
  });

  it("logs both password-reset request and completion failures with their operation", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unavailable = { code: "request_timeout", status: 504, message: "Service unavailable" };
    mocks.resetPasswordForEmail.mockResolvedValue({ error: unavailable });
    mocks.updateUser.mockResolvedValue({ error: unavailable });

    await expect(requestPasswordResetAction({ email: credentials.email })).resolves.toEqual({
      ok: false,
      message: serviceMessage,
    });
    await expect(resetPasswordAction({
      password: credentials.password,
      confirmPassword: credentials.password,
    })).resolves.toEqual({ ok: false, message: serviceMessage });

    expect(log.mock.calls.map(([, detail]) => detail)).toEqual([
      expect.objectContaining({ operation: "request-password-reset", status: 504 }),
      expect.objectContaining({ operation: "reset-password", status: 504 }),
    ]);
  });
});
