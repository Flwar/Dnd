import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  createDefaultCharacter,
  credentialsFromEnvironment,
  enterOpeningChapter,
  signIn,
} from "./helpers";

const leaderCredentials = credentialsFromEnvironment(
  "E2E_PARTY_LEADER_EMAIL",
  "E2E_PARTY_LEADER_PASSWORD",
);
const memberCredentials = credentialsFromEnvironment(
  "E2E_PARTY_MEMBER_EMAIL",
  "E2E_PARTY_MEMBER_PASSWORD",
);

async function openPartyLobby(page: Page, characterId: string): Promise<void> {
  await page.goto(`/party?character=${encodeURIComponent(characterId)}`);
  await expect(page.getByRole("heading", { name: "החבורה המקוונת" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "בחירת דמות" })).toBeVisible();
}

async function closeContexts(contexts: BrowserContext[]): Promise<void> {
  await Promise.allSettled(contexts.map((context) => context.close()));
}

test.describe("חבורה מקוונת מול Supabase חי", () => {
  test("שני משתמשים יוצרים חדר, מצטרפים, מוכנים, מתחילים ומשתחזרים אחרי רענון", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "מחשב", "הזרימה מרובת ההקשרים רצה פעם אחת בפרויקט המחשב.");
    test.skip(
      !leaderCredentials || !memberCredentials,
      "נדרשים שני זוגות האישורים E2E_PARTY_LEADER_* ו-E2E_PARTY_MEMBER_*.",
    );

    const contexts = await Promise.all([
      browser.newContext({ baseURL, locale: "he-IL", timezoneId: "Asia/Jerusalem" }),
      browser.newContext({ baseURL, locale: "he-IL", timezoneId: "Asia/Jerusalem" }),
    ]);
    const [leaderContext, memberContext] = contexts;
    const [leaderPage, memberPage] = await Promise.all([
      leaderContext.newPage(),
      memberContext.newPage(),
    ]);

    try {
      await Promise.all([
        signIn(leaderPage, leaderCredentials!),
        signIn(memberPage, memberCredentials!),
      ]);

      const leaderCharacter = "מנהיג הערפל";
      const memberCharacter = "חברת הערפל";
      const [leaderCharacterId, memberCharacterId] = await Promise.all([
        createDefaultCharacter(leaderPage, leaderCharacter),
        createDefaultCharacter(memberPage, memberCharacter),
      ]);
      await Promise.all([
        openPartyLobby(leaderPage, leaderCharacterId),
        openPartyLobby(memberPage, memberCharacterId),
      ]);

      const partyName = "שומרי הערפל";
      await leaderPage.getByLabel("שם החבורה").fill(partyName);
      await leaderPage.getByLabel("מספר חברים מרבי").selectOption("2");
      await leaderPage.getByRole("button", { name: "יצירת החבורה", exact: true }).click();
      await expect(leaderPage.getByRole("heading", { name: partyName })).toBeVisible({ timeout: 30_000 });

      const roomCodeNode = leaderPage.locator("bdi").filter({ hasText: /^[A-Z0-9]{6}$/ }).first();
      await expect(roomCodeNode).toBeVisible();
      const roomCode = (await roomCodeNode.textContent())?.trim();
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

      await memberPage.getByLabel("קוד חדר").fill(roomCode!);
      await memberPage.getByRole("button", { name: "כניסה לחדר", exact: true }).click();
      await expect(memberPage.getByRole("heading", { name: partyName })).toBeVisible({ timeout: 30_000 });

      const leaderRoster = leaderPage.getByRole("list", { name: "רשימת חברי החבורה" });
      const memberRoster = memberPage.getByRole("list", { name: "רשימת חברי החבורה" });
      await expect(leaderRoster).toContainText(leaderCharacter, { timeout: 30_000 });
      await expect(leaderRoster).toContainText(memberCharacter, { timeout: 30_000 });
      await expect(memberRoster).toContainText(leaderCharacter, { timeout: 30_000 });
      await expect(memberRoster).toContainText(memberCharacter, { timeout: 30_000 });

      await Promise.all([
        leaderPage.getByRole("button", { name: "אני מוכן/ה", exact: true }).click(),
        memberPage.getByRole("button", { name: "אני מוכן/ה", exact: true }).click(),
      ]);
      await expect(leaderRoster).toContainText("מוכן/ה למסע", { timeout: 30_000 });

      const startButton = leaderPage.getByRole("button", { name: "פתיחת הפרק", exact: true });
      await expect(startButton).toBeEnabled({ timeout: 30_000 });
      await startButton.click();
      await expect(leaderPage).toHaveURL(/\/game\/[0-9a-f-]+\?partySession=[0-9a-f-]+$/, { timeout: 30_000 });

      const enterChapter = memberPage.getByRole("link", { name: "כניסה לפרק", exact: true });
      await expect(enterChapter).toBeVisible({ timeout: 30_000 });
      await enterChapter.click();
      await expect(memberPage).toHaveURL(/\/game\/[0-9a-f-]+\?partySession=[0-9a-f-]+$/, { timeout: 30_000 });

      await Promise.all([enterOpeningChapter(leaderPage), enterOpeningChapter(memberPage)]);
      const sessionId = new URL(memberPage.url()).searchParams.get("partySession");
      expect(sessionId).toMatch(/^[0-9a-f-]+$/);

      await memberPage.reload();
      await enterOpeningChapter(memberPage);
      expect(new URL(memberPage.url()).searchParams.get("partySession")).toBe(sessionId);
      await expect(memberPage.getByRole("button", { name: "פתיחת דף הדמות" })).toContainText(memberCharacter);
    } finally {
      await closeContexts(contexts);
    }
  });
});
