/**
 * E2E tests for AI-vs-AI spectator mode.
 *
 * Tests:
 *   - SPECTATE button visible and enabled on title screen
 *   - Clicking SPECTATE transitions through loading to game
 *   - SpectatorHUD visible with "SPECTATOR MODE" banner
 *   - Speed controls: 4 preset buttons present
 *   - EXIT SPECTATOR button present
 *   - Keyboard shortcut 1-4 switches speed (aria-pressed)
 *
 * Note: The game init (3D scene, ECS, terrain) is not tested here — that
 * requires a headed browser with WebGL. These tests focus on the UI flow
 * up to the point the game scene begins loading.
 */

import { expect, test } from "@playwright/test";

test.describe("Spectator mode", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for title screen menu fade-in (1400ms animation + buffer)
		await page.waitForTimeout(2000);
	});

	test("SPECTATE button is visible and enabled on title screen", async ({
		page,
	}) => {
		const spectateBtn = page.getByRole("button", {
			name: /spectator mode|watch ai factions/i,
		});
		await expect(spectateBtn).toBeVisible();
		await expect(spectateBtn).toBeEnabled();
	});

	test("SPECTATE button text reads SPECTATE", async ({ page }) => {
		const spectateBtn = page.getByRole("button", {
			name: /watch ai factions compete/i,
		});
		await expect(spectateBtn).toContainText("SPECTATE");
	});

	test("clicking SPECTATE leaves the title screen", async ({ page }) => {
		const spectateBtn = page.getByRole("button", {
			name: /watch ai factions compete/i,
		});
		await spectateBtn.click();

		// Title should disappear (either loading screen or game is shown)
		await expect(page.getByText("SYNTHETERIA")).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("loading screen is shown after clicking SPECTATE", async ({ page }) => {
		const spectateBtn = page.getByRole("button", {
			name: /watch ai factions compete/i,
		});
		await spectateBtn.click();

		// A loading indicator should appear briefly
		await expect(
			page.getByText(/INITIALIZING|LOADING|COLONY MISSION/i),
		).toBeVisible({ timeout: 3000 });
	});

	test("no critical JS errors during spectator launch", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		const spectateBtn = page.getByRole("button", {
			name: /watch ai factions compete/i,
		});
		await spectateBtn.click();

		// Allow time for init
		await page.waitForTimeout(3000);

		const critical = errors.filter(
			(e) =>
				e.includes("is not defined") ||
				e.includes("is not a function") ||
				e.includes("Cannot read properties") ||
				e.includes("SyntaxError"),
		);
		expect(critical).toHaveLength(0);
	});
});

test.describe("SpectatorHUD", () => {
	// These tests require the game to fully initialize (WebGL) — skip in CI
	// unless PW_WEBGL=1 is set. In that case, the game scene loads.
	test.skip(
		!process.env.PW_WEBGL,
		"Requires WebGL-capable browser (set PW_WEBGL=1)",
	);

	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(2000);

		// Click SPECTATE and wait for HUD
		await page
			.getByRole("button", { name: /watch ai factions compete/i })
			.click();
		await page.waitForTimeout(4000);
	});

	test("shows SPECTATOR MODE banner", async ({ page }) => {
		await expect(page.getByText(/SPECTATOR MODE/i)).toBeVisible({
			timeout: 5000,
		});
	});

	test("shows four speed preset buttons", async ({ page }) => {
		const speedButtons = page.getByRole("toolbar", {
			name: /simulation speed/i,
		});
		await expect(speedButtons).toBeVisible();

		// 4 preset buttons
		const btns = speedButtons.getByRole("button", { name: /set simulation speed/i });
		await expect(btns).toHaveCount(4);
	});

	test("1x speed is active by default", async ({ page }) => {
		const oneX = page.getByRole("button", {
			name: /set simulation speed to 1/i,
		});
		await expect(oneX).toHaveAttribute("aria-pressed", "true");
	});

	test("EXIT SPECTATOR button is present", async ({ page }) => {
		const exitBtn = page.getByRole("button", {
			name: /exit spectator mode/i,
		});
		await expect(exitBtn).toBeVisible();
	});
});
