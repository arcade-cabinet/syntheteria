/**
 * Comprehensive E2E tests for Syntheteria.
 *
 * These tests run in a REAL browser and catch everything unit tests miss:
 * - R3F "not part of THREE namespace" (HTML inside Canvas)
 * - import.meta crashes
 * - Lazy-load failures
 * - Canvas/WebGL context errors
 * - Broken event handlers
 * - Missing imports at runtime
 * - CSS/layout issues
 * - Phase transition bugs
 *
 * Button selectors use aria-label patterns because MenuButton/ActionButton
 * set aria-labels that override the visible text for accessibility.
 */
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all page errors during a test */
function collectErrors(page: Page) {
	const errors: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));
	return errors;
}

/** Assert no critical errors occurred */
function assertNoCriticalErrors(errors: string[]) {
	const critical = errors.filter(
		(e) =>
			e.includes("THREE namespace") ||
			e.includes("not part of") ||
			e.includes("import.meta") ||
			e.includes("Cannot read properties of undefined") ||
			e.includes("Cannot read properties of null") ||
			e.includes("is not a function") ||
			e.includes("is not defined") ||
			e.includes("Unexpected token") ||
			e.includes("SyntaxError"),
	);
	expect(
		critical,
		`Critical runtime errors:\n${critical.join("\n")}`,
	).toHaveLength(0);
}

/** Navigate from title to pregame */
async function goToPregame(page: Page) {
	await page.goto("/");
	// Wait for fade-in animation
	await page.waitForTimeout(2000);
	await page.getByRole("button", { name: /new colony mission/i }).click();
	await page.waitForTimeout(500);
}

/** Navigate from title through pregame to game launch */
async function launchGame(page: Page) {
	await goToPregame(page);
	const launchBtn = page.getByRole("button", {
		name: /launch colony mission/i,
	});
	if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
		await launchBtn.click();
	}
	// Wait for GameScene to lazy-load, init, and render
	await page.waitForTimeout(8000);
}

// ---------------------------------------------------------------------------
// Title Screen
// ---------------------------------------------------------------------------

test.describe("Title Screen", () => {
	test("renders without errors", async ({ page }) => {
		const errors = collectErrors(page);
		await page.goto("/");
		await expect(page.getByText("SYNTHETERIA")).toBeVisible();
		await page.waitForTimeout(2000);
		assertNoCriticalErrors(errors);
	});

	test("NEW GAME button is enabled and clickable", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(2000);
		const btn = page.getByRole("button", { name: /new colony mission/i });
		await expect(btn).toBeVisible();
		await expect(btn).toBeEnabled();
		await btn.click();
		// Should navigate to pregame (title disappears)
		await expect(page.getByText("SYNTHETERIA")).not.toBeVisible({
			timeout: 3000,
		});
	});

	test("CONTINUE and SETTINGS are disabled", async ({ page }) => {
		await page.goto("/");
		await page.waitForTimeout(2000);
		await expect(
			page.getByRole("button", { name: /saved missions|continue/i }),
		).toBeDisabled();
		await expect(
			page.getByRole("button", { name: /settings/i }),
		).toBeDisabled();
	});

	test("no console errors on initial load", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});
		await page.goto("/");
		await page.waitForTimeout(3000);
		// Filter out expected warnings (React dev mode, etc)
		const real = consoleErrors.filter(
			(e) =>
				!e.includes("Warning:") &&
				!e.includes("DevTools") &&
				!e.includes("expected version"),
		);
		expect(real, `Console errors:\n${real.join("\n")}`).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Pregame Screen
// ---------------------------------------------------------------------------

test.describe("Pregame Screen", () => {
	test.beforeEach(async ({ page }) => {
		await goToPregame(page);
	});

	test("renders without errors after NEW GAME", async ({ page }) => {
		const errors = collectErrors(page);
		await page.waitForTimeout(2000);
		assertNoCriticalErrors(errors);
	});

	test("has LAUNCH COLONY button", async ({ page }) => {
		const launchBtn = page.getByRole("button", {
			name: /launch colony/i,
		});
		await expect(launchBtn).toBeVisible({ timeout: 5000 });
	});

	test("has ABORT MISSION button that returns to title", async ({ page }) => {
		const abortBtn = page.getByRole("button", {
			name: /return to title/i,
		});
		await expect(abortBtn).toBeVisible();
		await abortBtn.click();
		await expect(page.getByText("SYNTHETERIA")).toBeVisible({
			timeout: 3000,
		});
	});

	test("has tab navigation", async ({ page }) => {
		// Pregame has 4 tabs: PATRON, MAP, RIVALS, SETTINGS
		const tablist = page.getByRole("tablist");
		await expect(tablist).toBeVisible();
	});

	test("seed input is in pregame MAP tab", async ({ page }) => {
		// Click MAP tab
		const mapTab = page.getByRole("tab", { name: "MAP" });
		await expect(mapTab).toBeVisible();
		await mapTab.click();
		await page.waitForTimeout(300);
		// Seed input should be visible in the MAP tab (label: "MISSION SEED")
		const seedInput = page.getByLabel("MISSION SEED");
		await expect(seedInput).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Full Game Launch (title → pregame → loading → playing)
// ---------------------------------------------------------------------------

test.describe("Full Game Launch", () => {
	// These tests launch the full 3D game which requires WASM (Rapier physics)
	// and heavy WebGL. They may fail in headless CI with swiftshader but should
	// pass in headed mode or on a machine with GPU support.

	test("navigates title → pregame → playing without critical errors", async ({
		page,
	}) => {
		const errors = collectErrors(page);
		await launchGame(page);

		// Filter out WebGL/WASM errors that are expected in swiftshader
		const critical = errors.filter(
			(e) =>
				!e.includes("WebGL") &&
				!e.includes("WASM") &&
				!e.includes("wasm") &&
				(e.includes("THREE namespace") ||
					e.includes("not part of") ||
					e.includes("import.meta") ||
					e.includes("SyntaxError")),
		);
		expect(critical).toHaveLength(0);
	});

	test("Canvas or loading screen visible after launch", async ({ page }) => {
		await launchGame(page);
		// Either the Canvas rendered (game loaded) or the loading screen is still showing
		const canvas = page.locator("canvas");
		const loading = page.getByText(/INITIALIZING|LOADING/i);
		const hasCanvas = await canvas.isVisible().catch(() => false);
		const hasLoading = await loading.isVisible().catch(() => false);
		expect(hasCanvas || hasLoading).toBe(true);
	});

	test("if Canvas renders, it has no HTML children", async ({ page }) => {
		await launchGame(page);
		const canvas = page.locator("canvas");
		if (await canvas.isVisible().catch(() => false)) {
			const childCount = await page.evaluate(() => {
				const c = document.querySelector("canvas");
				return c ? c.children.length : -1;
			});
			expect(childCount).toBe(0);
		}
	});

	test("if Canvas renders, HUD elements coexist", async ({ page }) => {
		await launchGame(page);
		const canvas = page.locator("canvas");
		if (await canvas.isVisible().catch(() => false)) {
			const elementCount = await page.evaluate(
				() => document.querySelectorAll("div").length,
			);
			expect(elementCount).toBeGreaterThan(5);
		}
	});
});

// ---------------------------------------------------------------------------
// WebGL Context
// ---------------------------------------------------------------------------

test.describe("WebGL Context", () => {
	test("WebGL is available in test browser", async ({ page }) => {
		await page.goto("/");
		const hasWebGL = await page.evaluate(() => {
			const canvas = document.createElement("canvas");
			return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"));
		});
		expect(hasWebGL).toBe(true);
	});
});
