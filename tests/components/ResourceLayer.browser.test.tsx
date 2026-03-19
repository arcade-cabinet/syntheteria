/**
 * ResourceLayer.browser.test.tsx — Vitest browser tests for Layer 2.
 *
 * Layer 2 is NOT YET IMPLEMENTED. These tests run against the placeholder
 * preview and establish the DOM contract that the real ResourceLayer must
 * satisfy. The visual snapshot captures what the layer will look like.
 *
 * Run: pnpm test:ct
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { ResourceLayerPreview } from "./ResourceLayerPreview";

describe("resource layer — Layer 2", () => {
	test("layer 1 floor is visible underneath the resource layer", async () => {
		const screen = render(<ResourceLayerPreview />);

		await expect
			.element(screen.getByTestId("layer1-status"))
			.toContainText("Layer 1 Grid: Ready");
	});

	test("resource layer status overlay is present", async () => {
		const screen = render(<ResourceLayerPreview />);

		await expect
			.element(screen.getByTestId("layer1-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("layer2-status"))
			.toBeVisible();
		await expect
			.element(screen.getByTestId("resource-layer-status"))
			.toBeVisible();
	});

	test("requirements panel lists all Layer 2 contracts", async () => {
		const screen = render(<ResourceLayerPreview />);

		await expect
			.element(screen.getByTestId("layer1-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("requirements-panel"))
			.toBeVisible();

		await expect
			.element(screen.getByTestId("req-one-tile-per-model"))
			.toContainText("One model per 2×2 m tile");
		await expect
			.element(screen.getByTestId("req-impassable"))
			.toContainText("Occupied tiles are impassable");
		await expect
			.element(screen.getByTestId("req-families"))
			.toContainText("Resources cluster by family");
		await expect
			.element(screen.getByTestId("req-deterministic"))
			.toContainText("Placement deterministic");
		await expect
			.element(screen.getByTestId("req-ground-depth"))
			.toContainText("ground depth");
	});

	test("11 placeholder resources defined across 4 families", async () => {
		const screen = render(<ResourceLayerPreview />);

		await expect
			.element(screen.getByTestId("layer1-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("resource-layer-status"))
			.toContainText("11 resource objects defined");
	});

	test("visual baseline: floor with resource placeholders", async () => {
		const screen = render(<ResourceLayerPreview />);

		await expect
			.element(screen.getByTestId("layer1-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect(page.screenshot()).toMatchSnapshot(
			"resource-layer-placeholder.png",
		);
	});
});
