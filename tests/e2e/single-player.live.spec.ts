import { expect, test } from "@playwright/test";
import {
  createDefaultCharacter,
  credentialsFromEnvironment,
  enterOpeningChapter,
  signIn,
} from "./helpers";

const credentials = credentialsFromEnvironment("E2E_USER_EMAIL", "E2E_USER_PASSWORD");

test.describe("מסע יחיד מול Supabase חי", () => {
  test("מתחבר, יוצר דמות, מתחיל פרק וטוען שמירה אחרי רענון", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "מחשב", "הזרימה החיה רצה פעם אחת בפרויקט המחשב.");
    test.skip(!credentials, "נדרשים E2E_USER_EMAIL ו-E2E_USER_PASSWORD לחשבון Supabase מאומת.");

    await signIn(page, credentials!);
    const characterName = "בודק הערפל";
    await createDefaultCharacter(page, characterName);
    await enterOpeningChapter(page);

    const persistedInteraction = page.getByTestId("interaction-inspect-blue-dust");
    await expect(persistedInteraction).toBeVisible();
    await persistedInteraction.click();
    await expect(page.getByRole("heading", { name: "בדיקת מיומנות" })).toBeVisible();
    await page.getByRole("button", { name: "המשך", exact: true }).click();

    await page.getByRole("button", { name: "שמירה", exact: true }).click();
    await expect(page.getByText("המשחק נשמר", { exact: true }).first()).toBeVisible({ timeout: 30_000 });

    const gameUrl = new URL(page.url());
    gameUrl.search = "";
    await page.goto(gameUrl.toString());
    await enterOpeningChapter(page);

    await expect(page.getByRole("button", { name: "פתיחת דף הדמות" })).toContainText(characterName);
    await expect(persistedInteraction).toHaveCount(0);
  });
});
