/**
 * Unit tests for interactionSystem — contextual interaction state management.
 *
 * Tests cover:
 * - Hover: set, clear, state reads
 * - Selection: selectTarget opens radial menu, deselectTarget closes
 * - Available actions: correct action sets per target type
 * - Action execution: valid/invalid action handling, triggered action state
 * - Range checking: canInteract per target type
 * - State listeners: subscribe/unsubscribe, notification on changes
 * - Edge cases: select without hover, double select, execute without selection
 * - Reset: clears all state
 */

import {
	canInteract,
	clearHover,
	clearTriggeredAction,
	deselectTarget,
	executeAction,
	getAvailableActions,
	getInteractionState,
	getMaxRange,
	getTriggeredAction,
	onInteractionStateChange,
	resetInteractionSystem,
	selectTarget,
	setHoveredTarget,
	type InteractionTargetType,
} from "../interactionState";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetInteractionSystem();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
	it("starts with no hover, no selection, menu closed", () => {
		const state = getInteractionState();
		expect(state.hoveredTarget).toBeNull();
		expect(state.selectedTarget).toBeNull();
		expect(state.radialMenuOpen).toBe(false);
		expect(state.availableActions).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

describe("hover", () => {
	it("setHoveredTarget updates hover state", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.5);
		const state = getInteractionState();
		expect(state.hoveredTarget).toEqual({
			id: "ore-1",
			type: "ore_deposit",
			distance: 2.5,
		});
	});

	it("setHoveredTarget replaces previous hover", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.5);
		setHoveredTarget("cube-1", "cube", 1.0);
		const state = getInteractionState();
		expect(state.hoveredTarget!.id).toBe("cube-1");
		expect(state.hoveredTarget!.type).toBe("cube");
	});

	it("clearHover removes hover", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.5);
		clearHover();
		const state = getInteractionState();
		expect(state.hoveredTarget).toBeNull();
	});

	it("hover does not open radial menu", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.5);
		const state = getInteractionState();
		expect(state.radialMenuOpen).toBe(false);
		expect(state.selectedTarget).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("selection", () => {
	it("selectTarget opens radial menu with correct actions", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		const result = selectTarget("ore-1");
		expect(result).toBe(true);

		const state = getInteractionState();
		expect(state.selectedTarget).toEqual({ id: "ore-1", type: "ore_deposit" });
		expect(state.radialMenuOpen).toBe(true);
		expect(state.availableActions.length).toBeGreaterThan(0);
	});

	it("selectTarget with type override works without hover", () => {
		const result = selectTarget("building-1", "building");
		expect(result).toBe(true);

		const state = getInteractionState();
		expect(state.selectedTarget).toEqual({ id: "building-1", type: "building" });
		expect(state.radialMenuOpen).toBe(true);
	});

	it("selectTarget fails if no type and no matching hover", () => {
		const result = selectTarget("unknown-1");
		expect(result).toBe(false);

		const state = getInteractionState();
		expect(state.selectedTarget).toBeNull();
		expect(state.radialMenuOpen).toBe(false);
	});

	it("selectTarget fails if hover ID does not match", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		const result = selectTarget("different-id");
		expect(result).toBe(false);
	});

	it("deselectTarget closes menu and clears selection", () => {
		setHoveredTarget("cube-1", "cube", 1.0);
		selectTarget("cube-1");
		deselectTarget();

		const state = getInteractionState();
		expect(state.selectedTarget).toBeNull();
		expect(state.radialMenuOpen).toBe(false);
		expect(state.availableActions).toEqual([]);
	});

	it("selecting a different target replaces selection", () => {
		selectTarget("a", "cube");
		selectTarget("b", "furnace");

		const state = getInteractionState();
		expect(state.selectedTarget!.id).toBe("b");
		expect(state.selectedTarget!.type).toBe("furnace");
	});
});

// ---------------------------------------------------------------------------
// Available actions per type
// ---------------------------------------------------------------------------

