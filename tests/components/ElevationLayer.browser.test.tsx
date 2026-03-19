/**
 * ElevationLayer.browser.test.tsx — Vitest browser tests for Layer 3.
 *
 * Layer 3 is NOT YET IMPLEMENTED. Tests run against placeholder wireframes.
 * They document the bridge/tunnel contracts and will be updated to assert
 * "Ready" once ElevationLayer is implemented.
 *
 * Run: pnpm test:ct
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { ElevationLayerPreview } from "./ElevationLayerPreview";

describe("elevation layer — Layer 3", () => {
	test("layer 1 floor is visible as the base for elevated structures", async () => {
		const screen = render(<ElevationLayerPreview />);

		// The status overlay's first div turns green when chunks arrive
		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");
	});

	test("bridge status and tunnel status overlays are present", async () => {
		const screen = render(<ElevationLayerPreview />);

		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect.element(screen.getByTestId("bridge-status")).toBeVisible();
		await expect.element(screen.getByTestId("tunnel-status")).toBeVisible();
	});

	test("requirements panel lists all bridge contracts", async () => {
		const screen = render(<ElevationLayerPreview />);

		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("requirements-panel"))
			.toBeVisible();

		// Bridge: elevation, ramp traversability, SDF pipeline
		await expect
			.element(screen.getByTestId("req-bridge-elevated"))
			.toContainText("Bridge deck at Y = 2.5 m");
		await expect
			.element(screen.getByTestId("req-bridge-traversable"))
			.toContainText("traversable from ground");
		await expect
			.element(screen.getByTestId("req-bridge-sdf"))
			.toContainText("SDF/marching-cubes pipeline");
	});

	test("requirements panel lists all tunnel contracts", async () => {
		const screen = render(<ElevationLayerPreview />);

		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		// Tunnel: SDF subtraction, clearance dimensions
		await expect
			.element(screen.getByTestId("req-tunnel-cut"))
			.toContainText("subtractBrick carves passage");
		await expect
			.element(screen.getByTestId("req-tunnel-traversable"))
			.toContainText("1.4 m wide × 1.8 m tall");
	});

	test("requirements panel shows level height spec [0.0, 2.5, 5.0] m", async () => {
		const screen = render(<ElevationLayerPreview />);

		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("req-level-heights"))
			.toContainText("[0.0, 2.5, 5.0] m");
	});

	test("visual baseline: floor with bridge and tunnel placeholders", async () => {
		const screen = render(<ElevationLayerPreview />);

		await expect
			.element(screen.getByTestId("elevation-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect(page.screenshot()).toMatchSnapshot(
			"elevation-layer-placeholder.png",
		);
	});
});
