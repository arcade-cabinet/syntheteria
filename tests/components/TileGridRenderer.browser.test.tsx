import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { TileGridPreview } from "./TileGridPreview";

describe("tile grid renderer", () => {
	test("renders a 10x10 grid of zone-colored floor tiles", async () => {
		const screen = render(<TileGridPreview />);

		await expect
			.element(screen.getByTestId("canvas-status"))
			.toBeVisible({ timeout: 3000 });

		await expect(page.screenshot()).toMatchSnapshot("tile-grid-basic.png");
	});
});
