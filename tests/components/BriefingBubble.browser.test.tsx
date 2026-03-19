import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { BriefingBubblePreview } from "./BriefingBubblePreview";

describe("briefing bubbles", () => {
	test("renders selected unit and nearby site briefings", async () => {
		const screen = render(<BriefingBubblePreview />);

		await expect
			.element(screen.getByTestId("briefing-bubble-nearby-site"))
			.toBeVisible();
		await expect.element(screen.getByText("Mentor Relay")).toBeVisible();
		await expect.element(screen.getByText("Field Technician")).toBeVisible();
		await expect.element(screen.getByText("Science Campus")).toBeVisible();
		await expect
			.element(screen.getByText("compute, signal, and fabrication-adjacent", { exact: false }))
			.toBeVisible();
	});
});
