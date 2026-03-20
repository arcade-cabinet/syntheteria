import { expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { HudButton } from "../../src/ui/components/HudButton";

test("HudButton renders primary variant", async () => {
	const screen = render(<HudButton label="TEST BUTTON" onPress={() => {}} />);
	await expect.element(screen.getByText("TEST BUTTON")).toBeVisible();
	await expect(page.screenshot()).toMatchSnapshot("hud-button-primary.png");
});

test("HudButton renders utility variant for fabrication actions", async () => {
	const screen = render(
		<HudButton
			label="FABRICATE"
			meta="assembly node"
			variant="utility"
			onPress={() => {}}
		/>,
	);
	await expect.element(screen.getByText("FABRICATE")).toBeVisible();
	await expect.element(screen.getByText("assembly node")).toBeVisible();
	await expect(page.screenshot()).toMatchSnapshot("hud-button-utility.png");
});

test("HudButton renders disabled state", async () => {
	const screen = render(<HudButton label="LOCKED" disabled onPress={() => {}} />);
	await expect.element(screen.getByText("LOCKED")).toBeVisible();
	await expect(page.screenshot()).toMatchSnapshot("hud-button-disabled.png");
});

test("HudButton renders End Turn for turn phase", async () => {
	const screen = render(<HudButton label="End Turn" onPress={() => {}} />);
	await expect.element(screen.getByText("End Turn")).toBeVisible();
});
