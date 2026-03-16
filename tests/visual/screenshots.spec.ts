/**
 * Visual regression screenshots — captures key game screens for manual review
 * and automated regression testing via toHaveScreenshot().
 *
 * Run: npx playwright test --project=visual tests/visual/screenshots.spec.ts
 *
 * On first run, Playwright creates baseline screenshots in
 * tests/visual/screenshots.spec.ts-snapshots/. Subsequent runs diff against
 * those baselines. To update baselines: npx playwright test --project=visual --update-snapshots
 *
 * Manual-review screenshots are also saved to tests/visual/screenshots/ for
 * quick visual inspection without needing the Playwright report.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots");

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearPersistence(page: Page) {
	await page.goto("/");
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			sessionStorage.clear();
		} catch {
			// Storage may be gated during early bootstrap.
		}
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		}
		if (typeof indexedDB.databases === "function") {
			const databases = await indexedDB.databases();
			await Promise.all(
				databases.map(
					(database) =>
						new Promise<void>((resolve) => {
							if (!database.name) {
								resolve();
								return;
							}
							const request = indexedDB.deleteDatabase(database.name);
							request.onsuccess = () => resolve();
							request.onerror = () => resolve();
							request.onblocked = () => resolve();
						}),
				),
			);
		}
	});
}

/** Save a manual-review screenshot alongside Playwright's snapshot system. */
async function saveManualScreenshot(page: Page, name: string): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

/** Dismiss thought overlays that may block UI elements. */
async function dismissThoughts(page: Page, maxAttempts = 5) {
	for (let i = 0; i < maxAttempts; i++) {
		const dismiss = page.getByText(/tap to dismiss/i);
		if ((await dismiss.count()) === 0) return;
		try {
			await dismiss.first().click({ force: true, timeout: 1500 });
		} catch {
			if ((await dismiss.count()) === 0) continue;
			await dismiss.first().dispatchEvent("click");
		}
		await page.waitForTimeout(100);
	}
}

// ─── Title Screen Screenshots ───────────────────────────────────────────────

test.describe("title screen visual regression", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("captures title screen at rest", async ({ page }) => {
		// Wait for the title text and button animations to settle
		// (Reanimated fade-in: 180ms delay + 900ms animation + 600ms button stagger)
		await expect(page.getByText("SYNTHETERIA")).toBeVisible({
			timeout: 10_000,
		});
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		// Allow animations to fully settle
		await page.waitForTimeout(2000);

		// Regression baseline via Playwright snapshots
		await expect(page).toHaveScreenshot("title-screen-rest.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});

		// Manual-review copy
		await saveManualScreenshot(page, "title-screen-rest");
	});

	test("captures title screen with settings overlay", async ({ page }) => {
		await expect(page.getByTestId("title-settings")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-settings").click();
		await expect(page.getByText("Settings")).toBeVisible();

		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot("title-screen-settings.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});

		await saveManualScreenshot(page, "title-screen-settings");
	});
});

// ─── New Game Flow Screenshots ──────────────────────────────────────────────

test.describe("new game flow visual regression", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("captures new game modal", async ({ page }) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot("new-game-modal.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});

		await saveManualScreenshot(page, "new-game-modal");
	});

	test("captures world generation and initial game scene", async ({
		page,
	}) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		// Confirm to generate the world
		await page.getByTestId("new-game-confirm").click();

		// Wait for the game scene to become ready
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 30_000,
		});

		// Dismiss any thought overlays blocking the view
		await dismissThoughts(page);

		// Check for render errors
		await expect(page.getByText(/Render Error:/i)).toHaveCount(0);

		// Let the scene settle (terrain rendering, shader compilation)
		await page.waitForTimeout(2000);

		await expect(page).toHaveScreenshot("initial-game-scene.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});

		await saveManualScreenshot(page, "initial-game-scene");
	});
});
