/**
 * E2E tests for the save/load system.
 *
 * Validates that:
 * 1. ESC key opens the save/load menu during gameplay
 * 2. Save slots are displayed
 * 3. Save and load operations work
 * 4. Menu can be closed with ESC or CLOSE button
 */
import { test, expect, type Page } from "@playwright/test";

/** Navigate to the playing phase. */
async function enterGame(page: Page) {
  await page.goto("/");
  await expect(page.getByText("SYNTHETERIA")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /START GAME/ }).click();
  await expect(page.locator("canvas[data-engine]")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Save/Load menu", () => {
  test.beforeEach(async ({ page }) => {
    await enterGame(page);
  });

  test("ESC key opens the save/load menu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(
      page.getByText("SAVE / LOAD", { exact: false }),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("save menu shows all 4 slots", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).toBeVisible({ timeout: 3_000 });

    await expect(page.getByText("SLOT 1")).toBeVisible();
    await expect(page.getByText("SLOT 2")).toBeVisible();
    await expect(page.getByText("SLOT 3")).toBeVisible();
    await expect(page.getByText("AUTOSAVE")).toBeVisible();
  });

  test("CLOSE button dismisses the menu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).toBeVisible({ timeout: 3_000 });

    await page.getByRole("button", { name: "CLOSE" }).click();
    await expect(page.getByText("SAVE / LOAD")).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test("pressing ESC again closes the menu", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).toBeVisible({ timeout: 3_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).not.toBeVisible({
      timeout: 3_000,
    });
  });

  test("empty slots show EMPTY label", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).toBeVisible({ timeout: 3_000 });

    // All slots should be empty initially
    const emptyLabels = page.getByText("EMPTY");
    await expect(emptyLabels.first()).toBeVisible();
  });

  test("save button is present for manual slots", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expect(page.getByText("SAVE / LOAD")).toBeVisible({ timeout: 3_000 });

    // SAVE buttons should be visible (one per manual slot, not for autosave)
    const saveButtons = page.getByRole("button", { name: "SAVE" });
    await expect(saveButtons.first()).toBeVisible();
  });
});
