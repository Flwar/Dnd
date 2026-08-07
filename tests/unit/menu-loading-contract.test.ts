import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(relativePath: string) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

describe("menu loading performance contract", () => {
  it("does not load a full save snapshot for every character summary", async () => {
    const [menuPage, charactersPage] = await Promise.all([
      source("src/app/menu/page.tsx"),
      source("src/app/characters/page.tsx"),
    ]);

    expect(menuPage).not.toContain("get_latest_character_save");
    expect(charactersPage).not.toContain("get_latest_character_save");
  });

  it("keeps query failures distinct from a genuinely empty character list", async () => {
    const [menuPage, charactersPage] = await Promise.all([
      source("src/app/menu/page.tsx"),
      source("src/app/characters/page.tsx"),
    ]);

    expect(menuPage).toContain('throw new Error("MENU_DATA_UNAVAILABLE")');
    expect(charactersPage).toContain('throw new Error("CHARACTER_LIST_UNAVAILABLE")');
  });

  it("uses claims for the fast request gate and retains authoritative page verification", async () => {
    const [middlewareClient, requireUser] = await Promise.all([
      source("src/lib/supabase/middleware.ts"),
      source("src/lib/auth/require-user.ts"),
    ]);

    expect(middlewareClient).toContain("supabase.auth.getClaims()");
    expect(requireUser).toContain("supabase.auth.getUser()");
  });
});
