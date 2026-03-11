/**
 * Unit tests for the Furnace smelting timer and output system (US-015).
 *
 * Tests cover:
 * - Timer advances when powered
 * - Timer does NOT advance when unpowered
 * - Completion creates output cube at furnace output position
 * - Output type matches config/furnace.json recipe lookup
 * - Next hopper item auto-starts after output
 * - Smelt time matches config recipe
 * - setFurnacePowered / getSmeltingProgress helpers
 * - Edge cases: unknown furnace, empty hopper, no matching recipe
 * - Module state reset between tests
 * - Tech gating: isTierUnlocked, getAvailableRecipes, notifyNewlyUnlockedRecipes
 */

import {
	_resetFurnaceState,
	createFurnace,
	getFurnaceState,
	insertCubeIntoFurnace,
} from "../furnace";
import {
	ALL_RECIPES,
	DEFAULT_RECIPES,
	type SmeltingRecipe,
	_resetSmeltingState,
	getAvailableRecipes,
	getSmeltingProgress,
	isTierUnlocked,
	notifyNewlyUnlockedRecipes,
	setFurnacePowered,
	startSmelting,
	updateFurnaceProcessing,
} from "../furnaceProcessing";
import { reset as resetEventBus, subscribe } from "../eventBus";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePosition(
	x = 0,
	y = 0,
	z = 0,
): { x: number; y: number; z: number } {
	return { x, y, z };
}

/** Create a powered furnace with items in the hopper. */
function makeFurnaceWithHopper(materials: string[]) {
	const furnace = createFurnace(makePosition(10, 0, 20));
	furnace.isPowered = true;
	for (const mat of materials) {
		insertCubeIntoFurnace(furnace.id, `cube_${mat}`, mat);
	}
	return furnace;
}

/**
 * A full tech set that unlocks all furnace tiers.
 * Includes at least one tech from every tier 1-5.
 */
const ALL_TIER_TECHS = new Set([
	"scrap_processing",   // tier 1
	"automated_mining",   // tier 2
	"turret_defense",     // tier 3
	"titanium_processing", // tier 4
	"matter_compression", // tier 5
]);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetFurnaceState();
	_resetSmeltingState();
	resetEventBus();
});

// ---------------------------------------------------------------------------
// startSmelting -- initiating the process
// ---------------------------------------------------------------------------

describe("startSmelting", () => {
	it("starts smelting the first hopper item (tier-1 recipe, no tech needed)", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);

		const result = startSmelting(furnace.id);

		expect(result).toBe(true);
		expect(furnace.isProcessing).toBe(true);
		expect(furnace.currentItem).toBe("scrap_iron");
		expect(furnace.progress).toBe(0);
	});

	it("removes the item from the hopper queue", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron", "copper"]);

		startSmelting(furnace.id, ALL_RECIPES);

		expect(furnace.hopperQueue).toEqual(["copper"]);
	});

	it("returns false when hopper is empty", () => {
		const furnace = createFurnace(makePosition());

		const result = startSmelting(furnace.id);

		expect(result).toBe(false);
		expect(furnace.isProcessing).toBe(false);
	});

	it("returns false for unknown furnace ID", () => {
		const result = startSmelting("nonexistent");
		expect(result).toBe(false);
	});

	it("returns false when already processing", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron", "copper"]);

		startSmelting(furnace.id, ALL_RECIPES);
		const result = startSmelting(furnace.id, ALL_RECIPES);

		expect(result).toBe(false);
		// Second item should still be in hopper
		expect(furnace.hopperQueue).toEqual(["copper"]);
	});

	it("returns false and restores hopper when no recipe matches", () => {
		const furnace = makeFurnaceWithHopper(["unknown_material"]);

		const result = startSmelting(furnace.id);

		expect(result).toBe(false);
		expect(furnace.hopperQueue).toEqual(["unknown_material"]);
		expect(furnace.isProcessing).toBe(false);
	});

	it("uses custom recipes when provided", () => {
		const customRecipes: SmeltingRecipe[] = [
			{ input: "gold_ore", output: "gold_bar", smeltTime: 20, furnaceTier: 1 },
		];
		const furnace = makeFurnaceWithHopper(["gold_ore"]);

		const result = startSmelting(furnace.id, customRecipes);

		expect(result).toBe(true);
		expect(furnace.currentItem).toBe("gold_ore");
	});

	it("returns false for a locked-tier recipe when DEFAULT_RECIPES is used (no tech)", () => {
		// copper is tier-2, requires tech tier 2 — DEFAULT_RECIPES has no copper recipe
		const furnace = makeFurnaceWithHopper(["copper"]);

		const result = startSmelting(furnace.id); // uses DEFAULT_RECIPES

		expect(result).toBe(false);
		expect(furnace.hopperQueue).toEqual(["copper"]);
		expect(furnace.isProcessing).toBe(false);
	});

	it("succeeds for a tier-2 recipe when ALL_RECIPES is used", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);

		const result = startSmelting(furnace.id, ALL_RECIPES);

		expect(result).toBe(true);
		expect(furnace.currentItem).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// updateFurnaceProcessing -- timer advancement
