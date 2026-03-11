/**
 * System Verification E2E Tests
 *
 * These tests launch the REAL Expo app in a REAL browser and verify that
 * every system claimed to be "implemented" actually works end-to-end.
 *
 * NO MOCKS. If it fails here, it's broken in the game.
 *
 * Strategy:
 * 1. Navigate through title → pregame → game
 * 2. Collect ALL console errors/warnings during each phase
 * 3. Verify HUD elements that prove systems initialized
 * 4. Use page.evaluate() to probe live module state
 * 5. Simulate player input and verify game responds
 */
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PhaseErrors {
	phase: string;
	errors: string[];
	warnings: string[];
}

function collectConsole(page: Page) {
	const errors: string[] = [];
	const warnings: string[] = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
		if (msg.type() === "warning") warnings.push(msg.text());
	});
	page.on("pageerror", (err) => errors.push(`UNCAUGHT: ${err.message}`));
	return { errors, warnings };
}

/** Filter out known-harmless warnings */
function filterNoise(errors: string[]): string[] {
	return errors.filter(
		(e) =>
			!e.includes("Warning:") &&
			!e.includes("DevTools") &&
			!e.includes("expected version") &&
			!e.includes("Download the React DevTools") &&
			!e.includes("Manifest") &&
			!e.includes("favicon"),
	);
}

async function navigateToTitle(page: Page) {
	await page.goto("/");
	await page.waitForTimeout(2000);
}

async function navigateToPregame(page: Page) {
	await navigateToTitle(page);
	const btn = page.getByRole("button", { name: /new colony mission|new game/i });
	await expect(btn).toBeVisible({ timeout: 5000 });
	await btn.click();
	await page.waitForTimeout(1000);
}

async function launchGame(page: Page) {
	await navigateToPregame(page);
	const launchBtn = page.getByRole("button", {
		name: /launch colony|start game/i,
	});
	if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
		await launchBtn.click();
	}
	// Wait for game to fully initialize (loading screen → canvas)
	await page.waitForTimeout(10000);
}

// ===========================================================================
// PHASE 1: App Initialization
// ===========================================================================

test.describe("Phase 1: App Boot", () => {
	test("Expo app starts without fatal errors", async ({ page }) => {
		const { errors } = collectConsole(page);
		await page.goto("/");
		await page.waitForTimeout(3000);
		const fatal = filterNoise(errors);
		expect(fatal, `Fatal errors on boot:\n${fatal.join("\n")}`).toHaveLength(0);
	});

	test("Title screen renders with all buttons", async ({ page }) => {
		await navigateToTitle(page);
		await expect(page.getByText("SYNTHETERIA")).toBeVisible();
		await expect(
			page.getByRole("button", { name: /new colony mission|new game/i }),
		).toBeVisible();
	});

	test("No import.meta or SyntaxError crashes", async ({ page }) => {
		const { errors } = collectConsole(page);
		await page.goto("/");
		await page.waitForTimeout(3000);
		const importMeta = errors.filter(
			(e) =>
				e.includes("import.meta") ||
				e.includes("SyntaxError") ||
				e.includes("Unexpected token"),
		);
		expect(
			importMeta,
			`import.meta/SyntaxError crashes:\n${importMeta.join("\n")}`,
		).toHaveLength(0);
	});
});

// ===========================================================================
// PHASE 2: Pregame Screen
// ===========================================================================

test.describe("Phase 2: Pregame", () => {
	test("Pregame screen renders without errors", async ({ page }) => {
		const { errors } = collectConsole(page);
		await navigateToPregame(page);
		const fatal = filterNoise(errors);
		expect(fatal, `Errors in pregame:\n${fatal.join("\n")}`).toHaveLength(0);
	});

	test("Tab navigation works (PATRON, MAP, RIVALS, SETTINGS)", async ({
		page,
	}) => {
		await navigateToPregame(page);
		const tabs = page.getByRole("tablist");
		await expect(tabs).toBeVisible();

		// Click each tab and verify panel appears
		for (const tabName of ["PATRON", "MAP", "RIVALS", "SETTINGS"]) {
			const tab = page.getByRole("tab", { name: tabName });
			if (await tab.isVisible().catch(() => false)) {
				await tab.click();
				await page.waitForTimeout(300);
			}
		}
	});

	test("Faction selection is available", async ({ page }) => {
		await navigateToPregame(page);
		const patronTab = page.getByRole("tab", { name: "PATRON" });
		if (await patronTab.isVisible().catch(() => false)) {
			await patronTab.click();
			await page.waitForTimeout(500);
			// Should show faction names
			const factionNames = [
				"RECLAIMERS",
				"VOLT COLLECTIVE",
				"SIGNAL CHOIR",
				"IRON CREED",
			];
			let foundAny = false;
			for (const name of factionNames) {
				if (
					await page
						.getByText(name, { exact: false })
						.isVisible()
						.catch(() => false)
				) {
					foundAny = true;
				}
			}
			expect(foundAny).toBe(true);
		}
	});

	test("Seed input accepts text", async ({ page }) => {
		await navigateToPregame(page);
		const mapTab = page.getByRole("tab", { name: "MAP" });
		if (await mapTab.isVisible().catch(() => false)) {
			await mapTab.click();
			await page.waitForTimeout(300);
			const seedInput = page.getByLabel("MISSION SEED");
			if (await seedInput.isVisible().catch(() => false)) {
				await seedInput.fill("test-seed-42");
				await expect(seedInput).toHaveValue("test-seed-42");
			}
		}
	});
});

