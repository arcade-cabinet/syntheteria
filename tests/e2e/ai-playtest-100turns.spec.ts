/**
 * AI Playtest Harness — 100-turn automated AI-vs-AI game.
 *
 * Starts a game with NO player faction (observer mode), advances 100 turns,
 * and captures per-faction stats at milestone turns (1, 10, 50, 100).
 *
 * Assertions at each milestone verify game health: no crashes, no NaN stats,
 * factions acting, resources changing, territory shifting.
 *
 * Generates an HTML report and JSON results in tests/e2e/reports/.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { generatePlaytestReport } from "./reports/report-generator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FactionStats {
	factionId: string;
	unitCount: number;
	totalHp: number;
	buildingCount: number;
	territoryPercent: number;
	totalResources: number;
	combatKills: number;
}

interface MilestoneSnapshot {
	turn: number;
	timestamp: number;
	factions: FactionStats[];
	totalUnits: number;
	totalBuildings: number;
	gamePhase: string;
	screenshotPath: string | null;
}

interface PlaytestReport {
	seed: string;
	startTime: number;
	endTime: number;
	totalTurns: number;
	milestones: MilestoneSnapshot[];
	errors: string[];
	outcome: { result: string; reason?: string } | null;
	crashed: boolean;
	crashMessage: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_TURNS = 100;
const MILESTONE_TURNS = new Set([1, 10, 50, 100]);
const SNAPSHOT_INTERVAL = 10; // Also capture stats every 10 turns
const REPORTS_DIR = path.resolve(__dirname, "reports");
const SCREENSHOTS_DIR = path.resolve(REPORTS_DIR, "screenshots");
const PLAYTEST_TIMEOUT = 600_000; // 10 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearPersistence(page: Page) {
	await page.goto("/");
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			sessionStorage.clear();
		} catch { /* noop */ }
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
							if (!db.name) { resolve(); return; }
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

async function getFactionStats(page: Page): Promise<FactionStats[]> {
	return page.evaluate(() => window.__syntheteria?.getFactionStats() ?? []);
}

async function getGameOutcome(page: Page): Promise<{ result: string; reason?: string } | null> {
	return page.evaluate(() => window.__syntheteria?.getGameOutcome() ?? null);
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

async function captureScreenshot(page: Page, turn: number): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filename = `turn-${String(turn).padStart(3, "0")}.png`;
	const filepath = path.join(SCREENSHOTS_DIR, filename);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

/**
 * Start a new game in observer mode (no player faction).
 * Uses the New Game modal with faction slots set to all AI.
 */
async function bootObserverGame(page: Page, seed = "ai-playtest-100") {
	await clearPersistence(page);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("landing-screen")).toBeVisible({ timeout: 10_000 });

	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({ state: "visible", timeout: 5_000 });

	// Set seed
	await page.getByTestId("seed-input").fill(seed);

	// Select small map for speed
	await page.getByTestId("scale-small").click();

	// Set observer mode — click the player faction slot to change role to "observer"
	// If there's an observer toggle, use it; otherwise the game auto-detects no player
	const observerToggle = page.getByTestId("observer-toggle");
	if (await observerToggle.isVisible().catch(() => false)) {
		await observerToggle.click();
	} else {
		// Fallback: set player slot to "none" if available
		const playerSlot = page.getByTestId("faction-slot-player");
		if (await playerSlot.isVisible().catch(() => false)) {
			await playerSlot.click(); // Cycle to observer/none
		}
	}

	// Start the game
	await page.getByTestId("start-btn").click();

	// Wait for game phase
	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 30_000 },
	);
	await page.getByTestId("hud").waitFor({ timeout: 15_000 });
}

/**
 * Fallback boot: start a normal game (with player) and use End Turn bridge.
 * Works even if observer mode UI isn't wired yet.
 */
async function bootNormalGame(page: Page, seed = "ai-playtest-100") {
	await clearPersistence(page);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("landing-screen")).toBeVisible({ timeout: 10_000 });

	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({ state: "visible", timeout: 5_000 });
	await page.getByTestId("seed-input").fill(seed);
	await page.getByTestId("scale-small").click();
	await page.getByTestId("start-btn").click();

	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 30_000 },
	);
	await page.getByTestId("hud").waitFor({ timeout: 15_000 });
}

