import { expect, test } from "@playwright/experimental-ct-react";
import { LoadingOverlay } from "../../src/ui/LoadingOverlay";
import { NewGameModal } from "../../src/ui/NewGameModal";
import { TitleScreen } from "../../src/ui/TitleScreen";
import { createNewGameConfig } from "../../src/world/config";

test.describe("title and new game flow surfaces", () => {
	test("new game modal renders branded configuration controls", async ({
		mount,
	}) => {
		const component = await mount(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(1337)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		await expect(component).toContainText("Campaign Initialization");
		await expect(component).toContainText("Map Size");
		await expect(component).toContainText("Climate Pattern");
		await expect(component).toContainText("Storm Intensity");
		await expect(component).toHaveScreenshot();
	});

	test("loading overlay renders world generation status", async ({ mount }) => {
		const component = await mount(
			<LoadingOverlay label="Encoding world" />,
		);

		await expect(component).toContainText("World Generation");
		await expect(component).toContainText("Encoding world");
		await expect(component).toContainText("Encoding terrain lattice");
		await expect(component).toHaveScreenshot();
	});
});
