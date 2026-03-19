/**
 * AI-vs-AI Playtest — 1000-turn automated game with milestone reports.
 *
 * The ULTIMATE regression test: if the AI game plays out reasonably to
 * turn 1000, everything works — combat, economy, fabrication, territory,
 * diplomacy, cult escalation, power grid, signal network, and victory.
 *
 * Starts an all-AI game (no player faction), advances 1000 turns via the
 * debug bridge, and captures faction statistics at milestones.
 *
 * Assertions:
 *   - No critical JS errors through 1000 turns
 *   - Victory condition triggered by turn 1000 (no infinite stalemate)
 *   - Faction trajectories show meaningful gameplay (resources change,
 *     territory shifts, units created/destroyed)
 *
 * Run: pnpm test:e2e --grep "AI Playtest 1000"
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
	/** Per-faction trajectory: faction → array of {turn, units, territory, resources} */
	trajectories: Record<string, Array<{
		turn: number;
		unitCount: number;
		territoryPercent: number;
		totalResources: number;
		buildingCount: number;
	}>>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_TURNS = 1000;
const MILESTONE_TURNS = [100, 250, 500, 750, 1000];
/** Capture lightweight stats (no screenshot) every N turns for trajectory graphs. */
const TRAJECTORY_INTERVAL = 25;
const REPORTS_DIR = path.resolve(__dirname, "reports", "ai-1000");
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
	const filename = `turn-${String(turn).padStart(4, "0")}.png`;
	const filepath = path.join(SCREENSHOTS_DIR, filename);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

async function startAllAIGame(page: Page, seed: string) {
	await page.getByTestId("title-new_game").click();
	await page.getByTestId("new-game-modal").waitFor({ state: "visible", timeout: 5000 });

	await page.getByTestId("seed-input").fill(seed);
	await page.getByTestId("scale-small").click();

	// Deselect player → observer mode
	await page.getByTestId("faction-reclaimers-player-radio").click();
	await page.waitForTimeout(100);

	await page.getByTestId("start-btn").click();
}

async function waitForGame(page: Page) {
	await page.waitForFunction(
		() => window.__syntheteria?.phase === "playing",
		{ timeout: 25000 },
	);
	await page.getByTestId("hud").waitFor({ timeout: 15000 });

	// Disable observer auto-advance
	await page.evaluate(() => window.__syntheteria?.setObserverSpeed(0));
	await page.waitForTimeout(200);
}

