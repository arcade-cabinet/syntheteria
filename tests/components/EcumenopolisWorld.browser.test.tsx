import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { EcumenopolisWorldPreview } from "./EcumenopolisWorldPreview";

describe("ecumenopolis world scene", () => {
	test("renders a deterministic generated overview of the ecumenopolis campaign", async () => {
		const screen = render(<EcumenopolisWorldPreview view="overview" />);

		await expect
			.element(screen.getByText("Ecumenopolis Validation", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Research Site", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Command Nexus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Signal Lab", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot("ecumenopolis-overview.png");
	});

	test("renders the starting sector with substation, conduits, and local briefings", async () => {
		const screen = render(
			<EcumenopolisWorldPreview view="starting-sector" />,
		);

		await expect
			.element(screen.getByText("Ecumenopolis Validation", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Research Site", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Command Nexus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Salvage Yard", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-starting-sector.png",
		);
	});

	test("renders a closer anchor cluster view of the command arcology district", async () => {
		const screen = render(
			<EcumenopolisWorldPreview view="anchor-cluster" />,
		);

		await expect
			.element(screen.getByText("Ecumenopolis Validation", { exact: false }))
			.toBeVisible();
		await expect
			.element(
				screen.getByText("Command Arcology Anchor Cluster", { exact: false }),
			)
			.toBeVisible();
		await expect
			.element(screen.getByText("Command Nexus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Signal Lab", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-anchor-cluster.png",
		);
	});

	test("renders a player substation cluster with visibly established district structures", async () => {
		const screen = render(
			<EcumenopolisWorldPreview view="player-substation" />,
		);

		await expect
			.element(
				screen.getByText("Player Substation Cluster", { exact: false }),
			)
			.toBeVisible();
		await expect
			.element(screen.getByText("Command Nexus", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-player-substation.png",
		);
	});

	test("renders a rival machine cluster around the research site", async () => {
		const screen = render(<EcumenopolisWorldPreview view="rival-cluster" />);

		await expect
			.element(screen.getByText("Rival Research Cluster", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Signal Lab", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-rival-cluster.png",
		);
	});

	test("renders a hostile cult incursion cluster", async () => {
		const screen = render(<EcumenopolisWorldPreview view="cult-cluster" />);

		await expect
			.element(screen.getByText("Cult Incursion Cluster", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Fracture Rift", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Scene Loaded", { exact: false }))
			.toBeVisible({ timeout: 20000 });
		await expect(page.screenshot()).toMatchSnapshot(
			"ecumenopolis-cult-cluster.png",
		);
	});
});
