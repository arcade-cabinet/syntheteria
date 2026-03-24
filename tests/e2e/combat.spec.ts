/**
 * E2E: Combat — unit selection, movement, combat resolution.
 *
 * These tests verify that player units can be selected, moved,
 * and that combat with enemies resolves with component damage.
 * Tests will be fleshed out once the full combat system is wired.
 */

import { expect, test } from "@playwright/test";

test.describe("Combat", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		// Start game
		const startButton = page.getByRole("button", {
			name: /start|new game|play/i,
		});
		if (await startButton.isVisible()) {
			await startButton.click();
		} else {
			await page.locator("canvas, #root").click();
		}
		await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
	});

	test("units are visible on the game canvas", async ({ page }) => {
		// After game starts, there should be rendered content on canvas
		await page.waitForTimeout(2000);
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();

		// Take a screenshot for visual verification
		await page.screenshot({
			path: "tests/e2e/reports/screenshots/units-visible.png",
		});
	});

	test("combat resolves without crash", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		// Let game run long enough for enemies to potentially engage
		await page.waitForTimeout(15_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});
});
