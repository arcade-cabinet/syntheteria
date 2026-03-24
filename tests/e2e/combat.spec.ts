/**
 * E2E: Combat — game runs long enough for enemy engagement.
 *
 * Verifies:
 *   - Game reaches gameplay phase
 *   - Game survives sustained operation without non-rendering crashes
 *
 * Three.js/WebGL errors are filtered (Playwright SwiftShader limitation).
 */

import { expect, test } from "@playwright/test";

function isThreeJSError(message: string): boolean {
	return (
		message.includes("WebGL") ||
		message.includes("THREE.") ||
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

	await expect(page.locator("#root")).toBeVisible({
		timeout: 10_000,
	});
}

test.describe("Combat", () => {
	test.beforeEach(async ({ page }) => {
		await startGameFully(page);
	});

	test("game reaches gameplay phase", async ({ page }) => {
		await page.waitForTimeout(2_000);
		await expect(page.locator("#root")).toBeVisible();

		await page.screenshot({
			path: "tests/e2e/reports/screenshots/units-visible.png",
		});
	});

	test("combat resolves without crash after 15 seconds", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isThreeJSError(err.message)) errors.push(err.message);
		});

		await page.waitForTimeout(15_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("#root")).toBeVisible();

		await page.screenshot({
			path: "tests/e2e/reports/screenshots/after-combat.png",
		});
	});

	test("game survives extended play without crash", async ({ page }) => {
		test.setTimeout(60_000); // 30s wait + overhead

		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isThreeJSError(err.message)) errors.push(err.message);
		});

		await page.waitForTimeout(30_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("#root")).toBeVisible();
	});
});
