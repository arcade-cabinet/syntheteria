/**
 * E2E tests for the Syntheteria narration flow.
 *
 * Verifies that clicking "NEW GAME" transitions to the narration sequence,
 * that all narration blocks are reachable (including the otter block), and
 * that clicking through the final block transitions to the game canvas.
 */
import { test, expect } from "@playwright/test";

const NARRATION_BLOCKS = [
  "I am.",
  "What else is there in my world?",
  // Otter block — the key addition validated by this suite
  "otter",
  "I reach out.",
  "There is a machine.",
  "I understand these words.",
] as const;

test.describe("Narration flow", () => {
  test("clicking NEW GAME opens the narration overlay", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /NEW GAME/ }).click();
    await expect(page.getByText("I am.")).toBeVisible();
  });

  test("narration overlay covers the full viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /NEW GAME/ }).click();

    const overlay = page.locator("div").filter({ hasText: "I am." }).first();
    const box = await overlay.boundingBox();
    const viewport = page.viewportSize()!;

    // Overlay should fill almost the entire viewport
    expect(box!.width).toBeGreaterThan(viewport.width * 0.9);
    expect(box!.height).toBeGreaterThan(viewport.height * 0.9);
  });

  test("clicking advances through each narration block", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /NEW GAME/ }).click();

    for (const fragment of NARRATION_BLOCKS) {
      // Wait for the block to become visible before advancing
      await expect(
        page.getByText(fragment, { exact: false }),
      ).toBeVisible({ timeout: 8_000 });
      await page.mouse.click(640, 360);
      // Brief pause for fade-out animation before the next block fades in
      await page.waitForTimeout(450);
    }
  });

  test("otter narration block contains the word 'otter'", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /NEW GAME/ }).click();

    // Skip "I am."
    await expect(page.getByText("I am.")).toBeVisible({ timeout: 5_000 });
    await page.mouse.click(640, 360);
    await page.waitForTimeout(450);

    // Skip "What else is there in my world?"
    await expect(
      page.getByText("What else is there", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
    await page.mouse.click(640, 360);
    await page.waitForTimeout(450);

    // Otter block
    await expect(page.getByText("otter", { exact: false })).toBeVisible({
      timeout: 5_000,
    });
    // Verify it also references warmth/life to confirm it's the right block
    await expect(page.getByText("Alive", { exact: false })).toBeVisible();
  });

  test("completing narration shows the 3-D game canvas", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /NEW GAME/ }).click();

    // Click through all blocks
    for (let i = 0; i < NARRATION_BLOCKS.length; i++) {
      await page.waitForTimeout(500);
      await page.mouse.click(640, 360);
    }

    // After the last block the playing phase renders a Three.js WebGL canvas.
    // The minimap also renders a canvas so we target the main one by its
    // data-engine attribute which Three.js sets automatically.
    await expect(
      page.locator("canvas[data-engine]"),
    ).toBeVisible({ timeout: 10_000 });
  });
});
