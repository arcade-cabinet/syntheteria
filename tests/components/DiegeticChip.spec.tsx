import { expect, test } from "@playwright/experimental-ct-react";
import { DiegeticChip } from "../../src/ui/dom/DiegeticChip";

test.describe("DiegeticChip", () => {
	test("renders label and value", async ({ mount }) => {
		const component = await mount(
			<DiegeticChip label="Turn" value={3} />,
		);
		await expect(component).toContainText("Turn");
		await expect(component).toContainText("3");
	});

	test("renders string value", async ({ mount }) => {
		const component = await mount(
			<DiegeticChip label="Phase" value="player" />,
		);
		await expect(component).toContainText("Phase");
		await expect(component).toContainText("player");
	});

	test("accepts custom value color", async ({ mount }) => {
		const component = await mount(
			<DiegeticChip
				label="Storm"
				value="42%"
				valueColor="#ffe9b0"
			/>,
		);
		await expect(component).toContainText("Storm");
		await expect(component).toContainText("42%");
	});
});
