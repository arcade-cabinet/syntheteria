/**
 * Layer 1 — height mesh visual test.
 *
 * Verifies that bilinear elevation interpolation produces visible 3D terrain:
 * - The central HIGH (2) cluster should appear elevated
 * - The NE RAISED (1) quadrant should be a mid-height plateau
 * - The SW PIT (−1) corner should be sunken
 * - Transitions between zones should be smooth (no hard geometry edges)
 *
 * Screenshots saved to tests/components/__snapshots__ for regression.
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { TerrainHeightPreview } from "./TerrainHeightPreview";

describe("Layer 1 — terrain height mesh", () => {
	test("renders height-displaced board with visible elevation variation", async () => {
		render(<TerrainHeightPreview />);

		await expect
			.element(document.querySelector("[data-testid='canvas-status']")!)
			.toContainText("Ready", { timeout: 15_000 });

		// Allow shaders to compile and first frame to settle
		await new Promise((r) => setTimeout(r, 500));

		await expect(page.screenshot()).toMatchSnapshot("terrain-height-layer.png");
	});
});
