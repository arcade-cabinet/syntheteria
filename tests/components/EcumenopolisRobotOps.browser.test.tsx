import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { EcumenopolisRobotOpsPreview } from "./EcumenopolisRobotOpsPreview";

describe("ecumenopolis robot ops scene", () => {
	test("renders the starting robot roster with readable placement and local context", async () => {
		const screen = render(<EcumenopolisRobotOpsPreview mode="placement" />);

		await expect
			.element(screen.getByText("Robot Ops Validation", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Placement audit", { exact: false }))
			.toBeVisible();
		await expect
			.element(
				screen.getByText(
					"Five starting chassis staged at the Command Arcology",
					{ exact: false },
				),
			)
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-robot-ops-placement.png",
		);
	});

	test("renders AI-owned robot movement with persistent speech-bubble context", async () => {
		const screen = render(<EcumenopolisRobotOpsPreview mode="movement" />);

		await expect
			.element(screen.getByText("Robot Ops Validation", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Movement audit", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Field Technician", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Archive Campus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-robot-ops-movement.png",
		);
	});
});