describe("getAvailableActions", () => {
	const allTypes: InteractionTargetType[] = [
		"ore_deposit",
		"cube",
		"furnace",
		"building",
		"bot",
		"enemy",
		"outpost",
		"trade_post",
	];

	it.each(allTypes)("returns non-empty actions for %s", (type) => {
		const actions = getAvailableActions(type);
		expect(actions.length).toBeGreaterThan(0);
		for (const action of actions) {
			expect(action).toHaveProperty("id");
			expect(action).toHaveProperty("label");
			expect(typeof action.id).toBe("string");
			expect(typeof action.label).toBe("string");
		}
	});

	it("ore_deposit has harvest and scan", () => {
		const actions = getAvailableActions("ore_deposit");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("harvest");
		expect(ids).toContain("scan");
	});

	it("cube has grab, inspect, throw", () => {
		const actions = getAvailableActions("cube");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("grab");
		expect(ids).toContain("inspect");
		expect(ids).toContain("throw");
	});

	it("furnace has open_menu, deposit_cube, repair", () => {
		const actions = getAvailableActions("furnace");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("open_menu");
		expect(ids).toContain("deposit_cube");
		expect(ids).toContain("repair");
	});

	it("building has interact, upgrade, demolish, repair", () => {
		const actions = getAvailableActions("building");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("interact");
		expect(ids).toContain("upgrade");
		expect(ids).toContain("demolish");
		expect(ids).toContain("repair");
	});

	it("bot has switch_to, follow, command, repair", () => {
		const actions = getAvailableActions("bot");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("switch_to");
		expect(ids).toContain("follow");
		expect(ids).toContain("command");
		expect(ids).toContain("repair");
	});

	it("enemy has attack, hack, scan", () => {
		const actions = getAvailableActions("enemy");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("attack");
		expect(ids).toContain("hack");
		expect(ids).toContain("scan");
	});

	it("outpost has claim, upgrade, demolish", () => {
		const actions = getAvailableActions("outpost");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("claim");
		expect(ids).toContain("upgrade");
		expect(ids).toContain("demolish");
	});

	it("trade_post has trade, inspect", () => {
		const actions = getAvailableActions("trade_post");
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("trade");
		expect(ids).toContain("inspect");
	});

	it("returns a copy, not a reference", () => {
		const a = getAvailableActions("cube");
		const b = getAvailableActions("cube");
		a.push({ id: "fake", label: "Fake" });
		expect(b).not.toContainEqual({ id: "fake", label: "Fake" });
	});
});

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

