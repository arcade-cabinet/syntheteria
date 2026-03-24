/**
 * E2E: Save/Load — round-trip persistence.
 *
 * The save/load system (src/db/persistence.ts) is implemented but
 * there is no UI to trigger it yet. These tests verify the game
 * is stable after initialization (prerequisite for save/load).
 *
 * Once a save/load UI is wired, these tests should use button clicks
 * or keyboard shortcuts instead of being stubs.
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

test.describe("Save/Load", () => {
	test.beforeEach(async ({ page }) => {
		await startGameFully(page);
	});

	test("game is stable after initialization — baseline for save/load", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		await page.waitForTimeout(3_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});

	test.skip("save/load round-trip preserves game state", async ({ page }) => {
		// TODO: Once save/load UI is wired (keyboard shortcut or menu button):
		// 1. Let game run to generate meaningful state
		// 2. Trigger save
		// 3. Note current unit positions / resource counts
		// 4. Reload page and load the save
		// 5. Verify unit positions / resource counts match

		// This test is skipped until save/load UI is implemented.
		// The persistence module itself is tested via Vitest unit tests
		// in src/db/__tests__/persistence.vitest.ts (9 tests).
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));
		await page.waitForTimeout(3_000);
		expect(errors).toHaveLength(0);
	});
});
