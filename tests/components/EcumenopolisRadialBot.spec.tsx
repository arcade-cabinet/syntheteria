import { expect, test } from "@playwright/experimental-ct-react";
import type { BotUnitType } from "../../src/bots";
import { EcumenopolisRadialBotPreview } from "./EcumenopolisRadialBotPreview";

const cases: Array<{
	unitType: BotUnitType;
	displayName: string;
	preferredCategory: string;
	allowedCategories: string;
}> = [
	{
		unitType: "maintenance_bot",
		displayName: "Technician",
		preferredCategory: "Preferred category: repair",
		allowedCategories: "Allowed categories: move, repair, survey, system",
	},
	{
		unitType: "utility_drone",
		displayName: "Hauler",
		preferredCategory: "Preferred category: move",
		allowedCategories: "Allowed categories: move, survey, system",
	},
	{
		unitType: "fabrication_unit",
		displayName: "Fabricator",
		preferredCategory: "Preferred category: build",
		allowedCategories:
			"Allowed categories: move, build, fabricate, harvest, district, survey, system",
	},
	{
		unitType: "mecha_golem",
		displayName: "Guardian",
		preferredCategory: "Preferred category: combat",
		allowedCategories: "Allowed categories: move, combat, survey, system",
	},
	{
		unitType: "field_fighter",
		displayName: "Striker",
		preferredCategory: "Preferred category: combat",
		allowedCategories: "Allowed categories: move, combat, survey, system",
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
		await expect(component).toContainText(testCase.displayName);
		await expect(component).toContainText(testCase.preferredCategory);
		await expect(component).toContainText(testCase.allowedCategories);
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.05 });
	});
}
