/**
 * Unit tests for contextualActions — radial menu action mapping system.
 *
 * Tests cover:
 * - categorizeEntity: trait-based and type-based classification
 * - getActionsForEntity: correct action sets per entity category
 * - getActionsForEntity: player state affects enabled/disabled
 * - getActionsForEntity: entity state affects enabled/disabled
 * - getQuickAction: single-click shortcuts per category
 * - executeAction: success/failure results with sound/particle events
 * - registerCustomActions: mod/extension action injection
 * - reset: clears custom actions
 * - Edge cases: unknown categories, missing data, boundary distances
 */

import {
	categorizeEntity,
	executeAction,
	getActionsForEntity,
	getInteractionRange,
	getQuickAction,
	registerCustomActions,
	reset,
	type EntityCategory,
	type EntityState,
	type PlayerState,
} from "../contextualActions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
	return {
		isHoldingCube: false,
		distanceToTarget: 1.0,
		healthPercent: 1.0,
		hasHackModule: false,
		ammoCount: 100,
		...overrides,
	};
}

function makeEntityState(overrides: Partial<EntityState> = {}): EntityState {
	return {
		isPowered: true,
		isDepleted: false,
		healthPercent: 1.0,
		quantity: 100,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	reset();
});

// ---------------------------------------------------------------------------
// categorizeEntity
// ---------------------------------------------------------------------------

describe("categorizeEntity", () => {
	it("identifies ore deposit by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["OreDeposit"] });
		expect(cat).toBe("ore_deposit");
	});

	it("identifies ore deposit by type string", () => {
		const cat = categorizeEntity("e1", { type: "ore_deposit" });
		expect(cat).toBe("ore_deposit");
	});

	it("identifies material cube by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["MaterialCube", "Grabbable"] });
		expect(cat).toBe("material_cube");
	});

	it("identifies furnace by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Furnace", "Hopper"] });
		expect(cat).toBe("furnace");
	});

	it("identifies belt by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Belt"] });
		expect(cat).toBe("belt");
	});

	it("identifies lightning rod by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["LightningRod"] });
		expect(cat).toBe("lightning_rod");
	});

	it("identifies turret by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Turret"] });
		expect(cat).toBe("turret");
	});

	it("identifies otter by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Otter"] });
		expect(cat).toBe("otter");
	});

	it("identifies wall by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Wall"] });
		expect(cat).toBe("wall");
	});

	it("identifies wire by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Wire"] });
		expect(cat).toBe("wire");
	});

	it("identifies friendly bot by Unit trait and player faction", () => {
		const cat = categorizeEntity("e1", {
			traits: ["Unit"],
			faction: "player",
		});
		expect(cat).toBe("friendly_bot");
	});

	it("identifies enemy bot by Unit trait and enemy faction", () => {
		const cat = categorizeEntity("e1", {
			traits: ["Unit"],
			faction: "enemy",
		});
		expect(cat).toBe("enemy_bot");
	});

	it("identifies enemy bot by hostile faction", () => {
		const cat = categorizeEntity("e1", {
			traits: ["Unit"],
			faction: "hostile",
		});
		expect(cat).toBe("enemy_bot");
	});

	it("defaults Unit with no faction to friendly bot", () => {
		const cat = categorizeEntity("e1", { traits: ["Unit"] });
		expect(cat).toBe("friendly_bot");
	});

	it("identifies building by trait", () => {
		const cat = categorizeEntity("e1", { traits: ["Building"] });
		expect(cat).toBe("building");
	});

	it("returns unknown for entities with no matching traits", () => {
		const cat = categorizeEntity("e1", { traits: ["SomethingRandom"] });
		expect(cat).toBe("unknown");
	});

	it("returns unknown for empty entity data", () => {
		const cat = categorizeEntity("e1", {});
		expect(cat).toBe("unknown");
	});

	it("identifies by type string when no traits present", () => {
		const cat = categorizeEntity("e1", { type: "turret" });
		expect(cat).toBe("turret");
	});

	it("identifies enemy by explicit enemy_bot type", () => {
		const cat = categorizeEntity("e1", { type: "enemy_bot" });
		expect(cat).toBe("enemy_bot");
	});

	it("identifies enemy by hostile faction even without traits", () => {
		const cat = categorizeEntity("e1", { faction: "hostile" });
		expect(cat).toBe("enemy_bot");
	});
});