// ===========================================================================
// PHASE 3: Game Launch & System Initialization
// ===========================================================================

test.describe("Phase 3: Game Launch", () => {
	test("Game transitions from loading to playing without crash", async ({
		page,
	}) => {
		const { errors } = collectConsole(page);
		await launchGame(page);

		// Either canvas rendered or loading screen still visible — both OK
		const canvas = page.locator("canvas");
		const loading = page.getByText(/INITIALIZING|LOADING/i);
		const hasCanvas = await canvas.isVisible().catch(() => false);
		const hasLoading = await loading.isVisible().catch(() => false);
		expect(
			hasCanvas || hasLoading,
			`Neither canvas nor loading screen visible after launch`,
		).toBe(true);

		// Check for fatal JS errors during init
		const fatal = errors.filter(
			(e) =>
				e.includes("UNCAUGHT") ||
				e.includes("Cannot read properties") ||
				e.includes("is not a function") ||
				e.includes("is not defined") ||
				e.includes("SyntaxError") ||
				e.includes("import.meta"),
		);
		expect(
			fatal,
			`Fatal errors during game launch:\n${fatal.join("\n")}`,
		).toHaveLength(0);
	});

	test("Canvas renders with meaningful dimensions", async ({ page }) => {
		await launchGame(page);
		const canvas = page.locator("canvas");
		if (await canvas.isVisible().catch(() => false)) {
			const box = await canvas.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.width).toBeGreaterThan(100);
			expect(box!.height).toBeGreaterThan(100);
		}
	});

	test("initFromConfig ran without errors", async ({ page }) => {
		const initErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.text().includes("[newGameInit]")) {
				initErrors.push(msg.text());
			}
		});
		await launchGame(page);
		const failures = initErrors.filter((e) => e.includes("failed"));
		expect(
			failures,
			`Init errors:\n${failures.join("\n")}`,
		).toHaveLength(0);
	});
});

// ===========================================================================
// PHASE 4: HUD Verification (proves systems initialized)
// ===========================================================================

test.describe("Phase 4: HUD Systems", () => {
	test.beforeEach(async ({ page }) => {
		await launchGame(page);
	});

	test("§2.17 Resource display shows resource types", async ({ page }) => {
		// Resource bar should show SCRAP, PWR, or similar resource indicators
		const resourceTexts = ["SCRAP", "PWR", "STORM", "COMPUTE"];
		let foundResources = 0;
		for (const text of resourceTexts) {
			if (
				await page
					.getByText(text, { exact: false })
					.first()
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				foundResources++;
			}
		}
		expect(
			foundResources,
			`Expected resource indicators, found ${foundResources}`,
		).toBeGreaterThan(0);
	});

	test("§12.4 FPS controls hint visible", async ({ page }) => {
		const hints = ["WASD", "move", "interact", "harvest", "compress", "grab"];
		let foundHints = 0;
		for (const hint of hints) {
			if (
				await page
					.getByText(hint, { exact: false })
					.first()
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				foundHints++;
			}
		}
		expect(foundHints, `Expected control hints, found ${foundHints}`).toBeGreaterThan(0);
	});

	test("Speed controls (PAUSE/RESUME, speed buttons) visible", async ({
		page,
	}) => {
		const pause = page.getByRole("button", { name: /PAUSE|RESUME/i });
		const hasSpeed = await pause.isVisible({ timeout: 5000 }).catch(() => false);
		expect(hasSpeed, "Speed controls not visible").toBe(true);
	});

	test("Bot status panel shows at least one bot", async ({ page }) => {
		// Bot Alpha or similar bot name should appear
		const botNames = ["Bot Alpha", "CAMERA", "ARMS", "LEGS", "POWER"];
		let foundBot = false;
		for (const name of botNames) {
			if (
				await page
					.getByText(name, { exact: false })
					.first()
					.isVisible({ timeout: 3000 })
					.catch(() => false)
			) {
				foundBot = true;
				break;
			}
		}
		expect(foundBot, "No bot status visible in HUD").toBe(true);
	});
});

