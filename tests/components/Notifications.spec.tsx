import { expect, test } from "@playwright/experimental-ct-react";
import { NotificationsPreview } from "./NotificationsPreview";

test.describe("notifications", () => {
	test("renders district execution notifications with resource-shift detail", async ({
		mount,
	}) => {
		const component = await mount(<NotificationsPreview />);

		await expect(component).toContainText("District Action");
		await expect(component).toContainText("Fabricate Components");
		await expect(component).toContainText(
			"Resource shift: scrap -2, e-waste -1, intact +2.",
		);
	});
});
