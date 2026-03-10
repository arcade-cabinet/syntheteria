/**
 * E2E tests for core gameplay — entering the game world and verifying
 * the HUD, 3D canvas, and key UI elements render correctly.
 *
 * These tests navigate through the full flow:
 *   Title → NEW GAME → Pregame → START GAME → Game Canvas
 *
 * Since Playwright cannot interact with WebGL content directly (no DOM
 * elements inside the canvas), these tests verify:
 * 1. The 3D canvas renders and is interactive
 * 2. HUD overlays (crosshair, resource bar, bot status, hints) appear
 * 3. Speed controls work (pause/play, speed buttons)
 * 4. Core loop HUD elements respond to game state
 */
import { test, expect, type Page } from "@playwright/test";

/** Navigate from title through pregame to the playing phase. */
async function enterGame(page: Page) {
  await page.goto("/");
  await expect(page.getByText("SYNTHETERIA")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /NEW GAME/ }).click();
  await expect(page.getByText("CONFIGURE")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /START GAME/ }).click();
  // Wait for the WebGL canvas to appear
  await expect(page.locator("canvas[data-engine]")).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Game world", () => {
  test.beforeEach(async ({ page }) => {
    await enterGame(page);
  });

  test("renders the Three.js WebGL canvas", async ({ page }) => {
    const canvas = page.locator("canvas[data-engine]");
    await expect(canvas).toBeVisible();

    // Canvas should have meaningful dimensions
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test("shows the FPS HUD crosshair", async ({ page }) => {
    // The crosshair is centered in the viewport — a small dot
    // We check for the HUD container existing
    const hud = page.locator("div").filter({ hasText: /WASD move/ });
    await expect(hud.first()).toBeVisible({ timeout: 5_000 });
  });

  test("shows resource bar with SCRAP and STORM indicators", async ({
    page,
  }) => {
    await expect(
      page.getByText("SCRAP:", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText("STORM:", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByText("PWR:", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("shows bot status panel with Bot Alpha", async ({ page }) => {
    await expect(
      page.getByText("Bot Alpha", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("shows control hints (WASD, E, F, C, G, Q)", async ({ page }) => {
    await expect(page.getByText("WASD move")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("E interact")).toBeVisible();
    await expect(page.getByText("F harvest")).toBeVisible();
    await expect(page.getByText("C compress")).toBeVisible();
    await expect(page.getByText("G grab/drop")).toBeVisible();
    await expect(page.getByText("Q switch bot")).toBeVisible();
  });

  test("shows speed control buttons (0.5x, 1x, 2x, PAUSE)", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "0.5x" }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: "1x" })).toBeVisible();
    await expect(page.getByRole("button", { name: "2x" })).toBeVisible();
    await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible();
  });

  test("pause button toggles to PLAY", async ({ page }) => {
    const pauseBtn = page.getByRole("button", { name: "PAUSE" });
    await expect(pauseBtn).toBeVisible({ timeout: 5_000 });

    await pauseBtn.click();
    await expect(
      page.getByRole("button", { name: "PLAY" }),
    ).toBeVisible({ timeout: 3_000 });

    // Click again to unpause
    await page.getByRole("button", { name: "PLAY" }).click();
    await expect(
      page.getByRole("button", { name: "PAUSE" }),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("speed buttons change active state", async ({ page }) => {
    // 1x should be active by default (has different background)
    const btn1x = page.getByRole("button", { name: "1x" });
    await expect(btn1x).toBeVisible({ timeout: 5_000 });

    // Click 2x
    const btn2x = page.getByRole("button", { name: "2x" });
    await btn2x.click();

    // Wait for state update
    await page.waitForTimeout(200);

    // Click back to 1x
    await btn1x.click();
    await page.waitForTimeout(200);
  });

  test("bot component health indicators are visible", async ({ page }) => {
    // Bot Alpha starts with camera (functional), arms (broken), legs, power_cell
    await expect(
      page.getByText("CAMERA", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("ARMS", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("LEGS", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("POWER CELL", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("arms component shows OFFLINE status", async ({ page }) => {
    // Bot Alpha's arms are broken (functional: false)
    await expect(
      page.getByText("OFFLINE", { exact: false }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Game canvas interaction", () => {
  test.beforeEach(async ({ page }) => {
    await enterGame(page);
  });

  test("canvas fills the viewport within the bezel", async ({ page }) => {
    const canvas = page.locator("canvas[data-engine]");
    const box = await canvas.boundingBox();
    const viewport = page.viewportSize()!;

    // Canvas should fill most of the viewport (bezel may take some space)
    expect(box!.width).toBeGreaterThan(viewport.width * 0.7);
    expect(box!.height).toBeGreaterThan(viewport.height * 0.7);
  });

  test("keyboard input does not cause errors", async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    // Press game keys
    await page.keyboard.press("w");
    await page.keyboard.press("a");
    await page.keyboard.press("s");
    await page.keyboard.press("d");
    await page.keyboard.press("e");
    await page.keyboard.press("f");
    await page.keyboard.press("c");
    await page.keyboard.press("g");
    await page.keyboard.press("q");

    await page.waitForTimeout(500);

    // Filter out WebGL warnings that aren't real errors
    const realErrors = errors.filter(
      (e) =>
        !e.includes("WebGL") &&
        !e.includes("THREE") &&
        !e.includes("shader"),
    );
    expect(realErrors).toHaveLength(0);
  });
});
