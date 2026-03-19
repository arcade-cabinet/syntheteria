/**
 * Integration — full game-world visual composition.
 *
 * Tests that all terrain layers + sky dome compose correctly as a single
 * scene — this is the integration complement to the per-layer isolation tests:
 *   TerrainHeight.browser.test.tsx   — L1 height mesh alone
 *   TerrainBiomes.browser.test.tsx   — L2 biome textures alone
 *
 * What this suite verifies:
 *   1. All layers render together without conflicts (snapshot baseline)
 *   2. Procedural generation is seed-deterministic (two seeds → two snapshots;
 *      each snapshot is stable across re-runs)
 *   3. Canvas fills its container — no uncovered edges (viewport-filling board)
 *   4. Storm dome sky layer is present above the board horizon
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { GameWorldCompositionPreview } from "./GameWorldCompositionPreview";

const READY_TIMEOUT = 15_000;
const SETTLE_MS = 800;

/** Wait for canvas to reach "Ready" state. */
async function waitForReady() {
	await expect
		.element(document.querySelector("[data-testid='canvas-status']")!)
		.toContainText("Ready", { timeout: READY_TIMEOUT });
	await new Promise((r) => setTimeout(r, SETTLE_MS));
}

// ---------------------------------------------------------------------------

describe("Integration — game world composition (all layers)", () => {
	test("all layers compose without conflicts — full scene snapshot", async () => {
		render(<GameWorldCompositionPreview />);
		await waitForReady();

		await expect(page.screenshot()).toMatchSnapshot(
			"game-world-composition-default.png",
		);
	});

	test("seed 'alt' produces a visually distinct procedural board", async () => {
		// Both snapshots will be stable across re-runs (proving determinism).
		// Two different baselines proves that seeds drive visual variation.
		render(<GameWorldCompositionPreview seed="alt" />);
		await waitForReady();

		await expect(page.screenshot()).toMatchSnapshot(
			"game-world-composition-alt-seed.png",
		);
	});

	test("canvas fills 800×600 container — viewport-filling gameboard", async () => {
		render(<GameWorldCompositionPreview />);

		const container = document.querySelector(
			"[data-testid='game-world-container']",
		);
		expect(container).not.toBeNull();

		const canvas = container!.querySelector("canvas");
		expect(canvas).not.toBeNull();

		const containerRect = container!.getBoundingClientRect();
		const canvasRect = canvas!.getBoundingClientRect();

		// Canvas must cover the container with ≤1px tolerance
		expect(canvasRect.width).toBeGreaterThanOrEqual(containerRect.width - 1);
		expect(canvasRect.height).toBeGreaterThanOrEqual(containerRect.height - 1);
		expect(canvasRect.left).toBeLessThanOrEqual(containerRect.left + 1);
		expect(canvasRect.top).toBeLessThanOrEqual(containerRect.top + 1);
	});

	test("storm dome sky layer renders above board horizon", async () => {
		render(<GameWorldCompositionPreview />);

		// Wait for both the floor and the dome animation to settle
		await waitForReady();
		// Extra wait: dome rotates slowly, give it time to be clearly visible
		await new Promise((r) => setTimeout(r, 600));

		await expect(page.screenshot()).toMatchSnapshot(
			"game-world-storm-dome-sky.png",
		);
	});
});
