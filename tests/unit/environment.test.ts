import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/env";

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
