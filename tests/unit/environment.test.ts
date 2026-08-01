import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnvironment, getSiteUrl } from "@/lib/env";

function stubSupabaseEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "sb_publishable_environment_test_key",
  );
}

describe("כתובת סביבת האירוח", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("משתמש בכתובת הציבורית ומסיר לוכסן מסיים", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://crown.example/");
    expect(getSiteUrl()).toBe("https://crown.example");
  });

  it("מסיק כתובת Vercel כאשר אין כתובת מפורשת", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "crown.vercel.app");
    expect(getSiteUrl()).toBe("https://crown.vercel.app");
  });

  it("אינו מחזיר localhost בסביבת production חסרת כתובת", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getSiteUrl()).toBeNull();
  });

  it("דוחה כתובת ציבורית לא תקינה", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-url");
    expect(() => getSiteUrl()).toThrow(/Missing or invalid environment configuration/);
  });
});

describe("מפתחות שרת של Supabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("משתמש במפתח הסודי החדש שמוזרק דרך Vercel Marketplace", () => {
    stubSupabaseEnvironment();
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_marketplace_environment_test_key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy_service_role_environment_test_key");

    expect(getServerEnvironment().SUPABASE_SECRET_KEY).toBe(
      "sb_secret_marketplace_environment_test_key",
    );
  });

  it("תומך במפתח service role ישן כחלופה", () => {
    stubSupabaseEnvironment();
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy_service_role_environment_test_key");

    expect(getServerEnvironment().SUPABASE_SECRET_KEY).toBe(
      "legacy_service_role_environment_test_key",
    );
  });
});
