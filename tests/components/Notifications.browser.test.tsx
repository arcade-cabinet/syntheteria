import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { NotificationsPreview } from "./NotificationsPreview";

describe("notifications", () => {
	test("renders without error when no events are queued", async () => {
		const screen = render(<NotificationsPreview />);
		// Notifications returns null when the toast queue is empty — verify no crash.
		await expect.element(screen.container).toBeInTheDocument();
	});
});
