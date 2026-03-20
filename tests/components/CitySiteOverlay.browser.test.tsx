import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { CitySiteOverlayPreview } from "./CitySiteOverlayPreview";

describe("city site overlay", () => {
	test("renders world-side site brief modal from runtime state", async () => {
		const screen = render(<CitySiteOverlayPreview scene="world" />);

		await expect
			.element(screen.getByText("Science Campus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Action Flow", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Surveying commits the site layout", { exact: false }))
			.toBeVisible();
		await expect.element(screen.getByTestId("city-site-enter")).toBeVisible();
	});

	test("renders city-side return action from runtime state", async () => {
		const screen = render(<CitySiteOverlayPreview scene="city" />);

		await expect
			.element(screen.getByText("Science Campus", { exact: false }))
			.toBeVisible();
		await expect.element(screen.getByTestId("city-site-return")).toBeVisible();
	});
});
