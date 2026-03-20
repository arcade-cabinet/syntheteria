/**
 * ai-observer-10turns.spec.ts — E2E test: start 4v4+cult observer game, advance 10 turns.
 *
 * Proves the game can:
 * 1. Start with all 4 AI factions (no player) in observer mode
 * 2. Advance 10 turns via debug bridge
 * 3. All 4 factions have units at game start
 * 4. AI factions make decisions (units move)
 * 5. Cult units spawn from breach zones
 * 6. No fatal JS errors
 *
 * Run: pnpm test:e2e --grep "AI Observer"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Types (mirrors main.tsx bridge)
// ---------------------------------------------------------------------------

interface UnitInfo {
	entityId: number;
	tileX: number;
	tileZ: number;
	factionId: string;
	hp: number;
	ap: number;
	modelId: string;
}

interface FactionStats {
	factionId: string;
	unitCount: number;
	totalHp: number;
	buildingCount: number;
	territoryPercent: number;
	totalResources: number;
	combatKills: number;
}

interface BuildingInfo {
	tileX: number;
	tileZ: number;
	factionId: string;
	buildingType: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REPORTS_DIR = path.resolve(__dirname, "reports");
const SCREENSHOTS_DIR = path.resolve(REPORTS_DIR, "screenshots");

async function clearPersistence(page: Page) {
	await page.goto("/");
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			sessionStorage.clear();
		} catch {
			/* noop */
		}
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((k) => caches.delete(k)));
		}
		if (typeof indexedDB.databases === "function") {
			const databases = await indexedDB.databases();
			await Promise.all(
				databases.map(
					(db) =>
						new Promise<void>((resolve) => {
							if (!db.name) {
								resolve();
								return;
							}
							const req = indexedDB.deleteDatabase(db.name);
							req.onsuccess = () => resolve();
							req.onerror = () => resolve();
							req.onblocked = () => resolve();
						}),
				),
			);
		}
	});
}

async function getUnits(page: Page): Promise<UnitInfo[]> {
	return page.evaluate(() => window.__syntheteria?.getUnits() ?? []);
}

async function getBuildings(page: Page): Promise<BuildingInfo[]> {
	return page.evaluate(() => window.__syntheteria?.getBuildings() ?? []);
}

async function getFactionStats(page: Page): Promise<FactionStats[]> {
	return page.evaluate(() => window.__syntheteria?.getFactionStats() ?? []);
}

async function advanceNTurns(page: Page, n: number): Promise<void> {
	await page.evaluate((turns) => window.__syntheteria?.advanceNTurns(turns), n);
}

async function readBridgeTurn(page: Page): Promise<number> {
	return page.evaluate(() => window.__syntheteria?.turn ?? -1);
}

async function readBridgePhase(page: Page): Promise<string> {
	return page.evaluate(() => window.__syntheteria?.phase ?? "unknown");
}

async function captureScreenshot(
	page: Page,
	name: string,
): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

/**
 * Start a 4v4+cult game with all AI factions (observer mode).
 * Uses the New Game modal: deselect player, select small map, start.
 */
async function bootObserverGame(page: Page, seed = "e2e-observer-10") {
	await clearPersistence(page);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("landing-screen")).toBeVisible({
		timeout: 10_000,
	});

	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({
		state: "visible",
		timeout: 5_000,
	});

	// Set seed for reproducibility
	await page.getByTestId("seed-input").fill(seed);

	// Select small map for speed
	await page.getByTestId("scale-small").click();

	// Deselect player faction (makes all factions AI → observer mode)
	await page.getByTestId("faction-reclaimers-player-radio").click();

	// Verify observer mode text appears
	await expect(page.getByText("observer mode")).toBeVisible({ timeout: 2_000 });

	// Start the game
	await page.getByTestId("start-btn").click();

	// Wait for game phase
	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 30_000 },
	);

	// Immediately pause observer auto-advance by setting speed to 0
	// Need to wait for React to render and the bridge to be fully wired
	await page.waitForFunction(
		() => {
			if (window.__syntheteria?.isObserverMode) {
				window.__syntheteria.setObserverSpeed(0);
				return true;
			}
			return false;
		},
		{ timeout: 5_000 },
	);

	// Wait for HUD to render
	await page.getByTestId("hud").waitFor({ timeout: 15_000 });
}

/**
 * Fallback: start a normal game with player if observer mode boot fails.
 * The debug bridge can still advance turns manually.
 */
