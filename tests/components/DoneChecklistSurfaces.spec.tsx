/**
 * Isolated CT for done checklist surfaces (0.5 / 0.6).
 * Verifies title/new-game, turn chip, and End Turn button render in isolation.
 */
import { expect, test } from "@playwright/experimental-ct-react";
import { DiegeticChip } from "../../src/ui/dom/DiegeticChip";
import { HudButton } from "../../src/ui/components/HudButton";
import { NewGameModal } from "../../src/ui/NewGameModal";
import { createNewGameConfig } from "../../src/world/config";

test.describe("Done checklist surfaces (0.5 floor, 0.6 radial/turn/save/load)", () => {
	test("turn chip and End Turn button render", async ({ mount }) => {
		const component = await mount(
			<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
				<DiegeticChip label="Turn" value={7} />
				<HudButton label="End Turn" onPress={() => {}} />
			</div>,
		);
		await expect(component).toContainText("Turn");
		await expect(component).toContainText("7");
		await expect(component).toContainText("End Turn");
	});

	test("new game modal shows campaign initialization", async ({ mount }) => {
		const component = await mount(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(42)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);
		await expect(component).toContainText("Campaign Initialization");
	});
});
