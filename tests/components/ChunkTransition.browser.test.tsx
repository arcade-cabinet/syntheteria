import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { ChunkTransitionPreview } from "./ChunkTransitionPreview";

describe("chunk transition rendering", () => {
	test("renders two distinct zone-colored chunks with a visible boundary", async () => {
		const screen = render(<ChunkTransitionPreview />);

		await expect
			.element(screen.getByTestId("canvas-status"))
			.toContainText("Ready", { timeout: 15000 });

		await expect(page.screenshot()).toMatchSnapshot("chunk-transition.png");
	});
});
