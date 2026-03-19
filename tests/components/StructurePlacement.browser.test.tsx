import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { StructurePlacementPreview } from "./StructurePlacementPreview";

describe("structure placement on grid", () => {
	test("renders wall structures forming a corridor on the tile grid", async () => {
		const screen = render(<StructurePlacementPreview />);

		await expect
			.element(screen.getByTestId("canvas-status"))
			.toContainText("Ready", { timeout: 15000 });

		await expect(page.screenshot()).toMatchSnapshot("structure-placement.png");
	});
});
