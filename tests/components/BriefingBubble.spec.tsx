import { expect, test } from "@playwright/experimental-ct-react";
import { BriefingBubblePreview } from "./BriefingBubblePreview";

test.describe("briefing bubbles", () => {
	test("renders selected unit and nearby site briefings", async ({ mount }) => {
		const component = await mount(<BriefingBubblePreview />);

		await expect(
			component.getByTestId("briefing-bubble-nearby-site"),
		).toBeVisible();
		await expect(component).toContainText("Mentor Relay");
		await expect(component).toContainText("Field Technician");
		await expect(component).toContainText("Science Campus");
		await expect(component).toContainText(
			"compute, signal, and fabrication-adjacent",
		);
	});
});
