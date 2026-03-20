/**
 * Layer 2 — biome texture blending visual test.
 *
 * Verifies the smoothstepped biome transitions:
 * - Metal plate regions (dark, bolt-corner details)
 * - Concrete panel regions (lighter grey, seam lines)
 * - Gravel/debris regions (granular texture)
 * - Smooth blend zones — no hard colour edges between biomes
 *
 * All tiles elevation=0 so this is a pure Layer 2 isolation test.
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { TerrainBiomesPreview } from "./TerrainBiomesPreview";

describe("Layer 2 — biome texture blending", () => {
	test("renders smoothly-blended biome zones across a flat board", async () => {
		render(<TerrainBiomesPreview />);

		await expect
			.element(document.querySelector("[data-testid='canvas-status']")!)
			.toContainText("Ready", { timeout: 15_000 });

		await new Promise((r) => setTimeout(r, 500));

		await expect(page.screenshot()).toMatchSnapshot("terrain-biomes-layer.png");
	});
});
