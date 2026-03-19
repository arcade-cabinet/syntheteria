/**
 * StarterRobots.browser.test.tsx — Vitest browser tests for Layer 4.
 *
 * Layer 4 is NOT YET IMPLEMENTED. Tests run against placeholder
 * cylinder+sphere robots. They document the spawn contract and will be
 * updated once the real robot spawner is wired to the tile-world.
 *
 * Run: pnpm test:ct
 */

import { page } from "@vitest/browser/context";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { StarterRobotsPreview } from "./StarterRobotsPreview";

describe("starter robots — Layer 4", () => {
	test("layer 1 floor is visible as the base robots stand on", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");
	});

	test("robot layer status overlay is present", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect.element(screen.getByTestId("robots-status")).toBeVisible();
		await expect
			.element(screen.getByTestId("robots-status"))
			.toContainText("Layer 4 Robots:");
	});

	test("exactly 5 robots are shown", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		// Overlay must report 5 robots whether placeholder or real
		await expect
			.element(screen.getByTestId("robots-status"))
			.toContainText("5 shown");
	});

	test("all five Mark I robot IDs are listed", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		const statusEl = screen.getByTestId("robots-layer-status");
		await expect.element(statusEl).toContainText("MKIA-001");
		await expect.element(statusEl).toContainText("MKIB-002");
		await expect.element(statusEl).toContainText("MKIC-003");
		await expect.element(statusEl).toContainText("MKID-004");
		await expect.element(statusEl).toContainText("MKIE-005");
	});

	test("requirements panel lists all Layer 4 spawn contracts", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect
			.element(screen.getByTestId("requirements-panel"))
			.toBeVisible();

		await expect
			.element(screen.getByTestId("req-count"))
			.toContainText("Exactly 5 Mark I robots");
		await expect
			.element(screen.getByTestId("req-passable"))
			.toContainText("distinct passable tile");
		await expect
			.element(screen.getByTestId("req-above-floor"))
			.toContainText("Robots visible above floor surface");
		await expect
			.element(screen.getByTestId("req-no-resource-collision"))
			.toContainText("No robot spawns on a resource tile");
		await expect
			.element(screen.getByTestId("req-no-pit"))
			.toContainText("No robot spawns in a harvested pit");
		await expect
			.element(screen.getByTestId("req-ids"))
			.toContainText("MKIA-001");
		await expect
			.element(screen.getByTestId("req-ids"))
			.toContainText("MKIE-005");
	});

	test("visual baseline: floor with 5 placeholder robots at spawn tiles", async () => {
		const screen = render(<StarterRobotsPreview />);

		await expect
			.element(screen.getByTestId("robots-layer-status"))
			.toContainText("Layer 1 Grid: Ready");

		await expect(page.screenshot()).toMatchSnapshot(
			"starter-robots-placeholder.png",
		);
	});
});
