import { expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { ModelProbePreview } from "./ModelProbePreview";

test("renders core city kit probe models", async () => {
	render(<ModelProbePreview />);
	await expect(page.screenshot()).toMatchSnapshot("model-probe.png");
});