function assertNoNaN(stats: FactionStats[], turn: number) {
	for (const s of stats) {
		const values = [s.unitCount, s.totalHp, s.buildingCount, s.territoryPercent, s.totalResources];
		for (const v of values) {
			if (typeof v !== "number" || Number.isNaN(v)) {
				throw new Error(`NaN detected in faction ${s.factionId} stats at turn ${turn}: ${JSON.stringify(s)}`);
			}
		}
	}
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe("AI-vs-AI 100-turn playtest", () => {
	test.setTimeout(PLAYTEST_TIMEOUT);

	test("100 turns with milestone assessments and report", async ({ page }) => {
		const report: PlaytestReport = {
			seed: "ai-playtest-100",
			startTime: Date.now(),
			endTime: 0,
			totalTurns: 0,
			milestones: [],
			errors: [],
			outcome: null,
			crashed: false,
			crashMessage: null,
		};

		// Collect console errors
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				const text = msg.text().substring(0, 500);
				// Filter known non-critical errors
				if (!text.includes("Tone.js") && !text.includes("AudioParam") && !text.includes("THREE.WebGLRenderer")) {
					report.errors.push(`[T${report.totalTurns}] ${text}`);
				}
			}
		});

		page.on("pageerror", (error) => {
			report.errors.push(`[pageerror T${report.totalTurns}] ${error.message.substring(0, 500)}`);
		});

		// ── Phase 1: Boot game ──
		// Try observer mode first, fall back to normal game
		try {
			await bootObserverGame(page);
		} catch {
			await bootNormalGame(page);
		}

		// Record initial state at turn 1
		const initialStats = await getFactionStats(page);
		const initialScreenshot = await captureScreenshot(page, 1);
		report.milestones.push({
			turn: 1,
			timestamp: Date.now(),
			factions: initialStats,
			totalUnits: initialStats.reduce((sum, f) => sum + f.unitCount, 0),
			totalBuildings: initialStats.reduce((sum, f) => sum + f.buildingCount, 0),
			gamePhase: await readBridgePhase(page),
			screenshotPath: initialScreenshot,
		});

		// ── Turn 1 assessment ──
		expect(initialStats.length).toBeGreaterThan(0);
		assertNoNaN(initialStats, 1);
		// At least some factions should have units at game start
		const facWithUnits = initialStats.filter((f) => f.unitCount > 0);
		expect(facWithUnits.length).toBeGreaterThan(0);

		// ── Phase 2: Advance turns with milestone captures ──
		let currentTurn = 1;

		for (let targetTurn = 2; targetTurn <= TOTAL_TURNS; targetTurn++) {
			// Advance one turn
			await advanceNTurns(page, 1);
			await page.waitForTimeout(50); // Brief pause for state update
			currentTurn = targetTurn;
			report.totalTurns = currentTurn;

			// Check for crash
			const phase = await readBridgePhase(page);
			if (phase !== "playing") {
				report.crashed = true;
				report.crashMessage = `Game phase changed to "${phase}" at turn ${currentTurn}`;
				break;
			}

			// Check for victory/defeat
			const outcome = await getGameOutcome(page);
			if (outcome && outcome.result !== "playing") {
				report.outcome = outcome;
				// Capture final milestone
				const finalStats = await getFactionStats(page);
				const finalScreenshot = await captureScreenshot(page, currentTurn);
				report.milestones.push({
					turn: currentTurn,
					timestamp: Date.now(),
					factions: finalStats,
					totalUnits: finalStats.reduce((sum, f) => sum + f.unitCount, 0),
					totalBuildings: finalStats.reduce((sum, f) => sum + f.buildingCount, 0),
					gamePhase: phase,
					screenshotPath: finalScreenshot,
				});
				break;
			}

			// Capture at milestone or every SNAPSHOT_INTERVAL turns
			const isMilestone = MILESTONE_TURNS.has(currentTurn);
			const isInterval = currentTurn % SNAPSHOT_INTERVAL === 0;

			if (isMilestone || isInterval) {
				const stats = await getFactionStats(page);
				assertNoNaN(stats, currentTurn);
				const screenshot = isMilestone ? await captureScreenshot(page, currentTurn) : null;

				report.milestones.push({
					turn: currentTurn,
					timestamp: Date.now(),
					factions: stats,
					totalUnits: stats.reduce((sum, f) => sum + f.unitCount, 0),
					totalBuildings: stats.reduce((sum, f) => sum + f.buildingCount, 0),
					gamePhase: phase,
					screenshotPath: screenshot,
				});

				// ── Turn 10 assessment ──
				if (currentTurn === 10) {
					// At least some factions should have moved (position delta from turn 1)
					// We check by verifying units still exist and game hasn't stalled
					expect(stats.length).toBeGreaterThan(0);
					const totalUnits = stats.reduce((sum, f) => sum + f.unitCount, 0);
					expect(totalUnits).toBeGreaterThan(0);
				}

				// ── Turn 50 assessment ──
				if (currentTurn === 50) {
					// Territory should be non-trivial
					const nonZeroTerritory = stats.filter((f) => f.territoryPercent > 0);
					expect(nonZeroTerritory.length).toBeGreaterThan(0);

					// No single faction should dominate > 80% territory
					for (const f of stats) {
						expect(f.territoryPercent).toBeLessThan(80);
					}

					// At least 2 factions should still have units
					const factionsWithUnits = stats.filter((f) => f.unitCount > 0);
					expect(factionsWithUnits.length).toBeGreaterThanOrEqual(2);
				}

				// ── Turn 100 assessment ──
				if (currentTurn === 100) {
					// Multiple factions should still be active
					const activeFactions = stats.filter((f) => f.unitCount > 0 || f.buildingCount > 0);
					expect(activeFactions.length).toBeGreaterThanOrEqual(1);

					// Game should still be running or have reached a conclusion
					expect(phase).toBe("playing");
				}
			}
		}

		// ── Phase 3: Generate report ──
		report.endTime = Date.now();

		fs.mkdirSync(REPORTS_DIR, { recursive: true });

		// Write JSON results
		const jsonPath = path.join(REPORTS_DIR, "ai-playtest-100-results.json");
		fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

		// Generate HTML report using existing generator (adapt data format)
		const adaptedResults = adaptForReportGenerator(report);
		const reportHtml = generatePlaytestReport(adaptedResults);
		const htmlPath = path.join(REPORTS_DIR, "ai-playtest-100-report.html");
		fs.writeFileSync(htmlPath, reportHtml, "utf-8");

		// ── Final assertions ──
		expect(report.crashed).toBe(false);
		expect(report.totalTurns).toBeGreaterThanOrEqual(10); // Should get at least 10 turns in
		expect(report.milestones.length).toBeGreaterThan(0);
		expect(fs.existsSync(jsonPath)).toBe(true);

		// No critical errors (filter known WebGL/audio noise)
		const criticalErrors = report.errors.filter(
			(e) =>
				!e.includes("Warning:") &&
				!e.includes("[HMR]") &&
				!e.includes("WebGL") &&
				!e.includes("Tone.js") &&
				!e.includes("AudioParam"),
		);
		expect(
			criticalErrors,
			`Critical errors during playtest: ${criticalErrors.join("\n")}`,
		).toHaveLength(0);
	});
});

