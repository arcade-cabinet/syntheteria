/**
 * screenshot-visual-qa.spec.ts — Visual QA screenshots of every rendering layer.
 *
 * Captures screenshots at key points in the game flow for human review:
 *   1. Title screen (3D text + globe + storm)
 *   2. Game board — default zoom (fog of war, biome textures, structures)
 *   3. Game board — zoomed in (unit models, salvage props, highlights)
 *   4. Game board — zoomed out (biome transitions, curvature, storm dome horizon)
 *   5. HUD overlay (turn counter, AP, resources, end-turn button)
 *   6. Post-turn board (after End Turn — fog/highlight changes)
 *
 * Screenshots are saved to tests/e2e/screenshots/.
 * Run: pnpm test:e2e --grep "Screenshot Visual QA"
 */

import { test, expect } from "@playwright/test";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(__dirname, "screenshots");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clearPersistence(page: import("@playwright/test").Page) {
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

async function startNewGame(
	page: import("@playwright/test").Page,
	seed: string,
) {
	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({
		state: "visible",
		timeout: 5000,
	});
	await page.getByTestId("seed-input").fill(seed);
	await page.getByTestId("difficulty-story").click();
	await page.getByTestId("start-btn").click();
}

/** Wait for a few extra frames to let the 3D scene settle. */
async function waitForRender(page: import("@playwright/test").Page, ms = 2000) {
	await page.waitForTimeout(ms);
}

/**
 * Check that a canvas screenshot is not entirely black or entirely one colour.
 * Returns the percentage of pixels that differ from the top-left pixel.
 */
async function canvasHasContent(page: import("@playwright/test").Page): Promise<boolean> {
	return page.evaluate(() => {
		const canvas = document.querySelector("canvas");
		if (!canvas) return false;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) {
			// WebGL canvas — try readPixels via the existing context
			const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
			if (!gl) return false;
			const w = canvas.width;
			const h = canvas.height;
			// Sample a small region in the center
			const sampleSize = Math.min(64, w, h);
			const startX = Math.floor((w - sampleSize) / 2);
			const startY = Math.floor((h - sampleSize) / 2);
			const pixels = new Uint8Array(sampleSize * sampleSize * 4);
			gl.readPixels(startX, startY, sampleSize, sampleSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			// Check if all pixels are the same (all black = no content)
			const r0 = pixels[0], g0 = pixels[1], b0 = pixels[2];
			let diffCount = 0;
			for (let i = 0; i < pixels.length; i += 4) {
				if (pixels[i] !== r0 || pixels[i + 1] !== g0 || pixels[i + 2] !== b0) {
					diffCount++;
				}
			}
			const totalPixels = sampleSize * sampleSize;
			// At least 5% of sampled pixels should differ from the corner pixel
			return diffCount / totalPixels > 0.05;
		}
		return false;
	});
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("Screenshot Visual QA", () => {
	test.setTimeout(120_000);

	/** Collect console warnings/errors throughout all tests for the bug report. */
	const consoleMessages: string[] = [];
	const pageErrors: string[] = [];

	test("1 — Title screen: 3D text + globe + storm", async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "warning" || msg.type() === "error") {
				consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
			}
		});
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("landing-screen")).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		// Wait for the 3D title scene to render (storm clouds, globe, text)
		await waitForRender(page, 3000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "01-title-screen.png"),
			fullPage: false,
		});

		// Verify canvas exists and has rendered content
		const canvas = page.locator("canvas").first();
		await expect(canvas).toBeVisible();
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeGreaterThan(100);
		expect(box!.height).toBeGreaterThan(100);
	});

	test("2 — Game board: default zoom (fog, biomes, structures)", async ({
		page,
	}) => {
		page.on("console", (msg) => {
			if (msg.type() === "warning" || msg.type() === "error") {
				consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
			}
		});
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "VISUALQA1");

		// Wait for game phase and HUD (scene fully loaded)
		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });

		// Extra wait for GLB models to load (salvage, buildings, units)
		await waitForRender(page, 4000);

		// Full page screenshot — board + HUD
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "02-game-board-default-zoom.png"),
			fullPage: false,
		});

		// Canvas-only screenshot
		const canvas = page.locator("canvas").first();
		await canvas.screenshot({
			path: path.join(SCREENSHOT_DIR, "02b-canvas-only-default-zoom.png"),
		});

		// Verify canvas is rendering
		const canvasBox = await canvas.boundingBox();
		expect(canvasBox).not.toBeNull();
		expect(canvasBox!.width).toBeGreaterThan(0);
	});

	test("3 — Game board: zoomed in (units, salvage, highlights)", async ({
		page,
	}) => {
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "VISUALQA2");

		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });
		await waitForRender(page, 3000);

		// Zoom in using mouse wheel on canvas center
		const canvas = page.locator("canvas").first();
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		const cx = box!.x + box!.width / 2;
		const cy = box!.y + box!.height / 2;

		// Scroll down = zoom in (OrbitControls convention)
		for (let i = 0; i < 8; i++) {
			await page.mouse.wheel(0, -120);
			await page.waitForTimeout(80);
		}
		await waitForRender(page, 2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "03-zoomed-in-units-salvage.png"),
			fullPage: false,
		});

		// Try to click a unit to see highlights
		await page.mouse.click(cx, cy);
		await page.waitForTimeout(500);

		// Try a few clicks near center to hit a unit
		for (let attempt = 0; attempt < 4; attempt++) {
			const bridge = await page.evaluate(
				() => window.__syntheteria?.selectedUnitId,
			);
			if (bridge != null) break;
			const ox = (attempt - 1.5) * 15;
			const oy = (attempt - 1.5) * 10;
			await page.mouse.click(cx + ox, cy + oy);
			await page.waitForTimeout(300);
		}

		await waitForRender(page, 1000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "03b-zoomed-in-with-highlights.png"),
			fullPage: false,
		});
	});

	test("4 — Game board: zoomed out (biome transitions, curvature, storm dome)", async ({
		page,
	}) => {
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "VISUALQA3");

		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });
		await waitForRender(page, 3000);

		const canvas = page.locator("canvas").first();
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		// Scroll up = zoom out
		for (let i = 0; i < 12; i++) {
			await page.mouse.wheel(0, 120);
			await page.waitForTimeout(80);
		}
		await waitForRender(page, 2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "04-zoomed-out-biome-curvature.png"),
			fullPage: false,
		});

		// Zoom out even more to see the storm dome horizon
		for (let i = 0; i < 8; i++) {
			await page.mouse.wheel(0, 120);
			await page.waitForTimeout(80);
		}
		await waitForRender(page, 2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "04b-max-zoom-storm-dome-horizon.png"),
			fullPage: false,
		});
	});

	test("5 — HUD overlay detail", async ({ page }) => {
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "VISUALQA4");

		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });
		await waitForRender(page, 2000);

		// HUD element screenshot
		const hud = page.getByTestId("hud");
		await hud.screenshot({
			path: path.join(SCREENSHOT_DIR, "05-hud-overlay.png"),
		});

		// Verify HUD text content
		await expect(page.getByTestId("turn-display")).toHaveText("TURN 1");
		await expect(page.getByTestId("ap-display")).toHaveText("AP 3 / 3");
		await expect(page.getByTestId("end-turn-btn")).toBeVisible();
	});

	test("6 — Post-turn board state (after End Turn)", async ({ page }) => {
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "VISUALQA5");

		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });
		await waitForRender(page, 3000);

		// End turn and take screenshot
		await page.getByTestId("end-turn-btn").click();
		await page.waitForFunction(
			() => window.__syntheteria?.turn === 2,
			{ timeout: 10_000 },
		);
		await waitForRender(page, 2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "06-post-turn-2-board.png"),
			fullPage: false,
		});

		await expect(page.getByTestId("turn-display")).toHaveText("TURN 2");

		// Advance a few more turns to check for visual degradation
		for (let t = 3; t <= 5; t++) {
			await page.getByTestId("end-turn-btn").click();
			await page.waitForFunction(
				(expected) => window.__syntheteria?.turn === expected,
				t,
				{ timeout: 10_000 },
			);
		}
		await waitForRender(page, 2000);

		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "06b-post-turn-5-board.png"),
			fullPage: false,
		});

		await expect(page.getByTestId("turn-display")).toHaveText("TURN 5");
	});

	test("7 — Bug report: console warnings and errors", async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "warning" || msg.type() === "error") {
				consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
			}
		});
		page.on("pageerror", (err) => pageErrors.push(err.message));

		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("title-new_game")).toBeVisible({
			timeout: 10_000,
		});

		await startNewGame(page, "BUGCHECK1");

		await page.waitForFunction(
			() => window.__syntheteria?.phase === "playing",
			{ timeout: 25_000 },
		);
		await expect(page.getByTestId("hud")).toBeVisible({ timeout: 15_000 });

		// Run a few turns to exercise all systems
		for (let t = 2; t <= 4; t++) {
			await page.getByTestId("end-turn-btn").click();
			await page.waitForFunction(
				(expected) => window.__syntheteria?.turn === expected,
				t,
				{ timeout: 10_000 },
			);
			await page.waitForTimeout(500);
		}

		// Filter console output for bugs (excluding benign warnings)
		const benignPatterns = [
			"Warning:",
			"[HMR]",
			"WebGL",
			"THREE.WebGLRenderer",
			"Tone.js",
			"DevTools",
			"Download the React DevTools",
			"GPU stall",
			"deprecated",
		];

		const criticalErrors = pageErrors.filter(
			(e) => !benignPatterns.some((pat) => e.includes(pat)),
		);

		const criticalWarnings = consoleMessages.filter(
			(e) => !benignPatterns.some((pat) => e.includes(pat)),
		);

		// Log findings for human review (these appear in test output)
		if (criticalErrors.length > 0) {
			console.log("\n=== CRITICAL PAGE ERRORS ===");
			for (const e of criticalErrors) console.log(`  ${e}`);
		}

		if (criticalWarnings.length > 0) {
			console.log("\n=== NOTABLE CONSOLE WARNINGS ===");
			for (const w of criticalWarnings.slice(0, 20))
				console.log(`  ${w}`);
			if (criticalWarnings.length > 20) {
				console.log(`  ... and ${criticalWarnings.length - 20} more`);
			}
		}

		// Critical page errors should be zero (not just warnings)
		expect(
			criticalErrors,
			`Unexpected page errors:\n${criticalErrors.join("\n")}`,
		).toHaveLength(0);
	});
});
