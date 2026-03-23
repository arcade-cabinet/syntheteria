import { expect, test } from "@playwright/experimental-ct-react";
import { CitySiteOverlayPreview } from "./CitySiteOverlayPreview";

test.describe("city site overlay", () => {
	test("renders world-side site brief modal from runtime state", async ({
		mount,
	}) => {
		const component = await mount(<CitySiteOverlayPreview scene="world" />);

		await expect(component).toContainText("Science Campus");
		await expect(component).toContainText("Action Flow");
		await expect(component).toContainText("Surveying commits the site layout");
		await expect(component.getByTestId("city-site-enter")).toBeVisible();
	});

	test("renders city-side return action from runtime state", async ({
		mount,
	}) => {
		const component = await mount(<CitySiteOverlayPreview scene="city" />);

		await expect(component).toContainText("Science Campus");
		await expect(component.getByTestId("city-site-return")).toBeVisible();
	});
});
