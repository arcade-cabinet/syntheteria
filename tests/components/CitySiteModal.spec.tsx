import { expect, test } from "@playwright/experimental-ct-react";
import { CitySiteModal } from "../../src/ui/CitySiteModal";

test.describe("city site modal", () => {
	test("renders branded site progression controls", async ({ mount }) => {
		const component = await mount(
			<CitySiteModal
				city={{
					id: 12,
					ecumenopolis_id: 1,
					poi_id: 4,
					name: "Science Campus",
					world_q: 3,
					world_r: 5,
					layout_seed: 42,
					generation_status: "reserved",
					state: "surveyed",
				}}
				context={{
					cityInstanceId: 12,
					discovered: true,
					distance: 1.5,
					name: "Science Campus",
					poiId: 4,
					poiType: "science_campus",
				}}
				mode="world"
				onClose={() => {}}
			/>,
		);

		await expect(component).toContainText("Science Campus");
		await expect(component).toContainText("Surveyed District");
		await expect(component).toContainText("Establish Research Substation");
		await expect(component).toContainText("Inspect Research Wing");
		await expect(component).toHaveScreenshot();
	});

	test("renders executable district operations for founded substations", async ({
		mount,
	}) => {
		const component = await mount(
			<CitySiteModal
				city={{
					id: 1,
					ecumenopolis_id: 1,
					poi_id: 1,
					name: "Command Arcology",
					world_q: 0,
					world_r: 0,
					layout_seed: 12,
					generation_status: "instanced",
					state: "founded",
				}}
				context={{
					cityInstanceId: 1,
					discovered: true,
					distance: 0.8,
					name: "Command Arcology",
					poiId: 1,
					poiType: "home_base",
				}}
				mode="world"
				onClose={() => {}}
			/>,
		);

		await expect(component).toContainText("Operational Actions");
		await expect(component).toContainText("Fabricate Components");
		await expect(
			component.locator(
				'[data-testid="city-site-operation-fabricate_components"]',
			),
		).toBeVisible();
	});
});
