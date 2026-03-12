import { expect, test } from "@playwright/experimental-ct-react";
import { HudButton } from "../../src/ui/components/HudButton";

test("HudButton renders primary variant", async ({ mount }) => {
	const component = await mount(
		<HudButton label="TEST BUTTON" onPress={() => {}} />,
	);
	await expect(component).toContainText("TEST BUTTON");
	await expect(component).toHaveScreenshot();
});

test("HudButton renders utility variant for fabrication actions", async ({
	mount,
}) => {
	const component = await mount(
		<HudButton
			label="FABRICATE"
			meta="assembly node"
			variant="utility"
			onPress={() => {}}
		/>,
	);
	await expect(component).toContainText("FABRICATE");
	await expect(component).toContainText("assembly node");
	await expect(component).toHaveScreenshot();
});

test("HudButton renders disabled state", async ({ mount }) => {
	const component = await mount(
		<HudButton label="LOCKED" disabled onPress={() => {}} />,
	);
	await expect(component).toContainText("LOCKED");
	await expect(component).toHaveScreenshot();
});