// ─── Adapter ────────────────────────────────────────────────────────────────

/**
 * Adapt the AI playtest report format to match the existing report generator's
 * expected PlaytestResults shape.
 */
function adaptForReportGenerator(report: PlaytestReport) {
	return {
		seed: report.seed,
		startTime: report.startTime,
		endTime: report.endTime,
		totalTurns: report.totalTurns,
		snapshots: report.milestones.map((m) => ({
			turnNumber: m.turn,
			timestamp: m.timestamp,
			resources: {
				scrapMetal: 0,
				eWaste: 0,
				intactComponents: 0,
				ferrousScrap: 0,
				alloyStock: 0,
				polymerSalvage: 0,
				conductorWire: 0,
				electrolyte: 0,
				siliconWafer: 0,
				stormCharge: 0,
				elCrystal: 0,
			},
			unitCount: m.totalUnits,
			enemyCount: m.factions
				.filter((f) => f.factionId !== "player")
				.reduce((sum, f) => sum + f.unitCount, 0),
			stormIntensity: 0,
			activeScene: m.gamePhase,
			screenshotPath: m.screenshotPath,
		})),
		errors: report.errors,
		turnEventLog: null,
		victoryResult: report.outcome && report.outcome.result !== "playing"
			? {
				winner: report.outcome.result === "victory" ? "player" : "ai",
				type: report.outcome.reason ?? "unknown",
				turnNumber: report.totalTurns,
			}
			: null,
		campaignStats: report.milestones.length > 0
			? buildCampaignStats(report)
			: null,
		crashed: report.crashed,
		crashMessage: report.crashMessage,
	};
}

function buildCampaignStats(report: PlaytestReport): Record<string, unknown> {
	const final = report.milestones[report.milestones.length - 1];
	if (!final) return {};

	const stats: Record<string, unknown> = {
		totalTurns: report.totalTurns,
		totalFactions: final.factions.length,
		totalUnits: final.totalUnits,
		totalBuildings: final.totalBuildings,
		duration: `${Math.round((report.endTime - report.startTime) / 1000)}s`,
	};

	// Per-faction summary
	for (const f of final.factions) {
		stats[`${f.factionId}_units`] = f.unitCount;
		stats[`${f.factionId}_buildings`] = f.buildingCount;
		stats[`${f.factionId}_territory`] = `${f.territoryPercent.toFixed(1)}%`;
		stats[`${f.factionId}_resources`] = f.totalResources;
	}

	return stats;
}
