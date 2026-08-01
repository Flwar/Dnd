import { expect, type Page } from "@playwright/test";

export type Credentials = {
  email: string;
  password: string;
};

export function credentialsFromEnvironment(
  emailKey: string,
  passwordKey: string,
): Credentials | null {
  const email = process.env[emailKey]?.trim();
  const password = process.env[passwordKey];
  return email && password ? { email, password } : null;
}

export async function signIn(page: Page, credentials: Credentials): Promise<void> {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "ברוכים השבים" })).toBeVisible();

  await page.getByLabel("כתובת אימייל").fill(credentials.email);
  await page.getByLabel("סיסמה").fill(credentials.password);
  await page.getByRole("button", { name: "התחברות", exact: true }).click();

  await expect(page).toHaveURL(/\/menu(?:\?|$)/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /הכתר\s*המנופץ/ })).toBeVisible();
}

const creatorSteps = [
  "מורשת עתיקה",
  "דרך הלחימה",
  "הדרך שמאחוריך",
  "עיצוב התכונות",
  "פנים למסע",
  "השבועה האחרונה",
] as const;

/**
 * Creates a persisted character through the real production character creator.
 * The authored defaults are valid, so the helper intentionally does not bypass
 * any validation or call Supabase directly.
 */
export async function createDefaultCharacter(page: Page, name: string): Promise<string> {
  await page.goto("/characters/new");
  await expect(page.getByRole("heading", { name: "יצירת דמות" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "מי יעמוד מול הערפל?" })).toBeVisible();
  await page.getByLabel("שם הדמות").fill(name);

  for (const heading of creatorSteps) {
    await page.getByRole("button", { name: "הבא", exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.getByRole("button", { name: "צא לדרך", exact: true }).click();
  await expect(page).toHaveURL(/\/game\/[0-9a-f-]+\?opening=1$/, { timeout: 30_000 });

  const match = new URL(page.url()).pathname.match(/\/game\/([^/]+)$/);
  if (!match) throw new Error("לא נמצא מזהה הדמות בכתובת לאחר יצירתה.");
  return decodeURIComponent(match[1]);
}

export async function enterOpeningChapter(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: /דילוג/ });
  const cinematicAppeared = await skip
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (cinematicAppeared) {
    await skip.click();
    await expect(skip).toBeHidden();
  }
  await expect(page.getByRole("heading", { name: "שער הכפר" })).toBeVisible({ timeout: 30_000 });
}
