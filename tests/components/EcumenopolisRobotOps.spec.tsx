import { expect, test } from "@playwright/experimental-ct-react";
import { EcumenopolisRobotOpsPreview } from "./EcumenopolisRobotOpsPreview";

test.describe("ecumenopolis robot ops scene", () => {
	test("renders the starting robot roster with readable placement and local context", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisRobotOpsPreview mode="placement" />,
		);

		await expect(component).toContainText("Robot Ops Validation");
		await expect(component).toContainText("Placement audit");
		await expect(component).toContainText("Five starting chassis staged at the Command Arcology");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.05 });
	});

	test("renders AI-owned robot movement with persistent speech-bubble context", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisRobotOpsPreview mode="movement" />,
		);

		await expect(component).toContainText("Robot Ops Validation");
		await expect(component).toContainText("Movement audit");
		await expect(component).toContainText("Field Technician");
		await expect(component).toContainText("Archive Campus");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.05 });
	});
});