// ---------------------------------------------------------------------------
// getActionsForEntity — action sets per category
// ---------------------------------------------------------------------------

describe("getActionsForEntity — action sets", () => {
	const ps = makePlayerState();

	it("ore_deposit returns harvest, inspect, mark_map", () => {
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("harvest");
		expect(ids).toContain("inspect");
		expect(ids).toContain("mark_map");
	});

	it("material_cube returns grab, inspect, kick", () => {
		const actions = getActionsForEntity("e1", "material_cube", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("grab");
		expect(ids).toContain("inspect");
		expect(ids).toContain("kick");
	});

	it("furnace returns deposit, view_recipes, toggle_power, inspect", () => {
		const actions = getActionsForEntity("e1", "furnace", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("deposit");
		expect(ids).toContain("view_recipes");
		expect(ids).toContain("toggle_power");
		expect(ids).toContain("inspect");
	});

	it("belt returns rotate, remove, inspect, toggle", () => {
		const actions = getActionsForEntity("e1", "belt", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("rotate");
		expect(ids).toContain("remove");
		expect(ids).toContain("inspect");
		expect(ids).toContain("toggle");
	});

	it("lightning_rod returns inspect, repair, relocate", () => {
		const actions = getActionsForEntity("e1", "lightning_rod", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("inspect");
		expect(ids).toContain("repair");
		expect(ids).toContain("relocate");
	});

	it("turret returns target_priority, repair, ammo_status, deactivate", () => {
		const actions = getActionsForEntity("e1", "turret", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("target_priority");
		expect(ids).toContain("repair");
		expect(ids).toContain("ammo_status");
		expect(ids).toContain("deactivate");
	});

	it("enemy_bot returns attack, hack, inspect, flee", () => {
		const actions = getActionsForEntity("e1", "enemy_bot", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("attack");
		expect(ids).toContain("hack");
		expect(ids).toContain("inspect");
		expect(ids).toContain("flee");
	});

	it("friendly_bot returns command, switch_to, repair, inspect", () => {
		const actions = getActionsForEntity("e1", "friendly_bot", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("command");
		expect(ids).toContain("switch_to");
		expect(ids).toContain("repair");
		expect(ids).toContain("inspect");
	});

	it("otter returns talk, trade, quest_log", () => {
		const actions = getActionsForEntity("e1", "otter", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("talk");
		expect(ids).toContain("trade");
		expect(ids).toContain("quest_log");
	});

	it("wall returns inspect, reinforce, demolish", () => {
		const actions = getActionsForEntity("e1", "wall", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("inspect");
		expect(ids).toContain("reinforce");
		expect(ids).toContain("demolish");
	});

	it("wire returns inspect, reroute, cut", () => {
		const actions = getActionsForEntity("e1", "wire", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("inspect");
		expect(ids).toContain("reroute");
		expect(ids).toContain("cut");
	});

	it("building returns repair, power, upgrade, demolish, inspect", () => {
		const actions = getActionsForEntity("e1", "building", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("repair");
		expect(ids).toContain("power");
		expect(ids).toContain("upgrade");
		expect(ids).toContain("demolish");
		expect(ids).toContain("inspect");
	});

	it("unknown returns only inspect", () => {
		const actions = getActionsForEntity("e1", "unknown", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toEqual(["inspect"]);
	});

	it("each action has id, label, icon, and enabled properties", () => {
		const allCategories: EntityCategory[] = [
			"ore_deposit", "material_cube", "furnace", "belt",
			"lightning_rod", "turret", "enemy_bot", "friendly_bot",
			"otter", "wall", "wire", "building", "unknown",
		];
		for (const cat of allCategories) {
			const actions = getActionsForEntity("e1", cat, ps);
			for (const action of actions) {
				expect(action).toHaveProperty("id");
				expect(action).toHaveProperty("label");
				expect(action).toHaveProperty("icon");
				expect(action).toHaveProperty("enabled");
				expect(typeof action.id).toBe("string");
				expect(typeof action.label).toBe("string");
			}
		}
	});

	it("returns copies, not references to internal state", () => {
		const a = getActionsForEntity("e1", "furnace", ps);
		const b = getActionsForEntity("e1", "furnace", ps);
		a[0].label = "MUTATED";
		expect(b[0].label).not.toBe("MUTATED");
	});
});

// ---------------------------------------------------------------------------
// getActionsForEntity — player state affects enabled/disabled
// ---------------------------------------------------------------------------

describe("getActionsForEntity — player state", () => {
	it("ore_deposit harvest disabled when deposit is depleted", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ isDepleted: true });
		const actions = getActionsForEntity("e1", "ore_deposit", ps, es);
		const harvest = actions.find((a) => a.id === "harvest");
		expect(harvest?.enabled).toBe(false);
	});

	it("ore_deposit harvest disabled when player too far", () => {
		const ps = makePlayerState({ distanceToTarget: 50.0 });
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const harvest = actions.find((a) => a.id === "harvest");
		expect(harvest?.enabled).toBe(false);
	});

	it("ore_deposit harvest enabled when in range and not depleted", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		const es = makeEntityState({ isDepleted: false });
		const actions = getActionsForEntity("e1", "ore_deposit", ps, es);
		const harvest = actions.find((a) => a.id === "harvest");
		expect(harvest?.enabled).toBe(true);
	});

	it("material_cube grab disabled when already holding a cube", () => {
		const ps = makePlayerState({ isHoldingCube: true });
		const actions = getActionsForEntity("e1", "material_cube", ps);
		const grab = actions.find((a) => a.id === "grab");
		expect(grab?.enabled).toBe(false);
	});

	it("material_cube grab enabled when not holding a cube", () => {
		const ps = makePlayerState({ isHoldingCube: false, distanceToTarget: 1.0 });
		const actions = getActionsForEntity("e1", "material_cube", ps);
		const grab = actions.find((a) => a.id === "grab");
		expect(grab?.enabled).toBe(true);
	});

	it("furnace deposit disabled when not holding a cube", () => {
		const ps = makePlayerState({ isHoldingCube: false });
		const actions = getActionsForEntity("e1", "furnace", ps);
		const deposit = actions.find((a) => a.id === "deposit");
		expect(deposit?.enabled).toBe(false);
	});

	it("furnace deposit enabled when holding a cube and in range", () => {
		const ps = makePlayerState({ isHoldingCube: true, distanceToTarget: 2.0 });
		const actions = getActionsForEntity("e1", "furnace", ps);
		const deposit = actions.find((a) => a.id === "deposit");
		expect(deposit?.enabled).toBe(true);
	});

	it("enemy_bot hack disabled without hack module", () => {
		const ps = makePlayerState({ hasHackModule: false });
		const actions = getActionsForEntity("e1", "enemy_bot", ps);
		const hack = actions.find((a) => a.id === "hack");
		expect(hack?.enabled).toBe(false);
	});

	it("enemy_bot hack enabled with hack module", () => {
		const ps = makePlayerState({ hasHackModule: true });
		const actions = getActionsForEntity("e1", "enemy_bot", ps);
		const hack = actions.find((a) => a.id === "hack");
		expect(hack?.enabled).toBe(true);
	});

	it("friendly_bot repair disabled when entity at full health", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 1.0 });
		const actions = getActionsForEntity("e1", "friendly_bot", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(false);
	});

	it("friendly_bot repair enabled when entity damaged and in range", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 0.5 });
		const actions = getActionsForEntity("e1", "friendly_bot", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(true);
	});

	it("building repair disabled when building at full health", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 1.0 });
		const actions = getActionsForEntity("e1", "building", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(false);
	});

	it("building repair enabled when building is damaged", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		const es = makeEntityState({ healthPercent: 0.3 });
		const actions = getActionsForEntity("e1", "building", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getQuickAction
// ---------------------------------------------------------------------------

describe("getQuickAction", () => {
	it("ore_deposit returns harvest when in range and not depleted", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		const es = makeEntityState({ isDepleted: false, quantity: 50 });
		expect(getQuickAction("ore_deposit", ps, es)).toBe("harvest");
	});

	it("ore_deposit returns null when depleted", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		const es = makeEntityState({ isDepleted: true });
		expect(getQuickAction("ore_deposit", ps, es)).toBeNull();
	});

	it("ore_deposit returns null when quantity is 0", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		const es = makeEntityState({ quantity: 0 });
		expect(getQuickAction("ore_deposit", ps, es)).toBeNull();
	});

	it("ore_deposit returns null when out of range", () => {
		const ps = makePlayerState({ distanceToTarget: 50.0 });
		expect(getQuickAction("ore_deposit", ps)).toBeNull();
	});

	it("material_cube returns grab when not holding", () => {
		const ps = makePlayerState({ isHoldingCube: false, distanceToTarget: 1.0 });
		expect(getQuickAction("material_cube", ps)).toBe("grab");
	});

	it("material_cube returns null when already holding cube", () => {
		const ps = makePlayerState({ isHoldingCube: true, distanceToTarget: 1.0 });
		expect(getQuickAction("material_cube", ps)).toBeNull();
	});

	it("furnace returns deposit when holding cube and in range", () => {
		const ps = makePlayerState({ isHoldingCube: true, distanceToTarget: 2.0 });
		expect(getQuickAction("furnace", ps)).toBe("deposit");
	});

	it("furnace returns null when not holding cube", () => {
		const ps = makePlayerState({ isHoldingCube: false, distanceToTarget: 2.0 });
		expect(getQuickAction("furnace", ps)).toBeNull();
	});

	it("friendly_bot returns switch_to when in range", () => {
		const ps = makePlayerState({ distanceToTarget: 3.0 });
		expect(getQuickAction("friendly_bot", ps)).toBe("switch_to");
	});

	it("friendly_bot returns null when out of range", () => {
		const ps = makePlayerState({ distanceToTarget: 100.0 });
		expect(getQuickAction("friendly_bot", ps)).toBeNull();
	});

	it("enemy_bot always returns attack", () => {
		const ps = makePlayerState({ distanceToTarget: 10.0 });
		expect(getQuickAction("enemy_bot", ps)).toBe("attack");
	});

	it("otter returns talk when in range", () => {
		const ps = makePlayerState({ distanceToTarget: 2.0 });
		expect(getQuickAction("otter", ps)).toBe("talk");
	});

	it("belt returns null (no quick action)", () => {
		const ps = makePlayerState();
		expect(getQuickAction("belt", ps)).toBeNull();
	});

	it("building returns null (no quick action)", () => {
		const ps = makePlayerState();
		expect(getQuickAction("building", ps)).toBeNull();
	});

	it("unknown returns null (no quick action)", () => {
		const ps = makePlayerState();
		expect(getQuickAction("unknown", ps)).toBeNull();
	});

	it("wall returns null (no quick action)", () => {
		const ps = makePlayerState();
		expect(getQuickAction("wall", ps)).toBeNull();
	});

	it("wire returns null (no quick action)", () => {
		const ps = makePlayerState();
		expect(getQuickAction("wire", ps)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// executeAction
// ---------------------------------------------------------------------------

describe("executeAction", () => {
	it("returns success for valid enabled action", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("harvest", "ore-1", "ore_deposit", ps);
		expect(result.success).toBe(true);
		expect(result.message).toContain("Harvest");
	});

	it("returns sound event for harvest", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("harvest", "ore-1", "ore_deposit", ps);
		expect(result.soundEvent).toBe("harvest_start");
		expect(result.particleEvent).toBe("grind_sparks");
	});

	it("returns failure for unknown action", () => {
		const ps = makePlayerState();
		const result = executeAction("nonexistent", "e1", "ore_deposit", ps);
		expect(result.success).toBe(false);
		expect(result.message).toContain("Unknown action");
	});

	it("returns failure for disabled action", () => {
		const ps = makePlayerState({ isHoldingCube: true, distanceToTarget: 1.0 });
		const result = executeAction("grab", "cube-1", "material_cube", ps);
		expect(result.success).toBe(false);
		expect(result.message).toContain("disabled");
	});

	it("returns sound event for grab", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("grab", "cube-1", "material_cube", ps);
		expect(result.soundEvent).toBe("cube_grab");
	});

	it("returns sound and particle events for attack", () => {
		const ps = makePlayerState({ distanceToTarget: 5.0 });
		const result = executeAction("attack", "e1", "enemy_bot", ps);
		expect(result.soundEvent).toBe("weapon_fire");
		expect(result.particleEvent).toBe("muzzle_flash");
	});

	it("returns sound event for repair", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 0.5 });
		const result = executeAction("repair", "e1", "friendly_bot", ps, es);
		expect(result.soundEvent).toBe("repair_weld");
		expect(result.particleEvent).toBe("weld_sparks");
	});

	it("returns sound event for demolish", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("demolish", "w1", "wall", ps);
		expect(result.soundEvent).toBe("demolish_crash");
		expect(result.particleEvent).toBe("debris_burst");
	});

	it("returns sound event for toggle_power", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("toggle_power", "f1", "furnace", ps);
		expect(result.soundEvent).toBe("power_toggle");
	});

	it("returns sound event for talk", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("talk", "o1", "otter", ps);
		expect(result.soundEvent).toBe("otter_chirp");
	});

	it("returns sound event for cut wire", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("cut", "w1", "wire", ps);
		expect(result.soundEvent).toBe("wire_cut");
		expect(result.particleEvent).toBe("electric_spark");
	});

	it("returns default ui_click for unrecognized action ids", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("inspect", "e1", "unknown", ps);
		expect(result.soundEvent).toBe("ui_click");
	});

	it("includes entity ID in success message", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const result = executeAction("inspect", "my-entity-42", "unknown", ps);
		expect(result.message).toContain("my-entity-42");
	});
});

