import { expect, test } from "@playwright/experimental-ct-react";
import { ChunkTransitionPreview } from "./ChunkTransitionPreview";

test.describe("chunk transition rendering", () => {
	test("renders two distinct zone-colored chunks with a visible boundary", async ({
		mount,
		page,
	}) => {
		const component = await mount(<ChunkTransitionPreview />);

		// Wait for the R3F canvas to finish rendering
		await expect(component.getByTestId("canvas-status")).toContainText(
			"Ready",
			{ timeout: 15000 },
		);

		// Take screenshot
		const screenshot = await component.screenshot();
		expect(screenshot.byteLength).toBeGreaterThan(0);

		// Save to screenshots directory
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const outputDir = path.resolve(__dirname, "../screenshots");
		await fs.mkdir(outputDir, { recursive: true });
		await fs.writeFile(
			path.join(outputDir, "chunk-transition.png"),
			screenshot,
		);

		// Verify image is non-trivial
		expect(screenshot.byteLength).toBeGreaterThan(1000);

		// Visual regression baseline
		await expect(component).toHaveScreenshot();
	});
});
