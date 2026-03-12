import { expect, test } from "@playwright/experimental-ct-react";
import { EcumenopolisWorldPreview } from "./EcumenopolisWorldPreview";

test.describe("ecumenopolis world scene", () => {
	test("renders a deterministic generated overview of the ecumenopolis campaign", async ({
		mount,
		page,
	}) => {
		const component = await mount(<EcumenopolisWorldPreview view="overview" />);

		await expect(component).toContainText("Ecumenopolis Validation");
		await expect(component).toContainText("Field Technician");
		await expect(component).toContainText("Command Arcology");
		await expect(component).toContainText("Archive Campus");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});

	test("renders the starting sector with substation, conduits, and local briefings", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisWorldPreview view="starting-sector" />,
		);

		await expect(component).toContainText("Ecumenopolis Validation");
		await expect(component).toContainText("Mentor Relay");
		await expect(component).toContainText("Command Arcology");
		await expect(component).toContainText("Abyssal Extraction Ward");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});

	test("renders a closer anchor cluster view of the command arcology district", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisWorldPreview view="anchor-cluster" />,
		);

		await expect(component).toContainText("Ecumenopolis Validation");
		await expect(component).toContainText("Command Arcology Anchor Cluster");
		await expect(component).toContainText("Command Arcology");
		await expect(component).toContainText("Archive Campus");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});

	test("renders a player substation cluster with visibly established district structures", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisWorldPreview view="player-substation" />,
		);

		await expect(component).toContainText("Player Substation Cluster");
		await expect(component).toContainText("Command Arcology");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});

	test("renders a rival machine cluster around the archive campus", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisWorldPreview view="rival-cluster" />,
		);

		await expect(component).toContainText("Rival Research Cluster");
		await expect(component).toContainText("Archive Campus");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});

	test("renders a hostile cult incursion cluster", async ({
		mount,
		page,
	}) => {
		const component = await mount(
			<EcumenopolisWorldPreview view="cult-cluster" />,
		);

		await expect(component).toContainText("Cult Incursion Cluster");
		await expect(component).toContainText("Cult Wards");
		await expect(component).toContainText("Scene Loaded", { timeout: 20000 });
		await expect(component).toHaveScreenshot();
	});
});
