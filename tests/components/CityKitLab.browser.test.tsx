import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { CityKitLab } from "../../src/city/runtime/CityKitLab";

describe("city kit lab", () => {
	test("renders the full preview-driven catalog surface", async () => {
		const screen = render(
			<div
				style={{
					width: 1280,
					height: 900,
					position: "relative",
					background: "#020609",
				}}
			>
				<CityKitLab onClose={() => {}} />
			</div>,
		);

		await expect
			.element(screen.getByText("City Kit Lab", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Rendered Previews", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Composites", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Directory Semantics", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Floor Presets", { exact: false }))
			.toBeVisible();
		await expect(page.screenshot()).toMatchSnapshot("city-kit-lab-default.png");
	});

	test("renders a filtered wall-focused lab state for structural review", async () => {
		const screen = render(
			<div
				style={{
					width: 1280,
					height: 900,
					position: "relative",
					background: "#020609",
				}}
			>
				<CityKitLab
					initialFilterState={{
						compositableOnly: true,
						family: "wall",
						placementType: "edge",
					}}
					onClose={() => {}}
				/>
			</div>,
		);

		await expect
			.element(screen.getByText("Directory Semantics", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Floor Presets", { exact: false }))
			.toBeVisible();
		await expect(page.screenshot()).toMatchSnapshot("city-kit-lab-wall-filter.png");
	});
});
