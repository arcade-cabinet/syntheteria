import { expect, test } from "@playwright/experimental-ct-react";
import { NotificationsPreview } from "./NotificationsPreview";

test.describe("notifications", () => {
	test("renders district notifications as toast cards", async ({ mount }) => {
		const component = await mount(<NotificationsPreview />);

		await expect(component).toContainText("District");
		await expect(component).toContainText("Fabricate Components");
	});
});
