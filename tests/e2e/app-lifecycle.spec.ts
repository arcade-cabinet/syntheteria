/**
 * E2E: App lifecycle — title screen, new game modal, narration, gameplay.
 *
 * Verifies the full app lifecycle:
 *   title screen → new game modal → narration → gameplay canvas
 *
 * WebGL context errors are filtered — Playwright's Chromium uses SwiftShader
 * which may fail with multiple WebGL contexts (globe background + game canvas).
 */

import { expect, test } from "@playwright/test";

/** Returns true if the error is a WebGL/Three.js context issue (test env only). */
function isWebGLError(message: string): boolean {
	return (
		message.includes("WebGL") ||
		message.includes("THREE.WebGLRenderer") ||
		message.includes("Error creating WebGL context")
	);
}

/** Navigate through title → new game modal → narration skip → gameplay. */
async function startGameFully(page: import("@playwright/test").Page) {
	await page.goto("/");

	// Title screen: wait for [ NEW GAME ] button to appear (menu fades in after ~1.2s)
	const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
	await expect(newGameButton).toBeVisible({ timeout: 5_000 });
	await newGameButton.click();

	// New game modal: click [ START ]
	const startButton = page.getByRole("button", { name: /START/i });
	await expect(startButton).toBeVisible({ timeout: 3_000 });
	await startButton.click();

	// Narration: click the inner SKIP button (the overlay is also a <button>,
	// so we use .last() to target the leaf SKIP button, not the outer wrapper)
	const skipButton = page.getByRole("button", { name: /SKIP/i }).last();
	await expect(skipButton).toBeVisible({ timeout: 3_000 });
	await skipButton.click();

	// Gameplay canvas should appear
	await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
}

test.describe("App Lifecycle", () => {
	test("title screen loads with SYNTHETERIA heading and menu", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		await page.goto("/");

		// The R3F globe background canvas should load
		await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });

		// SYNTHETERIA title text should be visible
		await expect(page.getByText("SYNTHETERIA")).toBeVisible({
			timeout: 5_000,
		});

		// Menu buttons should appear (after fade-in delay)
		await expect(page.getByRole("button", { name: /NEW GAME/i })).toBeVisible({
			timeout: 5_000,
		});

		expect(errors).toHaveLength(0);
	});

	test("no console errors on initial load (excluding WebGL)", async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text();
				if (!isWebGLError(text)) errors.push(text);
			}
		});

		await page.goto("/");
		await expect(page.locator("canvas")).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(2_000);

		expect(errors).toHaveLength(0);
	});

	test("new game modal opens with seed and difficulty options", async ({
		page,
	}) => {
		await page.goto("/");

		const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
		await expect(newGameButton).toBeVisible({ timeout: 5_000 });
		await newGameButton.click();

		// Modal should show INITIALIZE header
		await expect(page.getByText("INITIALIZE")).toBeVisible({
			timeout: 3_000,
		});

		// Seed input should be present
		await expect(page.locator("#seed-input")).toBeVisible();

		// Difficulty buttons
		await expect(page.getByRole("button", { name: "EASY" })).toBeVisible();
		await expect(page.getByRole("button", { name: "NORMAL" })).toBeVisible();
		await expect(page.getByRole("button", { name: "HARD" })).toBeVisible();

		// START and BACK buttons
		await expect(page.getByRole("button", { name: /START/i })).toBeVisible();
		await expect(page.getByRole("button", { name: /BACK/i })).toBeVisible();
	});

	test("full flow: title → modal → narration → gameplay", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		await startGameFully(page);

		await expect(page.locator("canvas")).toBeVisible();
		expect(errors).toHaveLength(0);
	});

	test("game runs 20 cycles without crash", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isWebGLError(err.message)) errors.push(err.message);
		});

		await startGameFully(page);

		// Let the game run for ~20 simulation cycles
		await page.waitForTimeout(10_000);

		expect(errors).toHaveLength(0);
		await expect(page.locator("canvas")).toBeVisible();
	});

	test("BACK button on modal returns to title screen", async ({ page }) => {
		await page.goto("/");

		const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
		await expect(newGameButton).toBeVisible({ timeout: 5_000 });
		await newGameButton.click();

		const backButton = page.getByRole("button", { name: /BACK/i });
		await expect(backButton).toBeVisible({ timeout: 3_000 });
		await backButton.click();

		await expect(page.getByRole("button", { name: /NEW GAME/i })).toBeVisible({
			timeout: 3_000,
		});
		await expect(page.getByText("INITIALIZE")).not.toBeVisible();
	});
});
