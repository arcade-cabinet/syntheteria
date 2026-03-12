import { expect, test } from "@playwright/experimental-ct-react";
import { CityKitLab } from "../../src/city/runtime/CityKitLab";

test.describe("city kit lab", () => {
	test("renders the full preview-driven catalog surface", async ({ mount }) => {
		const component = await mount(
			<div
				style={{
					width: 1280,
					height: 900,
					position: "relative",
					background: "#020609",
				}}
			>
				<CityKitLab onClose={() => {}} />
			</div>,
		);

		await expect(component).toContainText("City Kit Lab");
		await expect(component).toContainText("Rendered Previews");
		await expect(component).toContainText("Composites");
		await expect(component).toHaveScreenshot();
	});
});
