import { beforeEach, describe, expect, it } from "vitest";
import { _resetToasts, getVisibleToasts } from "../toastNotifications";
import type { TooltipTrigger } from "../tutorialTooltips";
import {
	fireTutorialTooltip,
	getAllTooltipDefs,
	hasTooltipFired,
	resetTutorialTooltips,
} from "../tutorialTooltips";

describe("tutorialTooltips", () => {
	beforeEach(() => {
		resetTutorialTooltips();
		_resetToasts();
	});

	it("fires a tooltip and pushes a toast", () => {
		fireTutorialTooltip("first_move");
		expect(hasTooltipFired("first_move")).toBe(true);

		const toasts = getVisibleToasts();
		expect(toasts.length).toBe(1);
		expect(toasts[0]!.category).toBe("tutorial");
		expect(toasts[0]!.message).toContain("Select units");
	});

	it("fires each tooltip only once", () => {
		fireTutorialTooltip("first_move");
		fireTutorialTooltip("first_move");
		fireTutorialTooltip("first_move");

		const toasts = getVisibleToasts();
		expect(toasts.length).toBe(1);
	});

	it("different triggers fire independently", () => {
		fireTutorialTooltip("first_move");
		fireTutorialTooltip("first_combat");

		expect(hasTooltipFired("first_move")).toBe(true);
		expect(hasTooltipFired("first_combat")).toBe(true);
		expect(hasTooltipFired("first_harvest_complete")).toBe(false);
	});

	it("reset clears all fired state", () => {
		fireTutorialTooltip("first_move");
		fireTutorialTooltip("first_combat");
		fireTutorialTooltip("first_harvest_complete");

		expect(hasTooltipFired("first_move")).toBe(true);
		expect(hasTooltipFired("first_combat")).toBe(true);

		resetTutorialTooltips();

		expect(hasTooltipFired("first_move")).toBe(false);
		expect(hasTooltipFired("first_combat")).toBe(false);
		expect(hasTooltipFired("first_harvest_complete")).toBe(false);
	});

	it("all 10 triggers have definitions", () => {
		const defs = getAllTooltipDefs();
		expect(defs.length).toBe(10);

		const allTriggers: TooltipTrigger[] = [
			"first_move",
			"first_resource_visible",
			"first_hostile_spotted",
			"first_building_placed",
			"first_building_upgraded",
			"first_epoch_change",
			"first_combat",
			"first_harvest_complete",
			"first_poi_discovered",
			"first_fabrication",
		];

		for (const trigger of allTriggers) {
			const def = defs.find((d) => d.trigger === trigger);
			expect(def, `Missing definition for ${trigger}`).toBeDefined();
			expect(def!.message.length).toBeGreaterThan(0);
			expect(def!.icon.length).toBeGreaterThan(0);
		}
	});

	it("all 10 triggers can fire successfully", () => {
		const triggers: TooltipTrigger[] = [
			"first_move",
			"first_resource_visible",
			"first_hostile_spotted",
			"first_building_placed",
			"first_building_upgraded",
			"first_epoch_change",
			"first_combat",
			"first_harvest_complete",
			"first_poi_discovered",
			"first_fabrication",
		];

		for (const trigger of triggers) {
			fireTutorialTooltip(trigger);
			expect(hasTooltipFired(trigger)).toBe(true);
		}
	});

	it("reset allows re-firing the same tooltip", () => {
		fireTutorialTooltip("first_move");
		expect(hasTooltipFired("first_move")).toBe(true);

		resetTutorialTooltips();
		_resetToasts();

		expect(hasTooltipFired("first_move")).toBe(false);

		fireTutorialTooltip("first_move");
		expect(hasTooltipFired("first_move")).toBe(true);

		const toasts = getVisibleToasts();
		expect(toasts.length).toBe(1);
	});
});
