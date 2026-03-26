/**
 * E2E: Playtest Governor — automated gameplay via window.__syntheteria.
 *
 * Navigates the full app lifecycle, enables auto-play, and verifies
 * the governor makes meaningful decisions for 100+ simulation ticks.
 *
 * BabylonJS/WebGL errors are filtered — Playwright's Chromium uses
 * SwiftShader which may produce GPU-related warnings.
 */

import { expect, test } from "@playwright/test";

/** Returns true if the error is a BabylonJS/WebGL issue (test env only). */
function isEngineError(message: string): boolean {
	return (
		message.includes("WebGL") ||
		message.includes("WebGPU") ||
		message.includes("THREE.") ||
		message.includes("Error creating WebGL context") ||
		message.includes("BABYLON") ||
		message.includes("GL_INVALID") ||
		message.includes("texture")
	);
}

/** Navigate through title -> new game modal -> narration skip -> gameplay. */
async function startGameFully(page: import("@playwright/test").Page) {
	await page.goto("/");

	// Title screen: wait for [ NEW GAME ] button
	const newGameButton = page.getByRole("button", { name: /NEW GAME/i });
	await expect(newGameButton).toBeVisible({ timeout: 5_000 });
	await newGameButton.click();

	// New game modal: click [ START ]
	const startButton = page.getByRole("button", { name: /START/i });
	await expect(startButton).toBeVisible({ timeout: 3_000 });
	await startButton.click();

	// Narration: click SKIP
	const skipButton = page.getByRole("button", { name: /SKIP/i }).last();
	await expect(skipButton).toBeVisible({ timeout: 3_000 });
	await skipButton.click();

	// Gameplay: wait for root to confirm render
	await expect(page.locator("#root")).toBeVisible({ timeout: 10_000 });
}

test.describe("Playtest Governor", () => {
	test("playtest bridge is available on window", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isEngineError(err.message)) errors.push(err.message);
		});

		await startGameFully(page);

		// Wait a moment for the game to initialize
		await page.waitForTimeout(2_000);

		// Check that the bridge is registered
		const hasBridge = await page.evaluate(() => {
			return typeof window.__syntheteria !== "undefined";
		});
		expect(hasBridge).toBe(true);

		// Check bridge methods exist
		const methods = await page.evaluate(() => {
			const bridge = window.__syntheteria;
			if (!bridge) return [];
			return Object.keys(bridge);
		});
		expect(methods).toContain("getTickNumber");
		expect(methods).toContain("enableAutoPlay");
		expect(methods).toContain("getPlayerUnitCount");
		expect(methods).toContain("getGovernorLog");

		expect(errors).toHaveLength(0);
	});

	test("auto-play runs governor and produces actions", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => {
			if (!isEngineError(err.message)) errors.push(err.message);
		});

		await startGameFully(page);
		await page.waitForTimeout(1_000);

		// Enable auto-play
		await page.evaluate(() => {
			window.__syntheteria?.enableAutoPlay();
		});

		const isEnabled = await page.evaluate(() => {
			return window.__syntheteria?.isAutoPlayEnabled();
		});
		expect(isEnabled).toBe(true);

		// Wait for ~100 ticks (at 1x speed, roughly 10-20 seconds)
		// We'll poll until we hit 100 ticks or timeout
		await page.waitForFunction(
			() => {
				const tick = window.__syntheteria?.getTickNumber() ?? 0;
				return tick >= 100;
			},
			{ timeout: 30_000 },
		);

		// Check results
		const results = await page.evaluate(() => {
			const bridge = window.__syntheteria;
			if (!bridge) return null;
			return {
				tick: bridge.getTickNumber(),
				playerUnits: bridge.getPlayerUnitCount(),
				enemies: bridge.getEnemyCount(),
				governorLog: bridge.getGovernorLog(),
				isAutoPlay: bridge.isAutoPlayEnabled(),
			};
		});

		expect(results).not.toBeNull();
		expect(results!.tick).toBeGreaterThanOrEqual(100);
		expect(results!.playerUnits).toBeGreaterThan(0);
		expect(results!.isAutoPlay).toBe(true);
		expect(results!.governorLog.length).toBeGreaterThan(0);

		// Governor should have made exploration or attack decisions
		const actionTypes = new Set(
			results!.governorLog.map((a: { action: string }) => a.action),
		);
		expect(actionTypes.size).toBeGreaterThan(0);

		expect(errors).toHaveLength(0);
	});

	test("auto-play can be disabled", async ({ page }) => {
		await startGameFully(page);
		await page.waitForTimeout(1_000);

		// Enable then disable
		await page.evaluate(() => {
			window.__syntheteria?.enableAutoPlay();
		});
		await page.evaluate(() => {
			window.__syntheteria?.disableAutoPlay();
		});

		const isEnabled = await page.evaluate(() => {
			return window.__syntheteria?.isAutoPlayEnabled();
		});
		expect(isEnabled).toBe(false);
	});

	test("snapshot returns game state data", async ({ page }) => {
		await startGameFully(page);
		await page.waitForTimeout(2_000);

		const snapshot = await page.evaluate(() => {
			return window.__syntheteria?.getSnapshot();
		});

		expect(snapshot).not.toBeNull();
		expect(snapshot).toHaveProperty("tick");
		expect(snapshot).toHaveProperty("unitCount");
		expect(snapshot).toHaveProperty("resources");
		expect(snapshot).toHaveProperty("gamePhase");
	});
});
