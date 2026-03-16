import { expect, test } from "@playwright/experimental-ct-react";
import { WorldOverviewPreview } from "./WorldOverviewPreview";

test.describe("world overview rendering", () => {
	test("renders a full generated world with tiles and structures", async ({
		mount,
		page,
	}) => {
		const component = await mount(<WorldOverviewPreview />);

		// Wait for the R3F scene + assets to finish loading
		await expect(component.getByTestId("canvas-status")).toContainText(
			"Ready",
			{ timeout: 30000 },
		);

		// Verify the world info badge is present
		await expect(component).toContainText("World Overview");
		await expect(component).toContainText("Seed 42");

		// Take screenshot
		const screenshot = await component.screenshot();
		expect(screenshot.byteLength).toBeGreaterThan(0);

		// Save to screenshots directory
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const outputDir = path.resolve(__dirname, "../screenshots");
		await fs.mkdir(outputDir, { recursive: true });
		await fs.writeFile(
			path.join(outputDir, "world-overview.png"),
			screenshot,
		);

		// A full world image should be substantially larger than a blank canvas
		expect(screenshot.byteLength).toBeGreaterThan(2000);

		// Visual regression baseline
		await expect(component).toHaveScreenshot();
	});
});