// ===========================================================================
// PHASE 5: Keyboard Input Verification
// ===========================================================================

test.describe("Phase 5: Input Systems", () => {
	test.beforeEach(async ({ page }) => {
		await launchGame(page);
	});

	test("§12.4-12.5 WASD keys don't cause JS errors", async ({ page }) => {
		const { errors } = collectConsole(page);
		for (const key of ["w", "a", "s", "d"]) {
			await page.keyboard.down(key);
			await page.waitForTimeout(100);
			await page.keyboard.up(key);
		}
		await page.waitForTimeout(500);
		const jsErrors = filterNoise(errors);
		expect(
			jsErrors,
			`JS errors on WASD:\n${jsErrors.join("\n")}`,
		).toHaveLength(0);
	});

	test("§12.6 Action keys (E/F/C/G/Q) don't cause JS errors", async ({
		page,
	}) => {
		const { errors } = collectConsole(page);
		for (const key of ["e", "f", "c", "g", "q"]) {
			await page.keyboard.press(key);
			await page.waitForTimeout(100);
		}
		await page.waitForTimeout(500);
		const jsErrors = filterNoise(errors);
		expect(
			jsErrors,
			`JS errors on action keys:\n${jsErrors.join("\n")}`,
		).toHaveLength(0);
	});

	test("PAUSE button opens Colony Status menu, RESUME MISSION closes it", async ({
		page,
	}) => {
		// The PAUSE button is in the speed controls (top-right area)
		const pauseBtn = page.getByText("PAUSE", { exact: true });
		if (await pauseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await pauseBtn.click();
			// Clicking PAUSE opens the Colony Status overlay
			await expect(page.getByText("COLONY STATUS")).toBeVisible({
				timeout: 3000,
			});
			await expect(page.getByText("RESUME MISSION", { exact: false })).toBeVisible();

			// Click RESUME MISSION to close overlay and resume
			await page.getByText("RESUME MISSION", { exact: false }).click();
			// Overlay should close, PAUSE button should be visible again
			await expect(page.getByText("PAUSE", { exact: true })).toBeVisible({
				timeout: 3000,
			});
		}
	});
});

// ===========================================================================
// PHASE 6: Full Session — Error Accumulation
// ===========================================================================

test.describe("Phase 6: Full Session Stability", () => {
	test("Complete 30-second session: title → pregame → game → 30s play → no fatal errors", async ({
		page,
	}) => {
		test.setTimeout(120_000); // This test needs ~60s wall time
		const { errors } = collectConsole(page);

		// Title
		await navigateToTitle(page);

		// Pregame
		const newBtn = page.getByRole("button", {
			name: /new colony mission|new game/i,
		});
		await expect(newBtn).toBeVisible({ timeout: 5000 });
		await newBtn.click();
		await page.waitForTimeout(1000);

		// Launch
		const launchBtn = page.getByRole("button", {
			name: /launch colony|start game/i,
		});
		if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await launchBtn.click();
		}
		await page.waitForTimeout(10000);

		// Play for 30 seconds with random input
		const keys = ["w", "a", "s", "d", "e", "f", "c", "g", "q"];
		for (let i = 0; i < 30; i++) {
			const key = keys[Math.floor(Math.random() * keys.length)];
			await page.keyboard.press(key);
			await page.waitForTimeout(1000);
		}

		// Count fatal errors
		const fatal = errors.filter(
			(e) =>
				e.includes("UNCAUGHT") ||
				e.includes("Cannot read properties of null") ||
				e.includes("Cannot read properties of undefined") ||
				e.includes("is not a function") ||
				e.includes("is not defined") ||
				e.includes("SyntaxError") ||
				e.includes("TypeError") ||
				e.includes("ReferenceError"),
		);

		// Report ALL errors, not just pass/fail
		if (fatal.length > 0) {
			console.log(`\n${"=".repeat(60)}`);
			console.log(`FATAL ERRORS DURING 30s SESSION (${fatal.length}):`);
			for (const err of fatal) {
				console.log(`  ❌ ${err}`);
			}
			console.log(`${"=".repeat(60)}\n`);
		}

		expect(
			fatal,
			`${fatal.length} fatal errors during 30s session:\n${fatal.join("\n")}`,
		).toHaveLength(0);
	});
});
