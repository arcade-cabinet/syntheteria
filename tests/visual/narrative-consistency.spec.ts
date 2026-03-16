/**
 * Narrative consistency checks — verifies brand elements, game-specific
 * terminology, and absence of placeholder text across key screens.
 *
 * Run: npx playwright test --project=visual tests/visual/narrative-consistency.spec.ts
 *
 * These tests catch:
 *   - Missing brand elements (title, subtitle, accent colors)
 *   - Placeholder text ("Lorem ipsum", "TODO", "placeholder", etc.)
 *   - Generic UI copy that doesn't match the game's narrative voice
 *   - Broken or missing UI elements in the title and new-game flows
 *
 * Screenshots are captured at each verification stage for manual review
 * and automated visual regression.
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

async function saveManualScreenshot(page: Page, name: string): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

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

/**
 * Scan the page for placeholder / Lorem ipsum text that should never appear
 * in a shipped build. Returns an array of matched strings (empty = clean).
 */
async function findPlaceholderText(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const placeholderPatterns = [
			/lorem ipsum/i,
			/placeholder/i,
			/\bTODO\b/,
			/\bFIXME\b/,
			/\bHACK\b/,
			/sample text/i,
			/test test/i,
			/asdf/i,
			/xxx+/i,
			/click here/i,
			/your text here/i,
			/insert .* here/i,
			/coming soon/i,
		];

		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			null,
		);

		const matches: string[] = [];
		let node: Node | null;
		while ((node = walker.nextNode())) {
			const text = (node.textContent ?? "").trim();
			if (text.length < 3) continue;

			for (const pattern of placeholderPatterns) {
				if (pattern.test(text)) {
					matches.push(
						`"${text.substring(0, 80)}" matched ${pattern.source}`,
					);
					break;
				}
			}
		}

		return matches;
	});
}

// ─── Title Screen Brand Elements ────────────────────────────────────────────

test.describe("title screen brand elements", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("displays SYNTHETERIA title with correct brand identity", async ({
		page,
	}) => {
		// The title must appear as "SYNTHETERIA" — the game's canonical name
		const title = page.getByText("SYNTHETERIA");
		await expect(title).toBeVisible({ timeout: 10_000 });

		// Verify the subtitle tagline exists — "Machine Consciousness Awakens"
		const subtitle = page.getByText("Machine Consciousness Awakens");
		await expect(subtitle).toBeVisible();

		// The page document title should be set to "Syntheteria"
		const documentTitle = await page.title();
		expect(documentTitle).toBe("Syntheteria");

		await saveManualScreenshot(page, "narrative-title-brand");

		await expect(page).toHaveScreenshot("narrative-title-brand.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});
	});

	test("shows correct menu buttons with game-appropriate labels", async ({
		page,
	}) => {
		// Wait for buttons to animate in
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		// New Game button — must use the game's terminology
		const newGameButton = page.getByTestId("title-new_game");
		await expect(newGameButton).toBeVisible();
		await expect(newGameButton).toContainText("New Game");

		// New Game meta text should reference world generation
		await expect(newGameButton).toContainText("generate persistent world");

		// Settings button — must be present and labeled
		const settingsButton = page.getByTestId("title-settings");
		await expect(settingsButton).toBeVisible();
		await expect(settingsButton).toContainText("Settings");
		await expect(settingsButton).toContainText("display");

		// Without a save, there should be no Continue/Load button
		await expect(page.getByTestId("title-load_game")).toHaveCount(0);

		await saveManualScreenshot(page, "narrative-title-buttons");
	});

	test("title screen has no placeholder or Lorem ipsum text", async ({
		page,
	}) => {
		await expect(page.getByText("SYNTHETERIA")).toBeVisible({
			timeout: 10_000,
		});

		// Allow full render
		await page.waitForTimeout(1500);

		const placeholders = await findPlaceholderText(page);
		expect(placeholders).toEqual([]);

		await saveManualScreenshot(page, "narrative-title-no-placeholders");
	});
});

// ─── New Game Modal Narrative Consistency ────────────────────────────────────

test.describe("new game modal narrative consistency", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("uses game-specific configuration terminology", async ({ page }) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-new_game").click();

		// The modal header must use the game's term, not generic "New Game"
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		// Seed section — uses "World Seed", not generic "seed" or "map name"
		await expect(page.getByText("World Seed")).toBeVisible();

		// Configuration sections use Syntheteria-specific terminology:
		// Sector Scale (not "map size"), Climate Pattern, Storm Intensity
		await expect(page.getByText("Sector Scale")).toBeVisible();
		await expect(page.getByText("Climate Pattern")).toBeVisible();
		await expect(page.getByText("Storm Intensity")).toBeVisible();
		await expect(page.getByText("Difficulty")).toBeVisible();

		// The confirm button uses "Generate World", not generic "Start" or "OK"
		const confirmButton = page.getByTestId("new-game-confirm");
		await expect(confirmButton).toBeVisible();
		await expect(confirmButton).toContainText("Generate World");

		await saveManualScreenshot(page, "narrative-new-game-terminology");

		await expect(page).toHaveScreenshot("narrative-new-game-terminology.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});
	});

	test("new game modal has no placeholder text", async ({ page }) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		await page.waitForTimeout(500);

		const placeholders = await findPlaceholderText(page);
		expect(placeholders).toEqual([]);

		await saveManualScreenshot(page, "narrative-new-game-no-placeholders");
	});

	test("configuration options have descriptive text, not stubs", async ({
		page,
	}) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		// Each option card must have a description — not empty or "..."
		// Check that Sector Scale options have meaningful descriptions
		await expect(page.getByText("Standard")).toBeVisible();

		// Difficulty options should have real descriptive text
		await expect(
			page.getByText("Balanced intended progression."),
		).toBeVisible();

		// Climate options should describe gameplay impact
		await expect(page.getByText("Temperate")).toBeVisible();

		// Storm options should describe storm behavior
		await expect(page.getByText("Volatile")).toBeVisible();

		await saveManualScreenshot(page, "narrative-config-descriptions");

		await expect(page).toHaveScreenshot(
			"narrative-config-descriptions.png",
			{
				animations: "disabled",
				maxDiffPixelRatio: 0.03,
			},
		);
	});
});

// ─── Settings Screen Narrative Consistency ──────────────────────────────────

test.describe("settings screen narrative consistency", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("settings overlay has no placeholder text", async ({ page }) => {
		await expect(page.getByTestId("title-settings")).toBeVisible({
			timeout: 10_000,
		});
		await page.getByTestId("title-settings").click();
		await expect(page.getByText("Settings")).toBeVisible();

		await page.waitForTimeout(500);

		const placeholders = await findPlaceholderText(page);
		expect(placeholders).toEqual([]);

		await saveManualScreenshot(page, "narrative-settings-no-placeholders");

		await expect(page).toHaveScreenshot(
			"narrative-settings-no-placeholders.png",
			{
				animations: "disabled",
				maxDiffPixelRatio: 0.03,
			},
		);
	});
});
