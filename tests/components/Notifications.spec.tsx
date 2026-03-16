import { expect, test } from "@playwright/experimental-ct-react";
import { NotificationsPreview } from "./NotificationsPreview";

test.describe("notifications", () => {
	test("renders without error when no events are queued", async ({ mount }) => {
		const component = await mount(<NotificationsPreview />);
		// Notifications returns null when toasts are empty — verify no crash
		await expect(component).toBeAttached();
	});
});
