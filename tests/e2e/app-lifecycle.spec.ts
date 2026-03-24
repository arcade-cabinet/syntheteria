/**
 * E2E: App lifecycle — title screen, game start, stability.
 *
 * These tests verify the full app lifecycle from title screen
 * through game initialization and sustained operation.
 */

import { expect, test } from "@playwright/test";

test.describe("App Lifecycle", () => {
	test("title screen loads without errors", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

		await page.goto("/");
		// Title screen should render — look for the game container
		await expect(page.locator("canvas, #root")).toBeVisible({
			timeout: 10_000,
		});
		expect(errors).toHaveLength(0);
	});

	test("no console errors on initial load", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") errors.push(msg.text());
		});

		await page.goto("/");
		await page.waitForTimeout(2000);
		expect(errors).toHaveLength(0);
	});

	test("new game can be started", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(1000);

		// Look for a start/new game button or click-to-start
		const startButton = page.getByRole("button", {
			name: /start|new game|play/i,
		});
		if (await startButton.isVisible()) {
			await startButton.click();
		} else {
			// Some title screens advance on click/tap
			await page.locator("canvas, #root").click();
		}

		// After starting, the game canvas should be present
		await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
	});

	test("game runs 20 cycles without crash", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));

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

		// Let the game run for ~20 simulation cycles (~10 seconds at 2 ticks/sec)
		await page.waitForTimeout(10_000);

		// No unhandled errors should have occurred
		expect(errors).toHaveLength(0);

		// Canvas should still be rendering (not blank/crashed)
		await expect(page.locator("canvas")).toBeVisible();
	});
});
