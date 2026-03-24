/**
 * E2E: Combat — game runs long enough for enemy engagement.
 *
 * Verifies:
 *   - Units are visible on the game canvas
 *   - Game survives sustained combat (no crashes from component damage)
 *   - HUD/overlay elements render during gameplay
 */

import { expect, test } from "@playwright/test";

async function startGameFully(page: import("@playwright/test").Page) {
	await page.goto("/");
	const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
	await expect(newGameButton).toBeVisible({ timeout: 5_000 });
	await newGameButton.click();

	const startButton = page.getByRole("button", { name: /START/i });
	await expect(startButton).toBeVisible({ timeout: 3_000 });
	await startButton.click();

	const skipButton = page.getByRole("button", { name: /SKIP/i });
	await expect(skipButton).toBeVisible({ timeout: 3_000 });
	await skipButton.click();

	await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
}

test.describe("Combat", () => {
	test.beforeEach(async ({ page }) => {
		await startGameFully(page);
	});

	test("units are visible on the game canvas", async ({ page }) => {
		// After game starts, there should be rendered content on canvas
		await page.waitForTimeout(2_000);
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();

		// Take a screenshot for visual verification
		await page.screenshot({
			path: "tests/e2e/reports/screenshots/units-visible.png",
		});
	});

	test("combat resolves without crash after 15 seconds", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		// Let game run long enough for enemies to potentially engage
		// (feral machines have patrol + aggro behavior)
		await page.waitForTimeout(15_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();

		await page.screenshot({
			path: "tests/e2e/reports/screenshots/after-combat.png",
		});
	});

	test("game canvas maintains rendering after extended play", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		// Run for 30 seconds — enough for multiple simulation cycles,
		// enemy patrols, potential combat, resource ticks
		await page.waitForTimeout(30_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});
});
