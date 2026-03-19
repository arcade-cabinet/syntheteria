/**
 * AI Playtest Marathon — 1000-turn automated AI-vs-AI game.
 *
 * Longer-running variant with milestones at 100, 250, 500, 750, 1000 turns.
 * Validates that the game eventually reaches a victory condition or at minimum
 * remains stable without crashing.
 *
 * Generates a separate report in tests/e2e/reports/.
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

const TOTAL_TURNS = 1000;
const MILESTONE_TURNS = new Set([100, 250, 500, 750, 1000]);
const SNAPSHOT_INTERVAL = 50; // Capture stats every 50 turns
const REPORTS_DIR = path.resolve(__dirname, "reports");
const SCREENSHOTS_DIR = path.resolve(REPORTS_DIR, "screenshots");
const MARATHON_TIMEOUT = 1_800_000; // 30 minutes

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

async function advanceTurns(page: Page, n: number): Promise<void> {
	// Advance in batches to avoid blocking the page for too long
	await page.evaluate((turns) => window.__syntheteria?.advanceNTurns(turns), n);
}

async function readBridgePhase(page: Page): Promise<string> {
	return page.evaluate(() => window.__syntheteria?.phase ?? "unknown");
}

async function captureScreenshot(page: Page, turn: number): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filename = `marathon-turn-${String(turn).padStart(4, "0")}.png`;
	const filepath = path.join(SCREENSHOTS_DIR, filename);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

async function bootGame(page: Page, seed = "ai-marathon-1000") {
	await clearPersistence(page);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.getByTestId("landing-screen")).toBeVisible({ timeout: 10_000 });

	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({ state: "visible", timeout: 5_000 });
	await page.getByTestId("seed-input").fill(seed);
	await page.getByTestId("scale-small").click();

	// Try observer mode
	const observerToggle = page.getByTestId("observer-toggle");
	if (await observerToggle.isVisible().catch(() => false)) {
		await observerToggle.click();
	}

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
				throw new Error(`NaN in ${s.factionId} at turn ${turn}: ${JSON.stringify(s)}`);
			}
		}
	}
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe("AI-vs-AI 1000-turn marathon", () => {
	test.setTimeout(MARATHON_TIMEOUT);

	test("1000-turn marathon with milestone assessments", async ({ page }) => {
		const report: PlaytestReport = {
			seed: "ai-marathon-1000",
			startTime: Date.now(),
			endTime: 0,
			totalTurns: 0,
			milestones: [],
			errors: [],
			outcome: null,
			crashed: false,
			crashMessage: null,
		};

		// Collect errors (only critical ones)
		page.on("pageerror", (error) => {
			report.errors.push(`[pageerror T${report.totalTurns}] ${error.message.substring(0, 300)}`);
		});

		// ── Boot ──
		await bootGame(page);

		// ── Main loop: advance in batches ──
		const BATCH_SIZE = 10; // Advance 10 turns at a time for speed
		let currentTurn = 1;
		let gameEnded = false;

		for (let batch = 0; batch < Math.ceil(TOTAL_TURNS / BATCH_SIZE); batch++) {
			const turnsToAdvance = Math.min(BATCH_SIZE, TOTAL_TURNS - currentTurn + 1);
			if (turnsToAdvance <= 0) break;

			await advanceTurns(page, turnsToAdvance);
			currentTurn += turnsToAdvance;
			report.totalTurns = currentTurn;

			// Brief yield for renderer
			await page.waitForTimeout(20);

			// Check game phase
			const phase = await readBridgePhase(page);
			if (phase !== "playing") {
				report.crashed = true;
				report.crashMessage = `Phase "${phase}" at turn ${currentTurn}`;
				break;
			}

			// Check victory/defeat
			const outcome = await getGameOutcome(page);
			if (outcome && outcome.result !== "playing") {
				report.outcome = outcome;
				gameEnded = true;

				const stats = await getFactionStats(page);
				assertNoNaN(stats, currentTurn);
				const screenshot = await captureScreenshot(page, currentTurn);
				report.milestones.push({
					turn: currentTurn,
					timestamp: Date.now(),
					factions: stats,
					totalUnits: stats.reduce((sum, f) => sum + f.unitCount, 0),
					totalBuildings: stats.reduce((sum, f) => sum + f.buildingCount, 0),
					gamePhase: phase,
					screenshotPath: screenshot,
				});
				break;
			}

			// Capture milestones
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

				// ── Turn 100 assessment ──
				if (currentTurn === 100) {
					const activeFactions = stats.filter((f) => f.unitCount > 0);
					expect(activeFactions.length).toBeGreaterThanOrEqual(2);
				}

				// ── Turn 250 assessment ──
				if (currentTurn === 250) {
					// Territory should be distributed among multiple factions
					const withTerritory = stats.filter((f) => f.territoryPercent > 1);
					expect(withTerritory.length).toBeGreaterThanOrEqual(2);
				}

				// ── Turn 500 assessment ──
				if (currentTurn === 500) {
					const activeFactions = stats.filter((f) => f.unitCount > 0);
					// By turn 500, game should still have activity
					expect(activeFactions.length).toBeGreaterThanOrEqual(1);

					// Check for stalemate indicators: compare with turn 250
					const milestone250 = report.milestones.find((m) => m.turn === 250);
					if (milestone250) {
						// Something should have changed between 250 and 500
						const unitsNow = stats.reduce((sum, f) => sum + f.unitCount, 0);
						const unitsThen = milestone250.factions.reduce((sum, f) => sum + f.unitCount, 0);
						const buildingsNow = stats.reduce((sum, f) => sum + f.buildingCount, 0);
						const buildingsThen = milestone250.factions.reduce((sum, f) => sum + f.buildingCount, 0);

						// At least one of: unit count changed, building count changed, territory shifted
						const somethingChanged =
							unitsNow !== unitsThen ||
							buildingsNow !== buildingsThen;

						// Log for report but don't fail — stalemate is valid data
						if (!somethingChanged) {
							report.errors.push(`[stalemate] No change between T250 and T500`);
						}
					}
				}

				// ── Turn 750 assessment ──
				if (currentTurn === 750) {
					// Game should be progressing toward a conclusion
					const activeFactions = stats.filter((f) => f.unitCount > 0);
					expect(activeFactions.length).toBeGreaterThanOrEqual(1);
				}

				// ── Turn 1000 assessment ──
				if (currentTurn === 1000) {
					// Log final state — stalemate at 1000 is not a test failure but is noted
					if (!gameEnded) {
						report.errors.push(
							`[stalemate] Game did not end by turn 1000 — ${stats.length} factions remain`,
						);
					}
				}
			}
		}

		// ── Generate report ──
		report.endTime = Date.now();
		fs.mkdirSync(REPORTS_DIR, { recursive: true });

		const jsonPath = path.join(REPORTS_DIR, "ai-playtest-1000-results.json");
		fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

		// Generate HTML report
		const adaptedResults = adaptForReportGenerator(report);
		const reportHtml = generatePlaytestReport(adaptedResults);
		const htmlPath = path.join(REPORTS_DIR, "ai-playtest-1000-report.html");
		fs.writeFileSync(htmlPath, reportHtml, "utf-8");

		// ── Final assertions ──
		expect(report.crashed).toBe(false);
		expect(report.totalTurns).toBeGreaterThanOrEqual(100); // Should get at least 100 turns

		// Filter known noise from error list
		const criticalErrors = report.errors.filter(
			(e) =>
				!e.includes("[stalemate]") &&
				!e.includes("Warning:") &&
				!e.includes("[HMR]") &&
				!e.includes("WebGL") &&
				!e.includes("Tone.js") &&
				!e.includes("AudioParam"),
		);
		expect(
			criticalErrors,
			`Critical errors during marathon: ${criticalErrors.join("\n")}`,
		).toHaveLength(0);
	});
});

// ─── Adapter ────────────────────────────────────────────────────────────────

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
				scrapMetal: 0, eWaste: 0, intactComponents: 0,
				ferrousScrap: 0, alloyStock: 0, polymerSalvage: 0,
				conductorWire: 0, electrolyte: 0, siliconWafer: 0,
				stormCharge: 0, elCrystal: 0,
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
		gameEnded: report.outcome ? `${report.outcome.result} (${report.outcome.reason ?? "unknown"})` : "no",
	};

	for (const f of final.factions) {
		stats[`${f.factionId}_units`] = f.unitCount;
		stats[`${f.factionId}_buildings`] = f.buildingCount;
		stats[`${f.factionId}_territory`] = `${f.territoryPercent.toFixed(1)}%`;
		stats[`${f.factionId}_resources`] = f.totalResources;
	}

	return stats;
}
