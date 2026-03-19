/**
 * Isolated browser tests for done-checklist surfaces (0.5 / 0.6).
 * Verifies title/new-game, turn chip, and End Turn button render in isolation.
 */
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { DiegeticChip } from "../../src/ui/dom/DiegeticChip";
import { HudButton } from "../../src/ui/components/HudButton";
import { NewGameModal } from "../../src/ui/NewGameModal";
import { createNewGameConfig } from "../../src/world/config";

describe("Done checklist surfaces (0.5 floor, 0.6 radial/turn/save/load)", () => {
	test("turn chip and End Turn button render", async () => {
		const screen = render(
			<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
				<DiegeticChip label="Turn" value={7} />
				<HudButton label="End Turn" onPress={() => {}} />
			</div>,
		);
		await expect.element(screen.getByText("Turn")).toBeVisible();
		await expect.element(screen.getByText("7")).toBeVisible();
		await expect.element(screen.getByText("End Turn")).toBeVisible();
	});

	test("new game modal shows campaign initialization", async () => {
		const screen = render(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(42)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);
		await expect
			.element(screen.getByText("Campaign Initialization", { exact: false }))
			.toBeVisible();
	});
});