describe("executeAction", () => {
	it("returns true for a valid action on selected target", () => {
		selectTarget("ore-1", "ore_deposit");
		const result = executeAction("harvest");
		expect(result).toBe(true);
	});

	it("records triggered action with correct metadata", () => {
		selectTarget("ore-1", "ore_deposit");
		executeAction("harvest");

		const triggered = getTriggeredAction();
		expect(triggered).not.toBeNull();
		expect(triggered!.actionId).toBe("harvest");
		expect(triggered!.targetId).toBe("ore-1");
		expect(triggered!.targetType).toBe("ore_deposit");
	});

	it("closes radial menu after execution", () => {
		selectTarget("cube-1", "cube");
		executeAction("grab");

		const state = getInteractionState();
		expect(state.radialMenuOpen).toBe(false);
		expect(state.selectedTarget).toBeNull();
	});

	it("returns false for invalid action ID", () => {
		selectTarget("cube-1", "cube");
		const result = executeAction("nonexistent_action");
		expect(result).toBe(false);
	});

	it("returns false when no target is selected", () => {
		const result = executeAction("harvest");
		expect(result).toBe(false);
	});

	it("returns false when menu is closed", () => {
		selectTarget("cube-1", "cube");
		deselectTarget();
		const result = executeAction("grab");
		expect(result).toBe(false);
	});

	it("clearTriggeredAction clears the triggered action", () => {
		selectTarget("ore-1", "ore_deposit");
		executeAction("scan");
		expect(getTriggeredAction()).not.toBeNull();

		clearTriggeredAction();
		expect(getTriggeredAction()).toBeNull();
	});

	it("executing wrong-type action fails", () => {
		selectTarget("cube-1", "cube");
		// "harvest" is an ore_deposit action, not a cube action
		const result = executeAction("harvest");
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Range checking
// ---------------------------------------------------------------------------

describe("canInteract", () => {
	it("returns true when within range", () => {
		expect(canInteract(1.0, "cube")).toBe(true);
		expect(canInteract(2.5, "cube")).toBe(true);
	});

	it("returns false when out of range", () => {
		expect(canInteract(3.0, "cube")).toBe(false);
		expect(canInteract(100, "ore_deposit")).toBe(false);
	});

	it("returns true at exact max range", () => {
		const maxRange = getMaxRange("cube");
		expect(canInteract(maxRange, "cube")).toBe(true);
	});

	it("returns false just beyond max range", () => {
		const maxRange = getMaxRange("cube");
		expect(canInteract(maxRange + 0.001, "cube")).toBe(false);
	});

	it("enemy has longest range", () => {
		expect(getMaxRange("enemy")).toBeGreaterThan(getMaxRange("cube"));
		expect(getMaxRange("enemy")).toBeGreaterThan(getMaxRange("building"));
	});

	it("each type has a positive max range", () => {
		const types: InteractionTargetType[] = [
			"ore_deposit", "cube", "furnace", "building",
			"bot", "enemy", "outpost", "trade_post",
		];
		for (const type of types) {
			expect(getMaxRange(type)).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// State listeners
// ---------------------------------------------------------------------------

describe("state listeners", () => {
	it("notifies on hover change", () => {
		const listener = jest.fn();
		onInteractionStateChange(listener);

		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].hoveredTarget).not.toBeNull();
	});

	it("notifies on selection change", () => {
		const listener = jest.fn();
		onInteractionStateChange(listener);

		selectTarget("cube-1", "cube");
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].radialMenuOpen).toBe(true);
	});

	it("notifies on action execution", () => {
		const listener = jest.fn();
		selectTarget("cube-1", "cube");

		onInteractionStateChange(listener);
		executeAction("grab");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].radialMenuOpen).toBe(false);
	});

	it("unsubscribe stops notifications", () => {
		const listener = jest.fn();
		const unsub = onInteractionStateChange(listener);

		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
		setHoveredTarget("cube-1", "cube", 1.0);
		expect(listener).toHaveBeenCalledTimes(1); // no additional call
	});

	it("multiple listeners all get notified", () => {
		const listener1 = jest.fn();
		const listener2 = jest.fn();
		onInteractionStateChange(listener1);
		onInteractionStateChange(listener2);

		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(1);
	});

	it("notifies on clearHover", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);

		const listener = jest.fn();
		onInteractionStateChange(listener);
		clearHover();

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].hoveredTarget).toBeNull();
	});

	it("notifies on deselectTarget", () => {
		selectTarget("cube-1", "cube");

		const listener = jest.fn();
		onInteractionStateChange(listener);
		deselectTarget();

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0][0].selectedTarget).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getInteractionState returns copies
// ---------------------------------------------------------------------------

describe("state immutability", () => {
	it("returned state is a snapshot, not a live reference", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		const state = getInteractionState();

		clearHover();
		const updated = getInteractionState();

		// Original snapshot should still have the hover
		expect(state.hoveredTarget).not.toBeNull();
		expect(updated.hoveredTarget).toBeNull();
	});

	it("modifying returned actions array does not affect internal state", () => {
		selectTarget("cube-1", "cube");
		const state = getInteractionState();
		state.availableActions.push({ id: "fake", label: "Fake" });

		const fresh = getInteractionState();
		expect(fresh.availableActions).not.toContainEqual({ id: "fake", label: "Fake" });
	});
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe("resetInteractionSystem", () => {
	it("clears all state", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		selectTarget("ore-1");
		executeAction("harvest");

		resetInteractionSystem();

		const state = getInteractionState();
		expect(state.hoveredTarget).toBeNull();
		expect(state.selectedTarget).toBeNull();
		expect(state.radialMenuOpen).toBe(false);
		expect(state.availableActions).toEqual([]);
		expect(getTriggeredAction()).toBeNull();
	});

	it("clears all listeners", () => {
		const listener = jest.fn();
		onInteractionStateChange(listener);

		resetInteractionSystem();
		setHoveredTarget("ore-1", "ore_deposit", 2.0);

		// Listener was registered before reset — should NOT be called
		expect(listener).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("selecting same target twice replaces cleanly", () => {
		selectTarget("cube-1", "cube");
		selectTarget("cube-1", "cube");

		const state = getInteractionState();
		expect(state.selectedTarget!.id).toBe("cube-1");
		expect(state.radialMenuOpen).toBe(true);
	});

	it("executing action after deselect returns false", () => {
		selectTarget("cube-1", "cube");
		deselectTarget();
		expect(executeAction("grab")).toBe(false);
	});

	it("clearHover while menu is open does not close menu", () => {
		setHoveredTarget("ore-1", "ore_deposit", 2.0);
		selectTarget("ore-1");
		clearHover();

		const state = getInteractionState();
		expect(state.hoveredTarget).toBeNull();
		expect(state.radialMenuOpen).toBe(true);
		expect(state.selectedTarget).not.toBeNull();
	});

	it("canInteract with zero distance returns true", () => {
		expect(canInteract(0, "cube")).toBe(true);
	});

	it("canInteract with negative distance returns true", () => {
		expect(canInteract(-1, "cube")).toBe(true);
	});
});
