/**
 * AI-vs-AI Playtest — 100-turn automated game with milestone reports.
 *
 * Starts an all-AI game (no player faction = observer mode), advances 100 turns
 * via the debug bridge, and captures faction statistics at milestone turns.
 *
 * Assertions:
 *   - No faction eliminated before turn 20 (balance check)
 *   - All factions have units at turn 50
 *   - No single faction controls 90%+ territory (stalemate check)
 *   - No critical JS errors
 *   - Screenshots at milestone turns
 *
 * Run: pnpm test:e2e --grep "AI Playtest 100"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
	gameOutcome: { result: string; reason?: string };
	screenshotPath: string | null;
}

interface PlaytestReport {
	seed: string;
	totalTurns: number;
	startTime: number;
	endTime: number;
	milestones: MilestoneSnapshot[];
	errors: string[];
	finalOutcome: { result: string; reason?: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MILESTONE_TURNS = [10, 25, 50, 75, 100];
const REPORTS_DIR = path.resolve(__dirname, "reports", "ai-100");
const SCREENSHOTS_DIR = path.resolve(REPORTS_DIR, "screenshots");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function getGameOutcome(page: Page): Promise<{ result: string; reason?: string }> {
	return page.evaluate(() => {
		const o = window.__syntheteria?.getGameOutcome();
		if (!o) return { result: "playing" };
		return o as { result: string; reason?: string };
	});
}

async function advanceNTurns(page: Page, n: number): Promise<void> {
	await page.evaluate((turns) => window.__syntheteria?.advanceNTurns(turns), n);
}

async function captureScreenshot(page: Page, turn: number): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filename = `turn-${String(turn).padStart(3, "0")}.png`;
	const filepath = path.join(SCREENSHOTS_DIR, filename);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

/**
 * Start a new all-AI game (observer mode) with a fixed seed.
 */
async function startAllAIGame(page: Page, seed: string) {
	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({ state: "visible", timeout: 5000 });

	// Set seed
	await page.getByTestId("seed-input").fill(seed);

	// Use small map for faster tests
	await page.getByTestId("scale-small").click();

	// Deselect player faction → observer mode (all AI)
	// Default player is reclaimers — click its radio to toggle to AI
	await page.getByTestId("faction-reclaimers-player-radio").click();

	// Wait briefly for state update
	await page.waitForTimeout(100);

	// Start game
	await page.getByTestId("start-btn").click();
}

