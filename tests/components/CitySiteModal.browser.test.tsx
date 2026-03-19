import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { CitySiteModal } from "../../src/ui/CitySiteModal";

describe("city site modal", () => {
	test("renders branded site progression controls", async () => {
		const screen = render(
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

		await expect
			.element(screen.getByText("Science Campus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Surveyed Base", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Establish Research Substation", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Inspect Research Wing", { exact: false }))
			.toBeVisible();
		await expect(page.screenshot()).toMatchSnapshot("city-site-modal.png");
	});
});
