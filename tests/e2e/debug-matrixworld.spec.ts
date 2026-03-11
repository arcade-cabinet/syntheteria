/**
 * Debug test: captures full stack trace of the matrixWorld error.
 */
import { test, expect } from "@playwright/test";

test("capture matrixWorld error stack trace", async ({ page }) => {
	const stacks: string[] = [];
	page.on("pageerror", (err) => {
		if (err.message.includes("matrixWorld")) {
			stacks.push(err.stack ?? err.message);
		}
	});

	// Navigate to game
	await page.goto("/");
	await page.waitForTimeout(2000);
	const btn = page.getByRole("button", { name: /new colony mission|new game/i });
	await btn.click();
	await page.waitForTimeout(1000);
	const launch = page.getByRole("button", { name: /launch colony|start game/i });
	if (await launch.isVisible({ timeout: 3000 }).catch(() => false)) {
		await launch.click();
	}
	await page.waitForTimeout(5000);

	// Print all stack traces
	console.log(`\n${"=".repeat(80)}`);
	console.log(`CAPTURED ${stacks.length} matrixWorld ERRORS`);
	if (stacks.length > 0) {
		console.log(`\nFIRST ERROR STACK:`);
		console.log(stacks[0]);
		// Show unique stacks
		const unique = [...new Set(stacks)];
		console.log(`\nUNIQUE STACK PATTERNS: ${unique.length}`);
		for (const s of unique.slice(0, 3)) {
			console.log(`\n---\n${s}\n---`);
		}
	}
	console.log(`${"=".repeat(80)}\n`);

	expect(stacks.length).toBeGreaterThan(0); // we know this fails, just capturing
});