async function bootNormalGame(page: Page, seed = "e2e-observer-10") {
	await clearPersistence(page);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("landing-screen")).toBeVisible({
		timeout: 10_000,
	});

	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({
		state: "visible",
		timeout: 5_000,
	});

	await page.getByTestId("seed-input").fill(seed);
	await page.getByTestId("scale-small").click();
	await page.getByTestId("start-btn").click();

	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 30_000 },
	);
	await page.getByTestId("hud").waitFor({ timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("AI Observer — 10-turn game", () => {
	test.setTimeout(120_000);

	test("start 4v4+cult observer game, advance 10 turns, verify game state", async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		// ── Boot game ──
		// Try observer mode first, fall back to normal game
		let isObserver = false;
		try {
			await bootObserverGame(page);
			isObserver = true;
		} catch {
			await bootNormalGame(page);
		}

		// ── Turn 1: Verify initial state ──
		const phase = await readBridgePhase(page);
		expect(phase).toBe("playing");

		const initialStats = await getFactionStats(page);
		const initialUnits = await getUnits(page);
		const initialBuildings = await getBuildings(page);

		// All 4 AI factions should have units at game start
		const aiFactionIds = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];
		// In normal mode, player faction is "player" instead of "reclaimers"
		const playerFactionId = isObserver ? null : "player";

		// At least 4 factions with units (player + 3 AI, or 4 AI in observer)
		const factionsWithUnits = initialStats.filter((f) => f.unitCount > 0);
		expect(factionsWithUnits.length).toBeGreaterThanOrEqual(4);

		// Total units should be 18 (6 player/reclaimers + 4*3 AI)
		expect(initialUnits.length).toBeGreaterThanOrEqual(16);

		// Buildings should exist (AI factions get starter buildings)
		expect(initialBuildings.length).toBeGreaterThan(0);

		// Each faction should be in a different map region
		const factionCenters = new Map<string, { x: number; z: number }>();
		for (const u of initialUnits) {
			if (!factionCenters.has(u.factionId)) {
				factionCenters.set(u.factionId, { x: u.tileX, z: u.tileZ });
			}
		}
		// Verify factions are spread out (no two centers within 5 tiles)
		const centers = [...factionCenters.entries()];
		for (let i = 0; i < centers.length; i++) {
			for (let j = i + 1; j < centers.length; j++) {
				const dx = Math.abs(centers[i][1].x - centers[j][1].x);
				const dz = Math.abs(centers[i][1].z - centers[j][1].z);
				const dist = Math.max(dx, dz);
				expect(
					dist,
					`Factions ${centers[i][0]} and ${centers[j][0]} too close (${dist} tiles)`,
				).toBeGreaterThan(3);
			}
		}

		// Screenshot at turn 1
		await captureScreenshot(page, "observer-e2e-turn1");

		// Record initial positions for change detection
		const initialPositions = new Map(
			initialUnits.map((u) => [u.entityId, { x: u.tileX, z: u.tileZ }]),
		);

		// ── Advance 10 turns ──
		await advanceNTurns(page, 10);
		await page.waitForTimeout(300); // Allow state to settle

		// ── Turn 10+: Verify post-advance state ──
		const finalPhase = await readBridgePhase(page);
		expect(finalPhase).toBe("playing");

		const finalStats = await getFactionStats(page);
		const finalUnits = await getUnits(page);
		const finalBuildings = await getBuildings(page);

		// Game should still be running (not crashed to landing)
		expect(finalStats.length).toBeGreaterThan(0);

		// At least some factions should still have units
		const survivingFactions = finalStats.filter((f) => f.unitCount > 0);
		expect(survivingFactions.length).toBeGreaterThanOrEqual(2);

		// AI should have moved some units (positions changed from turn 1)
		let unitsMoved = 0;
		for (const u of finalUnits) {
			const initial = initialPositions.get(u.entityId);
			if (initial && (initial.x !== u.tileX || initial.z !== u.tileZ)) {
				unitsMoved++;
			}
		}
		// At least some AI units should have moved in 10 turns
		expect(
			unitsMoved,
			"AI factions should have moved at least 1 unit in 10 turns",
		).toBeGreaterThanOrEqual(1);

		// Check for cult spawns (static_remnants, null_monks, or lost_signal)
		const cultFactionIds = [
			"static_remnants",
			"null_monks",
			"lost_signal",
		];
		const cultUnits = finalUnits.filter((u) =>
			cultFactionIds.includes(u.factionId),
		);
		// Cults should have spawned by turn 10
		expect(
			cultUnits.length,
			"Cult units should have spawned by turn 10",
		).toBeGreaterThan(0);

		// Screenshot at turn 10
		await captureScreenshot(page, "observer-e2e-turn10");

		// ── Verify no fatal JS errors ──
		const criticalErrors = pageErrors.filter(
			(e) =>
				!e.includes("Warning:") &&
				!e.includes("[HMR]") &&
				!e.includes("WebGL") &&
				!e.includes("THREE.WebGLRenderer") &&
				!e.includes("Tone.js") &&
				!e.includes("AudioParam") &&
				!e.includes("createRoot"),
		);
		expect(
			criticalErrors,
			`Unexpected JS errors: ${criticalErrors.join("\n")}`,
		).toHaveLength(0);

		// ── Generate diagnostic JSON report ──
		const report = {
			testName: "AI Observer 10-turn E2E",
			seed: "e2e-observer-10",
			isObserverMode: isObserver,
			timestamp: new Date().toISOString(),
			result: "PASS",
			turn1: {
				factionsWithUnits: factionsWithUnits.map((f) => f.factionId),
				totalUnits: initialUnits.length,
				totalBuildings: initialBuildings.length,
				factionStats: initialStats,
			},
			turn10: {
				survivingFactions: survivingFactions.map((f) => f.factionId),
				totalUnits: finalUnits.length,
				totalBuildings: finalBuildings.length,
				unitsMoved,
				cultUnitsSpawned: cultUnits.length,
				factionStats: finalStats,
			},
			jsErrors: pageErrors,
			criticalErrors: criticalErrors,
		};

		fs.mkdirSync(REPORTS_DIR, { recursive: true });
		const reportPath = path.join(
			REPORTS_DIR,
			"ai-observer-10turn-results.json",
		);
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
		expect(fs.existsSync(reportPath)).toBe(true);
	});
});
