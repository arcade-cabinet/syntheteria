/**
 * InfiniteGrid.browser.test.tsx — Vitest browser tests for Layer 1.
 *
 * Replaces InfiniteGrid.spec.tsx (Playwright CT). Uses @vitest/browser
 * + vitest-browser-react so the test runs inside the project's own Vite 6
 * pipeline — same aliases, same optimizeDeps, no bundler version conflict.
 *
 * These tests SHOULD PASS once InfiniteGridRenderer is generating chunks.
 *
 * Run: pnpm test:ct --reporter=verbose
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { InfiniteGridPreview } from "./InfiniteGridPreview";

describe("infinite grid — Layer 1", () => {
	test("default: grid generates chunks at world origin", async () => {
		const screen = render(<InfiniteGridPreview scenario="default" />);

		// Grid must flip from "Grid Loading" to "Grid Ready" once chunks arrive
		await expect
			.element(screen.getByTestId("grid-ready"))
			.toHaveText("Grid Ready");

		// Chunk count must be > 0
		const chunkEl = screen.getByTestId("chunk-count");
		await expect.element(chunkEl).toBeVisible();
		const chunkText = await chunkEl.element().textContent;
		const chunkCount = parseInt(chunkText?.replace(/\D/g, "") ?? "0", 10);
		expect(chunkCount).toBeGreaterThan(0);

		// Scenario label identifies the spawn view
		await expect
			.element(screen.getByTestId("scenario-label"))
			.toContainText("Layer 1: Infinite Grid");
		await expect
			.element(screen.getByTestId("scenario-label"))
			.toContainText("Spawn view");

		// Visual baseline
		await expect(page.screenshot()).toMatchSnapshot(
			"infinite-grid-default.png",
		);
	});

	test("panned: grid generates new chunks 120 m east of origin", async () => {
		const screen = render(<InfiniteGridPreview scenario="panned" />);

		// Chunks must load at a non-origin camera position — proves the system
		// isn't hard-coded to world centre
		await expect
			.element(screen.getByTestId("grid-ready"))
			.toHaveText("Grid Ready");

		const chunkText = await screen.getByTestId("chunk-count").element()
			.textContent;
		expect(parseInt(chunkText?.replace(/\D/g, "") ?? "0", 10)).toBeGreaterThan(
			0,
		);

		await expect
			.element(screen.getByTestId("scenario-label"))
			.toContainText("Panned east 120 m");

		await expect(page.screenshot()).toMatchSnapshot("infinite-grid-panned.png");
	});

	test("harvested: chunks load with a visible gap at tile (0,0)", async () => {
		const screen = render(<InfiniteGridPreview scenario="harvested" />);

		// A harvested delta must not prevent chunk generation
		await expect
			.element(screen.getByTestId("grid-ready"))
			.toHaveText("Grid Ready");

		const chunkText = await screen.getByTestId("chunk-count").element()
			.textContent;
		expect(parseInt(chunkText?.replace(/\D/g, "") ?? "0", 10)).toBeGreaterThan(
			0,
		);

		await expect
			.element(screen.getByTestId("scenario-label"))
			.toContainText("Harvested tile");

		// Visual baseline — pit (gap) should be visible at world origin
		await expect(page.screenshot()).toMatchSnapshot(
			"infinite-grid-harvested.png",
		);
	});
});