// ---------------------------------------------------------------------------

describe("updateFurnaceProcessing", () => {
	it("advances timer when powered", () => {
		const recipe = ALL_RECIPES.find((r) => r.input === "scrap_iron")!;
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		const result = updateFurnaceProcessing(furnace.id, 3, ALL_RECIPES);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(false);
		expect(furnace.progress).toBeCloseTo(3 / recipe.smeltTime);
	});

	it("does NOT advance timer when unpowered", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// Advance a bit while powered
		updateFurnaceProcessing(furnace.id, 3, ALL_RECIPES);
		const progressBefore = getSmeltingProgress(furnace.id);

		// Unpower and tick
		setFurnacePowered(furnace.id, false);
		const result = updateFurnaceProcessing(furnace.id, 5, ALL_RECIPES);

		expect(result).toEqual({ completed: false });
		// Progress should not have changed
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(progressBefore);
	});

	it("completes when timer reaches smeltTime", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// scrap_iron recipe: smeltTime = 10, output = tool_grabber_t1
		const result = updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("tool_grabber_t1");
	});

	it("completes when timer exceeds smeltTime", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// copper recipe: smeltTime = 12, output = component_wire_bundle
		const result = updateFurnaceProcessing(furnace.id, 20, ALL_RECIPES);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("component_wire_bundle");
	});

	it("returns output position offset from furnace position", () => {
		const furnace = createFurnace(makePosition(10, 0, 20));
		furnace.isPowered = true;
		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");
		startSmelting(furnace.id, ALL_RECIPES);

		const result = updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);

		expect(result!.outputPosition).toEqual({
			x: 10,
			y: 1.0, // furnace.y + 1.0
			z: 21.5, // furnace.z + 1.5
		});
	});

	it("resets furnace state after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);

		expect(furnace.isProcessing).toBe(false);
		expect(furnace.currentItem).toBeNull();
		expect(furnace.progress).toBe(0);
	});

	it("returns null for unknown furnace ID", () => {
		const result = updateFurnaceProcessing("nonexistent", 1, ALL_RECIPES);
		expect(result).toBeNull();
	});

	it("returns null when furnace is not processing", () => {
		const furnace = createFurnace(makePosition());
		furnace.isPowered = true;

		const result = updateFurnaceProcessing(furnace.id, 1, ALL_RECIPES);

		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Smelt time matches config recipe
// ---------------------------------------------------------------------------

describe("smelt time matches config", () => {
	it("scrap_iron takes 10 seconds", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// At 9.99 seconds, not yet complete
		const r1 = updateFurnaceProcessing(furnace.id, 9.99, ALL_RECIPES);
		expect(r1!.completed).toBe(false);

		// At 0.01 more (total 10.0), should complete
		const r2 = updateFurnaceProcessing(furnace.id, 0.01, ALL_RECIPES);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("tool_grabber_t1");
	});

	it("copper takes 12 seconds", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		const r1 = updateFurnaceProcessing(furnace.id, 11.99, ALL_RECIPES);
		expect(r1!.completed).toBe(false);

		const r2 = updateFurnaceProcessing(furnace.id, 0.01, ALL_RECIPES);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("component_wire_bundle");
	});

	it("silicon takes 25 seconds", () => {
		const furnace = makeFurnaceWithHopper(["silicon"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		const r1 = updateFurnaceProcessing(furnace.id, 24.99, ALL_RECIPES);
		expect(r1!.completed).toBe(false);

		const r2 = updateFurnaceProcessing(furnace.id, 0.01, ALL_RECIPES);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("component_circuit_board");
	});
});

// ---------------------------------------------------------------------------
// Auto-start next hopper item
// ---------------------------------------------------------------------------

describe("auto-start next hopper item", () => {
	it("auto-starts next item after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron", "copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// Complete first item (scrap_iron, 10s)
		const result = updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);

		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("tool_grabber_t1");

		// Furnace should now be processing copper
		expect(furnace.isProcessing).toBe(true);
		expect(furnace.currentItem).toBe("copper");
		expect(furnace.hopperQueue).toEqual([]);
	});

	it("does not auto-start when hopper is empty after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);

		expect(furnace.isProcessing).toBe(false);
		expect(furnace.currentItem).toBeNull();
	});

	it("processes a full queue sequentially", () => {
		const furnace = makeFurnaceWithHopper([
			"scrap_iron",
			"copper",
			"silicon",
		]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// Complete scrap_iron (10s)
		const r1 = updateFurnaceProcessing(furnace.id, 10, ALL_RECIPES);
		expect(r1!.outputMaterial).toBe("tool_grabber_t1");
		expect(furnace.currentItem).toBe("copper");

		// Complete copper (12s)
		const r2 = updateFurnaceProcessing(furnace.id, 12, ALL_RECIPES);
		expect(r2!.outputMaterial).toBe("component_wire_bundle");
		expect(furnace.currentItem).toBe("silicon");

		// Complete silicon (25s)
		const r3 = updateFurnaceProcessing(furnace.id, 25, ALL_RECIPES);
		expect(r3!.outputMaterial).toBe("component_circuit_board");
		expect(furnace.isProcessing).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// setFurnacePowered
// ---------------------------------------------------------------------------

describe("setFurnacePowered", () => {
	it("sets furnace to powered", () => {
		const furnace = createFurnace(makePosition());

		setFurnacePowered(furnace.id, true);

		expect(furnace.isPowered).toBe(true);
	});

	it("sets furnace to unpowered", () => {
		const furnace = createFurnace(makePosition());
		furnace.isPowered = true;

		setFurnacePowered(furnace.id, false);

		expect(furnace.isPowered).toBe(false);
	});

	it("does not crash for unknown furnace ID", () => {
		expect(() => setFurnacePowered("nonexistent", true)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// getSmeltingProgress
// ---------------------------------------------------------------------------

describe("getSmeltingProgress", () => {
	it("returns 0 when furnace is not processing", () => {
		const furnace = createFurnace(makePosition());

		expect(getSmeltingProgress(furnace.id)).toBe(0);
	});

	it("returns 0 for unknown furnace ID", () => {
		expect(getSmeltingProgress("nonexistent")).toBe(0);
	});

	it("returns correct progress ratio", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		updateFurnaceProcessing(furnace.id, 5, ALL_RECIPES);

		// 5 / 10 = 0.5
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.5);
	});

	it("returns 0 after smelting completes (furnace resets)", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		updateFurnaceProcessing(furnace.id, 12, ALL_RECIPES);

		// After completion with no more hopper items, progress resets
		expect(getSmeltingProgress(furnace.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// DEFAULT_RECIPES constant (tier-1 only, no tech required)
// ---------------------------------------------------------------------------

describe("DEFAULT_RECIPES", () => {
	it("contains scrap_iron -> tool_grabber_t1 recipe", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "scrap_iron");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("tool_grabber_t1");
		expect(recipe!.smeltTime).toBe(10);
	});

	it("does NOT contain copper recipe (tier-2, requires tech)", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "copper");
		expect(recipe).toBeUndefined();
	});

	it("does NOT contain silicon recipe (tier-3, requires tech)", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "silicon");
		expect(recipe).toBeUndefined();
	});

	it("does NOT contain titanium recipe (tier-4, requires tech)", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "titanium");
		expect(recipe).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// ALL_RECIPES constant (all tiers, no filtering)
// ---------------------------------------------------------------------------

describe("ALL_RECIPES", () => {
	it("contains scrap_iron -> tool_grabber_t1 recipe", () => {
		const recipe = ALL_RECIPES.find((r) => r.input === "scrap_iron");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("tool_grabber_t1");
		expect(recipe!.smeltTime).toBe(10);
	});

	it("contains copper -> component_wire_bundle recipe", () => {
		const recipe = ALL_RECIPES.find((r) => r.input === "copper");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("component_wire_bundle");
		expect(recipe!.smeltTime).toBe(12);
	});

	it("contains silicon -> component_circuit_board recipe", () => {
		const recipe = ALL_RECIPES.find((r) => r.input === "silicon");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("component_circuit_board");
		expect(recipe!.smeltTime).toBe(25);
	});

	it("contains furnaceTier on every recipe", () => {
		for (const r of ALL_RECIPES) {
			expect(r.furnaceTier).toBeGreaterThanOrEqual(1);
		}
	});
});

// ---------------------------------------------------------------------------
// Power interaction with timer
// ---------------------------------------------------------------------------

describe("power interaction with timer", () => {
	it("pauses and resumes timer across power cycles", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);

		// Advance 3s while powered
		updateFurnaceProcessing(furnace.id, 3, ALL_RECIPES);
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.3);

		// Unpower — tick 5s — should not advance
		setFurnacePowered(furnace.id, false);
		updateFurnaceProcessing(furnace.id, 5, ALL_RECIPES);
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.3);

		// Re-power — advance remaining 7s
		setFurnacePowered(furnace.id, true);
		const result = updateFurnaceProcessing(furnace.id, 7, ALL_RECIPES);
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("tool_grabber_t1");
	});

	it("furnace state reflects powered status via getFurnaceState", () => {
		const furnace = createFurnace(makePosition());

		setFurnacePowered(furnace.id, true);
		const state1 = getFurnaceState(furnace.id);
		expect(state1!.isPowered).toBe(true);

		setFurnacePowered(furnace.id, false);
		const state2 = getFurnaceState(furnace.id);
		expect(state2!.isPowered).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// _resetSmeltingState
// ---------------------------------------------------------------------------

describe("_resetSmeltingState", () => {
	it("clears all processing states", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id, ALL_RECIPES);
		updateFurnaceProcessing(furnace.id, 3, ALL_RECIPES);

		_resetSmeltingState();

		// Processing state is gone — update returns null
		const result = updateFurnaceProcessing(furnace.id, 1, ALL_RECIPES);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// isTierUnlocked — pure tech gating helper
// ---------------------------------------------------------------------------

describe("isTierUnlocked", () => {
	it("always returns true for techRequired === 0", () => {
		expect(isTierUnlocked(0, new Set())).toBe(true);
		expect(isTierUnlocked(0, [])).toBe(true);
	});

	it("returns false when no techs researched and techRequired > 0", () => {
		expect(isTierUnlocked(1, new Set())).toBe(false);
		expect(isTierUnlocked(2, [])).toBe(false);
	});

	it("returns true when a researched tech matches exact required tier", () => {
		// scrap_processing is tier 1
		expect(isTierUnlocked(1, new Set(["scrap_processing"]))).toBe(true);
		// automated_mining is tier 2
		expect(isTierUnlocked(2, new Set(["automated_mining"]))).toBe(true);
	});

	it("returns true when a researched tech exceeds required tier", () => {
		// turret_defense is tier 3 — satisfies techRequired 2
		expect(isTierUnlocked(2, new Set(["turret_defense"]))).toBe(true);
	});

	it("returns false when researched tech is below required tier", () => {
		// scrap_processing is tier 1 — does NOT satisfy techRequired 2
		expect(isTierUnlocked(2, new Set(["scrap_processing"]))).toBe(false);
	});

	it("returns false for unknown tech IDs", () => {
		expect(isTierUnlocked(2, new Set(["not_a_real_tech"]))).toBe(false);
	});

	it("accepts an array of tech IDs as well as a Set", () => {
		expect(isTierUnlocked(2, ["automated_mining"])).toBe(true);
		expect(isTierUnlocked(2, ["scrap_processing"])).toBe(false);
	});

	it("returns true when one of multiple techs satisfies the requirement", () => {
		// Mix of tier 1 and tier 2 — should satisfy techRequired 2
		expect(
			isTierUnlocked(2, new Set(["scrap_processing", "automated_mining"])),
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getAvailableRecipes — tech-gated recipe filter
// ---------------------------------------------------------------------------

describe("getAvailableRecipes", () => {
	it("returns only tier-1 recipes when no techs researched", () => {
		const recipes = getAvailableRecipes([]);
		const inputs = recipes.map((r) => r.input);
		expect(inputs).toContain("scrap_iron");
		expect(inputs).not.toContain("copper");
		expect(inputs).not.toContain("silicon");
		expect(inputs).not.toContain("titanium");
		expect(inputs).not.toContain("rare_earth");
	});

	it("includes tier-2 recipes when a tier-2 tech is researched", () => {
		const recipes = getAvailableRecipes(new Set(["automated_mining"]));
		const inputs = recipes.map((r) => r.input);
		expect(inputs).toContain("scrap_iron"); // tier 1
		expect(inputs).toContain("copper"); // tier 2
	});

	it("still excludes higher tiers when only tier-2 tech researched", () => {
		const recipes = getAvailableRecipes(new Set(["automated_mining"]));
		const inputs = recipes.map((r) => r.input);
		expect(inputs).not.toContain("titanium"); // tier 4
		expect(inputs).not.toContain("rare_earth"); // tier 5
	});

	it("unlocks all tiers when full tech set provided", () => {
		const recipes = getAvailableRecipes(ALL_TIER_TECHS);
		const inputs = recipes.map((r) => r.input);
		expect(inputs).toContain("scrap_iron");
		expect(inputs).toContain("copper");
		expect(inputs).toContain("silicon");
		expect(inputs).toContain("titanium");
		expect(inputs).toContain("rare_earth");
	});

	it("deduplicates by input material (first tier occurrence wins)", () => {
		const recipes = getAvailableRecipes(ALL_TIER_TECHS);
		const inputs = recipes.map((r) => r.input);
		const uniqueInputs = new Set(inputs);
		expect(inputs.length).toBe(uniqueInputs.size);
	});

	it("defaults to empty research (no techs) when called with no argument", () => {
		const recipes = getAvailableRecipes();
		const inputs = recipes.map((r) => r.input);
		expect(inputs).toContain("scrap_iron");
		expect(inputs).not.toContain("copper");
	});

	it("returns recipes with furnaceTier populated", () => {
		const recipes = getAvailableRecipes(ALL_TIER_TECHS);
		for (const r of recipes) {
			expect(r.furnaceTier).toBeGreaterThanOrEqual(1);
		}
	});
});

// ---------------------------------------------------------------------------
// notifyNewlyUnlockedRecipes — event emission on tier unlock
// ---------------------------------------------------------------------------

describe("notifyNewlyUnlockedRecipes", () => {
	it("emits recipe_unlocked when a new tier becomes available", () => {
		const events: Array<{ furnaceTier: number; recipeIds: string[] }> = [];
		subscribe("recipe_unlocked", (e) => {
			events.push({ furnaceTier: e.furnaceTier, recipeIds: e.recipeIds });
		});

		// Before: no techs. After: tier-2 tech unlocked
		notifyNewlyUnlockedRecipes([], ["automated_mining"], 42);

		expect(events.length).toBeGreaterThan(0);
		const tier2Event = events.find((e) => e.furnaceTier === 2);
		expect(tier2Event).toBeDefined();
		expect(tier2Event!.recipeIds.length).toBeGreaterThan(0);
	});

	it("does NOT emit an event for tier 1 (always unlocked, techRequired 0)", () => {
		const events: Array<{ furnaceTier: number }> = [];
		subscribe("recipe_unlocked", (e) => {
			events.push({ furnaceTier: e.furnaceTier });
		});

		notifyNewlyUnlockedRecipes([], ["scrap_processing"], 1);

		const tier1Event = events.find((e) => e.furnaceTier === 1);
		expect(tier1Event).toBeUndefined();
	});

	it("does NOT emit if the tier was already unlocked before", () => {
		const events: Array<{ furnaceTier: number }> = [];
		subscribe("recipe_unlocked", (e) => {
			events.push({ furnaceTier: e.furnaceTier });
		});

		// Both before and after have a tier-2 tech
		notifyNewlyUnlockedRecipes(
			["automated_mining"],
			["automated_mining", "outpost_construction"],
			1,
		);

		// No new tier 2 event — it was already unlocked
		const tier2Events = events.filter((e) => e.furnaceTier === 2);
		expect(tier2Events.length).toBe(0);
	});

	it("emits multiple tier events when multiple tiers unlock simultaneously", () => {
		const unlockedTiers: number[] = [];
		subscribe("recipe_unlocked", (e) => {
			unlockedTiers.push(e.furnaceTier);
		});

		// Jump from nothing to tier 4 tech — should unlock tiers 2, 3, and 4
		notifyNewlyUnlockedRecipes([], ["titanium_processing"], 1);

		expect(unlockedTiers).toContain(2);
		expect(unlockedTiers).toContain(3);
		expect(unlockedTiers).toContain(4);
	});

	it("includes correct recipeIds in the event", () => {
		let capturedIds: string[] = [];
		subscribe("recipe_unlocked", (e) => {
			if (e.furnaceTier === 4) {
				capturedIds = e.recipeIds;
			}
		});

		notifyNewlyUnlockedRecipes([], ["titanium_processing"], 1);

		// Tier 4 in furnace.json has: plasma_cutter, defense_turret, etc.
		expect(capturedIds.length).toBeGreaterThan(0);
		expect(capturedIds).toContain("plasma_cutter");
	});

	it("passes tick through to the event payload", () => {
		let capturedTick = -1;
		subscribe("recipe_unlocked", (e) => {
			capturedTick = e.tick;
		});

		notifyNewlyUnlockedRecipes([], ["automated_mining"], 99);

		expect(capturedTick).toBe(99);
	});
});

// ---------------------------------------------------------------------------
// Tech-gated startSmelting integration
// ---------------------------------------------------------------------------

describe("tech-gated startSmelting integration", () => {
	it("tier-2 material (copper) blocked with no-tech recipe list", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		const noTechRecipes = getAvailableRecipes([]);

		const started = startSmelting(furnace.id, noTechRecipes);

		expect(started).toBe(false);
		expect(furnace.hopperQueue).toEqual(["copper"]);
	});

	it("tier-2 material (copper) allowed when tier-2 tech researched", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		const unlockedRecipes = getAvailableRecipes(["automated_mining"]);

		const started = startSmelting(furnace.id, unlockedRecipes);

		expect(started).toBe(true);
		expect(furnace.currentItem).toBe("copper");
	});

	it("tier-4 material (titanium) blocked until tier-3+ tech researched (techRequired: 3)", () => {
		const furnace = makeFurnaceWithHopper(["titanium"]);

		// furnace tier 4 has techRequired: 3 — tier-2 tech is insufficient
		const tier2Recipes = getAvailableRecipes(["automated_mining"]);
		expect(startSmelting(furnace.id, tier2Recipes)).toBe(false);
		expect(furnace.hopperQueue).toEqual(["titanium"]);

		// tier-3 tech satisfies techRequired: 3 → tier-4 furnace unlocked
		const tier3Recipes = getAvailableRecipes([
			"automated_mining",
			"turret_defense",
		]);
		expect(startSmelting(furnace.id, tier3Recipes)).toBe(true);
		expect(furnace.currentItem).toBe("titanium");
	});
});
