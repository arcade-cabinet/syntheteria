/**
 * E2E: Save/Load — round-trip persistence.
 *
 * Verifies that game state can be saved and reloaded without
 * data loss or crashes. Will be fleshed out once save/load is implemented.
 */

import { expect, test } from "@playwright/test";

test.describe("Save/Load", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

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

	test("save/load round-trip preserves game state", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		// Let game run a few ticks to generate state
		await page.waitForTimeout(3000);

		// TODO: Trigger save via UI or keyboard shortcut once implemented
		// TODO: Verify save succeeded
		// TODO: Reload and verify state matches

		// For now, just verify the game is still running without errors
		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});
});
