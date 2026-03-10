/**
 * E2E tests for the Syntheteria title screen.
 *
 * Validates that the entry point of the game renders correctly and that the
 * "NEW GAME" button is the only interactive option (CONTINUE and SETTINGS are
 * disabled stubs at this stage of development).
 */
import { test, expect } from "@playwright/test";

test.describe("Title screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the game title and tagline", async ({ page }) => {
    await expect(page.getByText("SYNTHETERIA")).toBeVisible();
    await expect(page.getByText("AWAKEN // CONNECT // REBUILD")).toBeVisible();
  });

  test("shows NEW GAME as the only enabled button", async ({ page }) => {
    // NEW GAME is wrapped in brackets when primary + enabled
    const newGame = page.getByRole("button", { name: /NEW GAME/ });
    await expect(newGame).toBeVisible();
    await expect(newGame).toBeEnabled();

    // Stub buttons are present but disabled
    await expect(page.getByRole("button", { name: "CONTINUE" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "SETTINGS" })).toBeDisabled();
  });

  test("displays version string", async ({ page }) => {
    await expect(page.getByText(/v\d+\.\d+\.\d+/)).toBeVisible();
  });
});
