import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
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
			"Allowed categories: move, build, fabricate, harvest, survey, system",
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

describe("ecumenopolis radial bot ownership", () => {
	for (const testCase of cases) {
		test(`renders radial ownership for ${testCase.unitType}`, async () => {
			const screen = render(
				<EcumenopolisRadialBotPreview unitType={testCase.unitType} />,
			);

			await expect
				.element(
					screen.getByText("Radial Ownership Validation", { exact: false }),
				)
				.toBeVisible();
			await expect
				.element(screen.getByText(testCase.displayName, { exact: false }))
				.toBeVisible();
			await expect
				.element(
					screen.getByText(testCase.preferredCategory, { exact: false }),
				)
				.toBeVisible();
			await expect
				.element(
					screen.getByText(testCase.allowedCategories, { exact: false }),
				)
				.toBeVisible();
			await expect
				.element(screen.getByText("Scene Loaded", { exact: false }))
				.toBeVisible({ timeout: 20000 });
			await expect(page.screenshot()).toMatchSnapshot(
				`ecumenopolis-radial-bot-${testCase.unitType}.png`,
			);
		});
	}
});
