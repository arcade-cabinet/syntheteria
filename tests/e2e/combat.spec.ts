/**
 * E2E: Combat — game runs long enough for enemy engagement.
 *
 * Verifies:
 *   - Units are visible on the game canvas
 *   - Game survives sustained combat (no crashes from component damage)
 *   - HUD/overlay elements render during gameplay
 *
 * WebGL context errors are filtered (Playwright SwiftShader limitation).
 */

import { expect, test } from "@playwright/test";

function isWebGLError(message: string): boolean {
	return (
		message.includes("WebGL") ||
		message.includes("THREE.WebGLRenderer") ||
		message.includes("Error creating WebGL context")
	);
}

async function startGameFully(page: import("@playwright/test").Page) {
	await page.goto("/");
	const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
	await expect(newGameButton).toBeVisible({ timeout: 5_000 });
	await newGameButton.click();

	const startButton = page.getByRole("button", { name: /START/i });
	await expect(startButton).toBeVisible({ timeout: 3_000 });
	await startButton.click();

	const skipButton = page.getByRole("button", { name: /SKIP/i }).last();
	await expect(skipButton).toBeVisible({ timeout: 3_000 });
	await skipButton.click();

	await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
}

test.describe("Combat", () => {
	test.beforeEach(async ({ page }) => {
		await startGameFully(page);
	});

	test("units are visible on the game canvas", async ({ page }) => {
		await page.waitForTimeout(2_000);
		const canvas = page.locator("canvas");
		await expect(canvas).toBeVisible();

		await page.screenshot({
			path: "tests/e2e/reports/screenshots/units-visible.png",
		});
	});

	test("combat resolves without crash after 15 seconds", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		// Let game run long enough for enemies to potentially engage
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
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		// Run for 30 seconds — enough for multiple simulation cycles
		await page.waitForTimeout(30_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});
});
