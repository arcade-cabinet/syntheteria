/**
 * E2E tests for the Syntheteria title screen.
 *
 * Tests what the title screen SHOULD look like and how it SHOULD behave.
 * Buttons use aria-labels for accessibility — tests match on those.
 */
import { test, expect } from "@playwright/test";

test.describe("Title screen", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for fade-in animation (menu appears after 1400ms)
		await page.waitForTimeout(2000);
	});

	test("renders the game title", async ({ page }) => {
		await expect(page.getByText("SYNTHETERIA")).toBeVisible();
	});

	test("renders the subtitle", async ({ page }) => {
		await expect(
			page.getByText(/MACHINE PLANET|COLONY OUTPOST/),
		).toBeVisible();
	});

	test("shows NEW GAME as the primary enabled button", async ({ page }) => {
		const newGame = page.getByRole("button", {
			name: /new colony mission/i,
		});
		await expect(newGame).toBeVisible();
		await expect(newGame).toBeEnabled();
		await expect(newGame).toContainText("NEW GAME");
	});

	test("CONTINUE is disabled when no saves exist", async ({ page }) => {
		const btn = page.getByRole("button", { name: /continue|no saved/i });
		await expect(btn).toBeVisible();
		await expect(btn).toBeDisabled();
	});

	test("SETTINGS is disabled", async ({ page }) => {
		const btn = page.getByRole("button", { name: /settings/i });
		await expect(btn).toBeVisible();
		await expect(btn).toBeDisabled();
	});

	test("displays version string", async ({ page }) => {
		await expect(page.getByText(/v\d+\.\d+\.\d+/)).toBeVisible();
	});

	test("seed input moved to pregame (not on title)", async ({ page }) => {
		// Seed input was moved from title to pregame screen
		const input = page.getByLabel(/seed phrase/i);
		await expect(input).not.toBeVisible();
	});

	test("clicking NEW GAME navigates to pregame", async ({ page }) => {
		const newGame = page.getByRole("button", {
			name: /new colony mission/i,
		});
		await newGame.click();
		// Title should disappear
		await expect(page.getByText("SYNTHETERIA")).not.toBeVisible({
			timeout: 3000,
		});
	});

	test("no critical runtime errors on load", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));
		await page.waitForTimeout(3000);

		const critical = errors.filter(
			(e) =>
				e.includes("is not defined") ||
				e.includes("is not a function") ||
				e.includes("Cannot read properties") ||
				e.includes("SyntaxError"),
		);
		expect(critical).toHaveLength(0);
	});
});
