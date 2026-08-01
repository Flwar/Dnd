import { expect, test } from "@playwright/test";

test.describe("דף הפתיחה הציבורי", () => {
  test("נטען בעברית וב-RTL ללא גלישה אופקית או תמונות שבורות", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");

    const root = page.locator("html");
    await expect(root).toHaveAttribute("lang", "he");
    await expect(root).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).toHaveCSS("direction", "rtl");
    await expect(page.getByRole("heading", { name: /הכתר\s*המנופץ/ })).toBeVisible();
    await expect(page.getByText("פרק ראשון — הצללים שמתחת לערפלון")).toBeVisible();

    await expect
      .poll(async () => page.locator("main img").evaluateAll((images) =>
        images.length > 0 && images.every((image) => {
          const element = image as HTMLImageElement;
          return element.complete && element.naturalWidth > 0;
        }),
      ))
      .toBe(true);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "על העולם", exact: true }).click();
    const loreDialog = page.getByRole("dialog", { name: "האגדה על הכתר" });
    await expect(loreDialog).toBeVisible();
    await expect(loreDialog).toContainText("המלך שמעבר לערפל");
    await page.keyboard.press("Escape");
    await expect(loreDialog).toBeHidden();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
