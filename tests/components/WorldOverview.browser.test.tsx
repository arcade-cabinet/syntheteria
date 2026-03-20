import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { WorldOverviewPreview } from "./WorldOverviewPreview";

describe("world overview rendering", () => {
	test("renders a full generated world with tiles and structures", async () => {
		const screen = render(<WorldOverviewPreview />);

		await expect
			.element(screen.getByTestId("canvas-status"))
			.toContainText("Ready", { timeout: 30000 });

		await expect
			.element(screen.getByText("World Overview", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Seed 42", { exact: false }))
			.toBeVisible();

		await expect(page.screenshot()).toMatchSnapshot("world-overview.png");
	});
});