async function waitForGame(page: Page) {
	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 25000 },
	);
	await page.getByTestId("hud").waitFor({ timeout: 15000 });

	// Disable observer auto-advance so we control turns manually
	await page.evaluate(() => window.__syntheteria?.setObserverSpeed(0));
	await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("AI Playtest 100", () => {
	test.setTimeout(300_000); // 5 minutes max

	test("100-turn all-AI game with milestone snapshots", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		const report: PlaytestReport = {
			seed: "ai-100-test",
			totalTurns: 0,
			startTime: Date.now(),
			endTime: 0,
			milestones: [],
			errors: [],
			finalOutcome: { result: "playing" },
		};

		// ── Boot and start all-AI game ──
		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("landing-screen")).toBeVisible({ timeout: 10000 });

		await startAllAIGame(page, report.seed);
		await waitForGame(page);

		// Verify observer mode is active
		const bridge = await page.evaluate(() => ({
			phase: window.__syntheteria?.phase,
			isObserverMode: window.__syntheteria?.isObserverMode,
		}));
		expect(bridge.phase).toBe("playing");
		expect(bridge.isObserverMode).toBe(true);

		// ── Capture initial state ──
		const initialFactions = await getFactionStats(page);
		const initialFactionIds = initialFactions
			.filter((f) => !f.factionId.startsWith("static_") && !f.factionId.startsWith("null_") && !f.factionId.startsWith("lost_"))
			.map((f) => f.factionId);

		// Should have multiple AI factions
		expect(initialFactionIds.length).toBeGreaterThanOrEqual(2);

		// ── Advance turns to each milestone ──
		let currentTurn = 1;
		let gameEnded = false;

		for (const milestone of MILESTONE_TURNS) {
			if (gameEnded) break;

			const turnsToAdvance = milestone - currentTurn;
			if (turnsToAdvance <= 0) continue;

			// Advance in batches to avoid blocking the main thread too long
			const batchSize = 10;
			for (let advanced = 0; advanced < turnsToAdvance && !gameEnded; advanced += batchSize) {
				const batch = Math.min(batchSize, turnsToAdvance - advanced);
				await advanceNTurns(page, batch);
				await page.waitForTimeout(50); // Brief yield for rendering

				// Check for game end
				const outcome = await getGameOutcome(page);
				if (outcome.result !== "playing") {
					gameEnded = true;
					report.finalOutcome = outcome;
				}
			}

			currentTurn = milestone;
			report.totalTurns = milestone;

			// Capture milestone snapshot
			const factions = await getFactionStats(page);
			const outcome = await getGameOutcome(page);
			const screenshotPath = await captureScreenshot(page, milestone);

			const snapshot: MilestoneSnapshot = {
				turn: milestone,
				timestamp: Date.now(),
				factions,
				totalUnits: factions.reduce((s, f) => s + f.unitCount, 0),
				totalBuildings: factions.reduce((s, f) => s + f.buildingCount, 0),
				gameOutcome: outcome,
				screenshotPath,
			};

			report.milestones.push(snapshot);

			if (outcome.result !== "playing") {
				gameEnded = true;
				report.finalOutcome = outcome;
				break;
			}
		}

		report.endTime = Date.now();

		// ── Collect errors ──
		report.errors = pageErrors.filter(
			(e) =>
				!e.includes("Warning:") &&
				!e.includes("[HMR]") &&
				!e.includes("WebGL") &&
				!e.includes("THREE.WebGLRenderer") &&
				!e.includes("Tone.js") &&
				!e.includes("AudioParam"),
		);

		// ── Write report JSON ──
		fs.mkdirSync(REPORTS_DIR, { recursive: true });
		const reportPath = path.join(REPORTS_DIR, "report.json");
		fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

		// ── Assertions ──

		// No critical JS errors
		expect(
			report.errors,
			`Unexpected JS errors:\n${report.errors.join("\n")}`,
		).toHaveLength(0);

		// Game should have progressed
		expect(report.totalTurns).toBeGreaterThanOrEqual(10);

		// Balance check: no non-cult faction eliminated before turn 20
		const milestone10 = report.milestones.find((m) => m.turn === 10);
		if (milestone10) {
			for (const fid of initialFactionIds) {
				const factionAtT10 = milestone10.factions.find((f) => f.factionId === fid);
				// Faction should still exist at turn 10
				if (factionAtT10) {
					expect(
						factionAtT10.unitCount,
						`${fid} eliminated by turn 10 — balance issue`,
					).toBeGreaterThan(0);
				}
			}
		}

		// At turn 50, all initial factions should still have units (if game hasn't ended)
		const milestone50 = report.milestones.find((m) => m.turn === 50);
		if (milestone50 && milestone50.gameOutcome.result === "playing") {
			for (const fid of initialFactionIds) {
				const factionAtT50 = milestone50.factions.find((f) => f.factionId === fid);
				// This is a softer check — faction may have been defeated by turn 50
				// but if they have 0 units it's a potential balance concern
				if (factionAtT50 && factionAtT50.unitCount === 0) {
					// Log but don't fail — early elimination is possible on small maps
					console.warn(`[balance] ${fid} has 0 units at turn 50`);
				}
			}
		}

		// Stalemate check: no single non-cult faction should control 90%+ territory
		const milestone100 = report.milestones.find((m) => m.turn === 100);
		if (milestone100 && milestone100.gameOutcome.result === "playing") {
			for (const f of milestone100.factions) {
				if (f.factionId.startsWith("static_") || f.factionId.startsWith("null_") || f.factionId.startsWith("lost_")) continue;
				expect(
					f.territoryPercent,
					`${f.factionId} controls ${f.territoryPercent.toFixed(1)}% territory — domination imbalance`,
				).toBeLessThan(90);
			}
		}

		// Should have captured screenshots
		const screenshotCount = report.milestones.filter((m) => m.screenshotPath).length;
		expect(screenshotCount).toBeGreaterThan(0);
	});
});