// ---------------------------------------------------------------------------
// registerCustomActions
// ---------------------------------------------------------------------------

describe("registerCustomActions", () => {
	it("adds custom actions to a category", () => {
		registerCustomActions("ore_deposit", [
			{ id: "analyze", label: "Analyze", icon: "\uD83D\uDD2C", enabled: true },
		]);
		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("analyze");
	});

	it("custom actions appear after default actions", () => {
		registerCustomActions("material_cube", [
			{ id: "weigh", label: "Weigh", icon: "\u2696", enabled: true },
		]);
		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "material_cube", ps);
		const lastAction = actions[actions.length - 1];
		expect(lastAction.id).toBe("weigh");
	});

	it("multiple registerCustomActions calls accumulate", () => {
		registerCustomActions("belt", [
			{ id: "lubricate", label: "Lubricate", icon: "\uD83D\uDCA7", enabled: true },
		]);
		registerCustomActions("belt", [
			{ id: "speed_test", label: "Speed Test", icon: "\u23F1", enabled: true },
		]);
		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "belt", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).toContain("lubricate");
		expect(ids).toContain("speed_test");
	});

	it("custom actions are copies (not live references)", () => {
		const custom = { id: "test", label: "Test", icon: "T", enabled: true };
		registerCustomActions("wall", [custom]);
		custom.label = "MUTATED";

		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "wall", ps);
		const testAction = actions.find((a) => a.id === "test");
		expect(testAction?.label).toBe("Test");
	});
});

