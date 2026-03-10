/**
 * E2E tests for the pregame configuration flow.
 *
 * Validates the flow: Title → NEW GAME → Pregame Config → START GAME → Game Canvas.
 * Tests faction selection, map settings, opponent configuration, and transition
 * into the 3D game world.
 */
import { test, expect } from "@playwright/test";

test.describe("Pregame configuration flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for title screen to fade in
    await expect(page.getByText("SYNTHETERIA")).toBeVisible({ timeout: 5_000 });
  });

  test("clicking NEW GAME opens the pregame configuration screen", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();

    // Pregame screen has a "CONFIGURE" header and tab bar
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("INITIALIZE PARAMETERS")).toBeVisible();
  });

  test("pregame screen shows three tabs: FACTION, MAP, OPPONENTS", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("button", { name: "FACTION" })).toBeVisible();
    await expect(page.getByRole("button", { name: "MAP" })).toBeVisible();
    await expect(page.getByRole("button", { name: "OPPONENTS" })).toBeVisible();
  });

  test("BACK button returns to title screen", async ({ page }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "BACK" }).click();
    await expect(page.getByText("SYNTHETERIA")).toBeVisible({ timeout: 5_000 });
  });

  test("START GAME button is visible and clickable", async ({ page }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });

    const startBtn = page.getByRole("button", { name: /START GAME/ });
    await expect(startBtn).toBeVisible();
    // Default seed is valid so button should be enabled
    await expect(startBtn).toBeEnabled();
  });

  test("clicking START GAME transitions to the 3D game canvas", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /START GAME/ }).click();

    // The game phase renders a Three.js WebGL canvas with data-engine attribute
    await expect(page.locator("canvas[data-engine]")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("tabs switch content when clicked", async ({ page }) => {
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });

    // Faction tab is active by default — look for faction-related content
    // Click MAP tab
    await page.getByRole("button", { name: "MAP" }).click();
    // Map tab should show seed-related content
    await expect(
      page.getByText("SEED", { exact: false }),
    ).toBeVisible({ timeout: 3_000 });

    // Click OPPONENTS tab
    await page.getByRole("button", { name: "OPPONENTS" }).click();
    // Opponents tab should show difficulty or faction selection
    await expect(
      page.getByText("DIFFICULTY", { exact: false }).or(
        page.getByText("OPPONENT", { exact: false }),
      ),
    ).toBeVisible({ timeout: 3_000 });
  });
});
