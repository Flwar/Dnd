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

  it("does not start a duplicate refresh while replacing the route after authentication", async () => {
    const [authForms, characterCreator] = await Promise.all([
      source("src/components/auth/AuthForms.tsx"),
      source("src/components/character-creation/CharacterCreator.tsx"),
    ]);

    expect(authForms).toContain('router.replace("/menu")');
    expect(authForms).toContain('router.replace("/characters/new")');
    expect(authForms).not.toContain("router.refresh()");
    expect(characterCreator).not.toContain("router.refresh()");
  });

  it("does not wait for a cloud save before leaving the game", async () => {
    const gameClient = await source("src/components/game/GameClient.tsx");

    expect(gameClient).toContain('void commit(saveRef.current, "return-to-menu")');
    expect(gameClient).not.toContain('await commit(saveRef.current, "return-to-menu")');
  });

  it("does not revalidate and refresh the active game route after every autosave", async () => {
    const gameActions = await source("src/lib/actions/game.ts");

    expect(gameActions).not.toContain("revalidatePath(`/game/${parsed.data.character.id}`)");
  });

  it("bounds stalled middleware and server fetches and exposes recovery from nested loaders", async () => {
    const [middlewareClient, serverClient, gameLoading, partyLoading] = await Promise.all([
      source("src/lib/supabase/middleware.ts"),
      source("src/lib/supabase/server.ts"),
      source("src/app/game/[characterId]/loading.tsx"),
      source("src/app/party/loading.tsx"),
    ]);

    expect(middlewareClient).toContain("createTimedFetch(2_000)");
    expect(serverClient).toContain("createTimedFetch(3_000");
    expect(serverClient).toContain("retryTimeouts: false");
    expect(gameLoading).toContain('recoveryHref="/menu"');
    expect(partyLoading).toContain('recoveryHref="/menu"');
  });
});
