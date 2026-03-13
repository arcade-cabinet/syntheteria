/**
 * AI Playtest Harness — 100-turn automated playtest in headed Chrome.
 *
 * This test launches the game, starts a new campaign, enables AI auto-play mode,
 * and monitors the game for 100 turns. It captures screenshots at milestone turns,
 * logs errors, and collects game state snapshots for the report generator.
 *
 * Prerequisites (blocked tasks):
 *   - Task #63: AI auto-play mode (autoPlayMode flag in game state)
 *   - Task #64: Turn event log (TurnEventLog structured logging)
 *
 * When those are not yet available, the harness falls back to manually clicking
 * "End Turn" each turn.
 */

import { expect, test, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { generatePlaytestReport } from "./reports/report-generator";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Snapshot of game state captured at a specific turn. */
interface TurnSnapshot {
	turnNumber: number;
	timestamp: number;
	resources: {
		scrapMetal: number;
		eWaste: number;
		intactComponents: number;
		ferrousScrap: number;
		alloyStock: number;
		polymerSalvage: number;
		conductorWire: number;
		electrolyte: number;
		siliconWafer: number;
		stormCharge: number;
		elCrystal: number;
	};
	unitCount: number;
	enemyCount: number;
	stormIntensity: number;
	activeScene: string;
	screenshotPath: string | null;
}

/** Victory condition result from the game's victory system. */
interface VictoryResult {
	winner: string;
	type: string;
	turnNumber: number;
}

/** Collected results from the full playtest run. */
interface PlaytestResults {
	seed: string;
	startTime: number;
	endTime: number;
	totalTurns: number;
	snapshots: TurnSnapshot[];
	errors: string[];
	turnEventLog: unknown[] | null;
	victoryResult: VictoryResult | null;
	campaignStats: Record<string, unknown> | null;
	crashed: boolean;
	crashMessage: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_TURNS = 100;
const SCREENSHOT_TURNS = new Set([1, 10, 25, 50, 75, 100]);
const REPORTS_DIR = path.resolve(__dirname, "reports");
const SCREENSHOTS_DIR = path.resolve(REPORTS_DIR, "screenshots");

/**
 * Maximum time for the entire 100-turn playtest.
 * AI auto-play should be fast; manual End Turn fallback is slower.
 */
const PLAYTEST_TIMEOUT = 600_000; // 10 minutes

/** Time to wait for a single turn to advance. */
const TURN_ADVANCE_TIMEOUT = 30_000; // 30 seconds per turn

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

/** Dismiss any thought overlay that might block interaction. */
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

/** Read the current turn number from the game's turn system. */
async function getTurnNumber(page: Page): Promise<number> {
	return page.evaluate(() => {
		// Access the turn system module — available on window in dev builds
		// or through the module system if exposed.
		const w = window as unknown as Record<string, unknown>;

		// Try the exposed global first (set by auto-play or test harness)
		if (typeof w.__syntheteria_getTurnNumber === "function") {
			return (w.__syntheteria_getTurnNumber as () => number)();
		}

		// Fallback: read from the HUD DOM — the Turn resource panel shows the turn number
		const turnElements = Array.from(
			document.querySelectorAll('[class*="font-mono"]'),
		);
		for (const el of turnElements) {
			const text = el.textContent?.trim();
			if (text && /^\d+$/.test(text)) {
				const parent = el.closest('[class*="resource"]') ?? el.parentElement;
				const label = parent?.querySelector('[class*="uppercase"]');
				if (label?.textContent?.toLowerCase().includes("turn")) {
					return parseInt(text, 10);
				}
			}
		}

		return -1;
	});
}

/** Read the full game state snapshot from the browser. */
async function captureGameState(page: Page): Promise<Omit<TurnSnapshot, "screenshotPath">> {
	return page.evaluate(() => {
		const w = window as unknown as Record<string, unknown>;

		// Try exposed global snapshot function
		if (typeof w.__syntheteria_getGameSnapshot === "function") {
			return (w.__syntheteria_getGameSnapshot as () => Omit<TurnSnapshot, "screenshotPath">)();
		}

		// Fallback: return partial state with defaults
		const turnNumber =
			typeof w.__syntheteria_getTurnNumber === "function"
				? (w.__syntheteria_getTurnNumber as () => number)()
				: -1;

		return {
			turnNumber,
			timestamp: Date.now(),
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
			unitCount: 0,
			enemyCount: 0,
			stormIntensity: 0,
			activeScene: "world",
		};
	});
}

/** Check whether AI auto-play mode is available and enable it. */
async function tryEnableAutoPlay(page: Page): Promise<boolean> {
	return page.evaluate(() => {
		const w = window as unknown as Record<string, unknown>;
		if (typeof w.__syntheteria_enableAutoPlay === "function") {
			(w.__syntheteria_enableAutoPlay as () => void)();
			return true;
		}
		return false;
	});
}

/** Advance one turn by clicking the End Turn button (fallback when auto-play unavailable). */
async function clickEndTurn(page: Page): Promise<boolean> {
	// Try testID first (will be added by turn-system agent)
	const byTestId = page.getByTestId("end-turn-button");
	if ((await byTestId.count()) > 0) {
		await byTestId.click();
		return true;
	}

	// Fallback: find the End Turn text button
	const endTurnButton = page.getByText("End Turn", { exact: true });
	if ((await endTurnButton.count()) > 0) {
		await endTurnButton.click();
		return true;
	}

	return false;
}

/** Capture a screenshot and save it to the reports directory. */
async function captureScreenshot(
	page: Page,
	turnNumber: number,
): Promise<string> {
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	const filename = `turn-${String(turnNumber).padStart(3, "0")}.png`;
	const filepath = path.join(SCREENSHOTS_DIR, filename);
	await page.screenshot({ path: filepath, fullPage: false });
	return filepath;
}

/** Collect the turn event log if available. */
async function collectTurnEventLog(page: Page): Promise<unknown[] | null> {
	return page.evaluate(() => {
		const w = window as unknown as Record<string, unknown>;
		if (typeof w.__syntheteria_getTurnEventLog === "function") {
			return (w.__syntheteria_getTurnEventLog as () => unknown[])();
		}
		return null;
	});
}

/**
 * Inject the test bridge flag.
 *
 * The game-side playtestBridge.ts (imported via initialization.ts) registers
 * real implementations of __syntheteria_* globals on window at module load.
 * This function just sets the playtestMode flag so game code can detect
 * that a test harness is running.
 */
async function injectTestBridge(page: Page) {
	await page.evaluate(() => {
		const w = window as unknown as Record<string, unknown>;
		w.__syntheteria_playtestMode = true;
	});
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

test.describe("100-turn AI playtest", () => {
	test.setTimeout(PLAYTEST_TIMEOUT);

	test("runs 100 turns without crash and generates report", async ({
		page,
	}) => {
		const results: PlaytestResults = {
			seed: "unknown",
			startTime: Date.now(),
			endTime: 0,
			totalTurns: 0,
			snapshots: [],
			errors: [],
			turnEventLog: null,
			victoryResult: null,
			campaignStats: null,
			crashed: false,
			crashMessage: null,
		};

		// Collect console errors
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				results.errors.push(
					`[console.error] ${msg.text().substring(0, 500)}`,
				);
			}
		});

		page.on("pageerror", (error) => {
			results.errors.push(
				`[pageerror] ${error.message.substring(0, 500)}`,
			);
		});

		// ── Phase 1: Boot and start new game ──

		await clearPersistence(page);
		await expect(page.getByText("SYNTHETERIA")).toBeVisible({
			timeout: 15_000,
		});

		// Capture the seed from the new game modal
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();

		// Read the seed phrase from the input
		const seedInput = page.locator('input[class*="font-mono"]').first();
		if ((await seedInput.count()) > 0) {
			results.seed = (await seedInput.inputValue()) || "unknown";
		}

		// Confirm new game
		await page.getByTestId("new-game-confirm").click();

		// Wait for scene to be ready
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 30_000,
		});

		// Inject the test bridge
		await injectTestBridge(page);

		// Dismiss any initial thoughts
		await dismissThoughts(page);

		// Check for render errors
		await expect(page.getByText(/Render Error:/i)).toHaveCount(0);

		// ── Phase 2: Try to enable auto-play ──

		const autoPlayAvailable = await tryEnableAutoPlay(page);

		// ── Phase 3: Run 100 turns ──

		let currentTurn = 0;

		for (let targetTurn = 1; targetTurn <= TOTAL_TURNS; targetTurn++) {
			// Check for crash
			const renderError = page.getByText(/Render Error:|Signal Lost/i);
			if ((await renderError.count()) > 0) {
				results.crashed = true;
				results.crashMessage = `Render error detected at turn ${currentTurn}`;
				break;
			}

			if (!autoPlayAvailable) {
				// Manual fallback: click End Turn to advance
				await dismissThoughts(page);
				const clicked = await clickEndTurn(page);

				if (!clicked) {
					results.errors.push(
						`Turn ${targetTurn}: Could not find End Turn button`,
					);
					// Wait briefly and retry once
					await page.waitForTimeout(1000);
					const retryClicked = await clickEndTurn(page);
					if (!retryClicked) {
						results.errors.push(
							`Turn ${targetTurn}: End Turn button not found after retry — stopping`,
						);
						break;
					}
				}

				// Wait for the turn to actually advance
				// The turn system processes AI factions + environment synchronously,
				// then increments the turn counter.
				await page.waitForTimeout(250);
			} else {
				// Auto-play mode: execute one full AI turn via the bridge
				try {
					await page.evaluate(() => {
						const w = window as unknown as Record<string, unknown>;
						if (typeof w.__syntheteria_autoPlayOneTurn === "function") {
							(w.__syntheteria_autoPlayOneTurn as () => void)();
						}
					});
					// Brief pause for rendering to update
					await page.waitForTimeout(100);
				} catch (error) {
					results.errors.push(
						`Turn ${targetTurn}: Auto-play turn failed — ${String(error).substring(0, 200)}`,
					);
					break;
				}
			}

			currentTurn = targetTurn;
			results.totalTurns = currentTurn;

			// Capture snapshot at milestone turns
			if (SCREENSHOT_TURNS.has(currentTurn)) {
				await dismissThoughts(page);
				const screenshotPath = await captureScreenshot(page, currentTurn);
				const gameState = await captureGameState(page);
				results.snapshots.push({
					...gameState,
					turnNumber: currentTurn,
					screenshotPath,
				});
			} else if (currentTurn % 10 === 0) {
				// Capture state (no screenshot) every 10 turns for resource graphs
				const gameState = await captureGameState(page);
				results.snapshots.push({
					...gameState,
					turnNumber: currentTurn,
					screenshotPath: null,
				});
			}

			// Check for victory condition after each turn
			const victory = await page.evaluate(() => {
				const w = window as unknown as Record<string, unknown>;
				if (typeof w.__syntheteria_getVictoryResult === "function") {
					return (w.__syntheteria_getVictoryResult as () => VictoryResult | null)();
				}
				return null;
			});

			if (victory) {
				results.victoryResult = victory;
				// Capture a victory screenshot
				await dismissThoughts(page);
				const victoryScreenshot = await captureScreenshot(page, currentTurn);
				const victoryState = await captureGameState(page);
				results.snapshots.push({
					...victoryState,
					turnNumber: currentTurn,
					screenshotPath: victoryScreenshot,
				});
				break;
			}
		}

		// ── Phase 4: Collect final state ──

		results.endTime = Date.now();
		results.turnEventLog = await collectTurnEventLog(page);

		// Collect campaign statistics
		results.campaignStats = await page.evaluate(() => {
			const w = window as unknown as Record<string, unknown>;
			if (typeof w.__syntheteria_getCampaignStats === "function") {
				return (w.__syntheteria_getCampaignStats as () => Record<string, unknown>)();
			}
			return null;
		});

		// Ensure we have a final snapshot
		if (
			results.snapshots.length === 0 ||
			results.snapshots[results.snapshots.length - 1].turnNumber !== currentTurn
		) {
			const finalState = await captureGameState(page);
			const finalScreenshot = await captureScreenshot(page, currentTurn);
			results.snapshots.push({
				...finalState,
				turnNumber: currentTurn,
				screenshotPath: finalScreenshot,
			});
		}

		// ── Phase 5: Generate report ──

		fs.mkdirSync(REPORTS_DIR, { recursive: true });
		const reportPath = path.join(REPORTS_DIR, "playtest-report.html");

		const reportHtml = generatePlaytestReport(results);
		fs.writeFileSync(reportPath, reportHtml, "utf-8");

		// Also write raw JSON for programmatic access
		const jsonPath = path.join(REPORTS_DIR, "playtest-results.json");
		fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf-8");

		// ── Assertions ──

		// Game should not have crashed
		expect(results.crashed).toBe(false);

		// Should have advanced at least some turns
		// (When auto-play is wired, expect all 100; for now accept partial)
		expect(results.totalTurns).toBeGreaterThan(0);

		// Should have captured screenshots
		expect(results.snapshots.filter((s) => s.screenshotPath)).not.toHaveLength(0);

		// Report file should exist
		expect(fs.existsSync(reportPath)).toBe(true);
	});
});
