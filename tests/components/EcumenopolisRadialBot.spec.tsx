import { expect, test } from "@playwright/experimental-ct-react";
import type { BotUnitType } from "../../src/bots";
import { EcumenopolisRadialBotPreview } from "./EcumenopolisRadialBotPreview";

const cases: Array<{
	unitType: BotUnitType;
	text: string;
	contains: string[];
}> = [
	{
		unitType: "maintenance_bot",
		text: "Field Technician Chassis",
		contains: [
			"Visible categories: Move, Combat, Build, Survey, District, System",
			"District actions: Brief, Enter, Stage Salvage, Extend Relay, Open Transit, Survey Gateway",
			"Expanded actions: Brief",
		],
	},
	{
		unitType: "utility_drone",
		text: "Relay Hauler Drone",
		contains: [
			"Visible categories: Move, Build, Survey, District, System",
			"District actions: Brief, Enter, Stage Salvage, Extend Relay, Open Transit, Survey Gateway",
			"Expanded actions: Relay",
		],
	},
	{
		unitType: "fabrication_unit",
		text: "Fabrication Rig",
		contains: [
			"Visible categories: Fabricate, Survey, District, System",
			"District actions: Brief, Enter, Stage Salvage, Extend Relay, Open Transit, Survey Gateway",
			"Expanded actions: Camera Module, Arm Assembly, Leg Assembly, Power Cell, Power Supply",
		],
	},
	{
		unitType: "mecha_golem",
		text: "Substation Engineer Hull",
		contains: [
			"Visible categories: Move, Combat, Build, Survey, District, System",
			"District actions: Brief, Enter, Stage Salvage, Extend Relay, Open Transit, Survey Gateway",
			"Expanded actions: Rod, Fabricator, Relay, Establish",
		],
	},
	{
		unitType: "field_fighter",
		text: "Assault Strider",
		contains: [
			"Visible categories: Move, Combat, Survey, District, System",
			"District actions: Brief, Enter, Stage Salvage, Extend Relay, Open Transit, Survey Gateway",
			"Expanded actions: Attack, Fortify",
		],
	},
];

for (const testCase of cases) {
	test(`renders radial ownership for ${testCase.unitType}`, async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisRadialBotPreview unitType={testCase.unitType} />,
		);

		await expect(component).toContainText("Radial Ownership Validation");
		await expect(component).toContainText(testCase.text);
		for (const expectedText of testCase.contains) {
			await expect(component).toContainText(expectedText);
		}
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});
}