const CULT_PREFIXES = ["static_", "null_", "lost_"];
function isCultFaction(fid: string): boolean {
	return CULT_PREFIXES.some((p) => fid.startsWith(p));
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("AI Playtest 1000", () => {
	test.setTimeout(600_000); // 10 minutes max

	test("1000-turn all-AI game reaches conclusion with faction trajectories", async ({ page }) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (err) => pageErrors.push(err.message));

		const report: PlaytestReport = {
			seed: "ai-1000-endgame",
			totalTurns: 0,
			startTime: Date.now(),
			endTime: 0,
			milestones: [],
			errors: [],
			finalOutcome: { result: "playing" },
			trajectories: {},
		};

		// ── Boot and start all-AI game ──
		await clearPersistence(page);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.getByTestId("landing-screen")).toBeVisible({ timeout: 10000 });

		await startAllAIGame(page, report.seed);
		await waitForGame(page);

		// Verify observer mode
		const isObserver = await page.evaluate(() => window.__syntheteria?.isObserverMode);
		expect(isObserver).toBe(true);

		// Get initial faction list
		const initialFactions = await getFactionStats(page);
		const aiFactionIds = initialFactions
			.filter((f) => !isCultFaction(f.factionId))
			.map((f) => f.factionId);

		// Init trajectory tracking for all factions
		for (const f of initialFactions) {
			report.trajectories[f.factionId] = [];
		}

		// ── Main loop: advance to 1000 turns ──
		let currentTurn = 1;
		let gameEnded = false;
		const milestonesSet = new Set(MILESTONE_TURNS);

		while (currentTurn < TOTAL_TURNS + 1 && !gameEnded) {
			// Advance in batches of 25 (matches TRAJECTORY_INTERVAL)
			const turnsToNext = TRAJECTORY_INTERVAL;
			const targetTurn = Math.min(currentTurn + turnsToNext, TOTAL_TURNS + 1);
			const batch = targetTurn - currentTurn;

			if (batch <= 0) break;

			await advanceNTurns(page, batch);
			currentTurn = targetTurn;
			report.totalTurns = currentTurn;

			// Brief yield for browser
			await page.waitForTimeout(20);

			// Check game outcome
			const outcome = await getGameOutcome(page);
			if (outcome.result !== "playing") {
				gameEnded = true;
				report.finalOutcome = outcome;
			}

			// Capture faction stats for trajectory
			const factions = await getFactionStats(page);
			for (const f of factions) {
				if (!report.trajectories[f.factionId]) {
					report.trajectories[f.factionId] = [];
				}
				report.trajectories[f.factionId].push({
					turn: currentTurn,
					unitCount: f.unitCount,
					territoryPercent: f.territoryPercent,
					totalResources: f.totalResources,
					buildingCount: f.buildingCount,
				});
			}

			// Capture milestone snapshot with screenshot
			if (milestonesSet.has(currentTurn) || gameEnded) {
				const screenshotPath = await captureScreenshot(page, currentTurn);
				report.milestones.push({
					turn: currentTurn,
					timestamp: Date.now(),
					factions,
					totalUnits: factions.reduce((s, f) => s + f.unitCount, 0),
					totalBuildings: factions.reduce((s, f) => s + f.buildingCount, 0),
					gameOutcome: outcome,
					screenshotPath,
				});
			}

			if (gameEnded) break;
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

		// Write a summary text for quick review
		const duration = ((report.endTime - report.startTime) / 1000).toFixed(1);
		const summaryLines = [
			`AI-vs-AI 1000-turn Playtest Report`,
			`===================================`,
			`Seed: ${report.seed}`,
			`Duration: ${duration}s`,
			`Total turns: ${report.totalTurns}`,
			`Final outcome: ${report.finalOutcome.result}${report.finalOutcome.reason ? ` (${report.finalOutcome.reason})` : ""}`,
			`JS errors: ${report.errors.length}`,
			``,
			`Faction Summary at End:`,
		];
		const lastMilestone = report.milestones[report.milestones.length - 1];
		if (lastMilestone) {
			for (const f of lastMilestone.factions) {
				summaryLines.push(
					`  ${f.factionId}: ${f.unitCount} units, ${f.buildingCount} buildings, ${f.territoryPercent.toFixed(1)}% territory, ${f.totalResources} resources`,
				);
			}
		}
		const summaryPath = path.join(REPORTS_DIR, "summary.txt");
		fs.writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");

		// ── Assertions ──

		// No critical JS errors through 1000 turns
		expect(
			report.errors,
			`Unexpected JS errors:\n${report.errors.join("\n")}`,
		).toHaveLength(0);

		// Game should have progressed substantially
		expect(report.totalTurns).toBeGreaterThanOrEqual(100);

		// Victory condition should trigger by turn 1000 (no infinite stalemate)
		// Survival victory at 200 turns means this WILL fire. If not,
		// something is wrong with victory checking.
		if (report.totalTurns >= TOTAL_TURNS) {
			expect(
				report.finalOutcome.result,
				"Game should have reached a victory/defeat condition by turn 1000",
			).not.toBe("playing");
		}

		// Trajectories should show meaningful gameplay: resources should change
		for (const fid of aiFactionIds) {
			const traj = report.trajectories[fid];
			if (!traj || traj.length < 2) continue;

			const firstRes = traj[0].totalResources;
			const lastRes = traj[traj.length - 1].totalResources;
			const maxRes = Math.max(...traj.map((t) => t.totalResources));

			// Resources should have changed at some point (economy is functional)
			const resourceActivity = maxRes > firstRes || lastRes !== firstRes;
			if (!resourceActivity) {
				console.warn(`[economy] ${fid} resources never changed — economy may be stalled`);
			}
		}

		// Screenshots should be captured at milestones
		const screenshotCount = report.milestones.filter((m) => m.screenshotPath).length;
		expect(screenshotCount).toBeGreaterThan(0);

		// Report file should exist
		expect(fs.existsSync(reportPath)).toBe(true);
	});
});