// ---------------------------------------------------------------------------
// getInteractionRange
// ---------------------------------------------------------------------------

describe("getInteractionRange", () => {
	it("returns positive ranges for all categories", () => {
		const categories: EntityCategory[] = [
			"ore_deposit", "material_cube", "furnace", "belt",
			"lightning_rod", "turret", "enemy_bot", "friendly_bot",
			"otter", "wall", "wire", "building", "unknown",
		];
		for (const cat of categories) {
			expect(getInteractionRange(cat)).toBeGreaterThan(0);
		}
	});

	it("enemy_bot has the longest range", () => {
		expect(getInteractionRange("enemy_bot")).toBeGreaterThan(
			getInteractionRange("material_cube"),
		);
		expect(getInteractionRange("enemy_bot")).toBeGreaterThan(
			getInteractionRange("building"),
		);
	});
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe("reset", () => {
	it("clears custom actions", () => {
		registerCustomActions("ore_deposit", [
			{ id: "custom1", label: "Custom", icon: "C", enabled: true },
		]);

		reset();

		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const ids = actions.map((a) => a.id);
		expect(ids).not.toContain("custom1");
	});

	it("default actions still work after reset", () => {
		reset();
		const ps = makePlayerState();
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		expect(actions.length).toBeGreaterThan(0);
		expect(actions.map((a) => a.id)).toContain("harvest");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("getActionsForEntity with exact boundary distance enables actions", () => {
		const range = getInteractionRange("ore_deposit");
		const ps = makePlayerState({ distanceToTarget: range });
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const harvest = actions.find((a) => a.id === "harvest");
		expect(harvest?.enabled).toBe(true);
	});

	it("getActionsForEntity just beyond boundary distance disables harvest", () => {
		const range = getInteractionRange("ore_deposit");
		const ps = makePlayerState({ distanceToTarget: range + 0.001 });
		const actions = getActionsForEntity("e1", "ore_deposit", ps);
		const harvest = actions.find((a) => a.id === "harvest");
		expect(harvest?.enabled).toBe(false);
	});

	it("categorizeEntity with undefined traits and type returns unknown", () => {
		const cat = categorizeEntity("e1", { traits: undefined, type: undefined });
		expect(cat).toBe("unknown");
	});

	it("turret repair disabled at full health", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 1.0 });
		const actions = getActionsForEntity("e1", "turret", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(false);
	});

	it("turret repair enabled when damaged", () => {
		const ps = makePlayerState({ distanceToTarget: 1.0 });
		const es = makeEntityState({ healthPercent: 0.2 });
		const actions = getActionsForEntity("e1", "turret", ps, es);
		const repair = actions.find((a) => a.id === "repair");
		expect(repair?.enabled).toBe(true);
	});

	it("material_cube grab disabled when out of range even if not holding", () => {
		const ps = makePlayerState({ isHoldingCube: false, distanceToTarget: 100.0 });
		const actions = getActionsForEntity("e1", "material_cube", ps);
		const grab = actions.find((a) => a.id === "grab");
		expect(grab?.enabled).toBe(false);
	});

	it("furnace deposit disabled when holding cube but out of range", () => {
		const ps = makePlayerState({ isHoldingCube: true, distanceToTarget: 100.0 });
		const actions = getActionsForEntity("e1", "furnace", ps);
		const deposit = actions.find((a) => a.id === "deposit");
		expect(deposit?.enabled).toBe(false);
	});

	it("getQuickAction for material_cube returns null when out of range", () => {
		const ps = makePlayerState({ isHoldingCube: false, distanceToTarget: 100.0 });
		expect(getQuickAction("material_cube", ps)).toBeNull();
	});
});
