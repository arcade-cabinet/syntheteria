import { expect, test } from "@playwright/experimental-ct-react";
import { ModelProbePreview } from "./ModelProbePreview";

test("renders core city kit probe models", async ({ mount }) => {
	const component = await mount(<ModelProbePreview />);
	await expect(component).toHaveScreenshot();
});
