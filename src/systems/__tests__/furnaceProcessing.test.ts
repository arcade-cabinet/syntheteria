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
 */

import {
	_resetFurnaceState,
	createFurnace,
	getFurnaceState,
	insertCubeIntoFurnace,
} from "../furnace";
import {
	DEFAULT_RECIPES,
	type SmeltingRecipe,
	_resetSmeltingState,
	getSmeltingProgress,
	setFurnacePowered,
	startSmelting,
	updateFurnaceProcessing,
} from "../furnaceProcessing";

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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetFurnaceState();
	_resetSmeltingState();
});

// ---------------------------------------------------------------------------
// startSmelting -- initiating the process
// ---------------------------------------------------------------------------

describe("startSmelting", () => {
	it("starts smelting the first hopper item", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);

		const result = startSmelting(furnace.id);

		expect(result).toBe(true);
		expect(furnace.isProcessing).toBe(true);
		expect(furnace.currentItem).toBe("scrap_iron");
		expect(furnace.progress).toBe(0);
	});

	it("removes the item from the hopper queue", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron", "copper"]);

		startSmelting(furnace.id);

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

		startSmelting(furnace.id);
		const result = startSmelting(furnace.id);

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
			{ input: "gold_ore", output: "gold_bar", smeltTime: 20 },
		];
		const furnace = makeFurnaceWithHopper(["gold_ore"]);

		const result = startSmelting(furnace.id, customRecipes);

		expect(result).toBe(true);
		expect(furnace.currentItem).toBe("gold_ore");
	});
});

// ---------------------------------------------------------------------------
// updateFurnaceProcessing -- timer advancement
// ---------------------------------------------------------------------------

describe("updateFurnaceProcessing", () => {
	it("advances timer when powered", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		const result = updateFurnaceProcessing(furnace.id, 3);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(false);
		expect(furnace.progress).toBeCloseTo(3 / 10);
	});

	it("does NOT advance timer when unpowered", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		// Advance a bit while powered
		updateFurnaceProcessing(furnace.id, 3);
		const progressBefore = getSmeltingProgress(furnace.id);

		// Unpower and tick
		setFurnacePowered(furnace.id, false);
		const result = updateFurnaceProcessing(furnace.id, 5);

		expect(result).toEqual({ completed: false });
		// Progress should not have changed
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(progressBefore);
	});

	it("completes when timer reaches smeltTime", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		// scrap_iron recipe: smeltTime = 10
		const result = updateFurnaceProcessing(furnace.id, 10);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("iron_plate");
	});

	it("completes when timer exceeds smeltTime", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		// copper recipe: smeltTime = 8
		const result = updateFurnaceProcessing(furnace.id, 12);

		expect(result).not.toBeNull();
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("wire_bundle");
	});

	it("returns output position offset from furnace position", () => {
		const furnace = createFurnace(makePosition(10, 0, 20));
		furnace.isPowered = true;
		insertCubeIntoFurnace(furnace.id, "cube_1", "scrap_iron");
		startSmelting(furnace.id);

		const result = updateFurnaceProcessing(furnace.id, 10);

		expect(result!.outputPosition).toEqual({
			x: 10,
			y: 1.0, // furnace.y + 1.0
			z: 21.5, // furnace.z + 1.5
		});
	});

	it("resets furnace state after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		updateFurnaceProcessing(furnace.id, 10);

		expect(furnace.isProcessing).toBe(false);
		expect(furnace.currentItem).toBeNull();
		expect(furnace.progress).toBe(0);
	});

	it("returns null for unknown furnace ID", () => {
		const result = updateFurnaceProcessing("nonexistent", 1);
		expect(result).toBeNull();
	});

	it("returns null when furnace is not processing", () => {
		const furnace = createFurnace(makePosition());
		furnace.isPowered = true;

		const result = updateFurnaceProcessing(furnace.id, 1);

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
		startSmelting(furnace.id);

		// At 9.99 seconds, not yet complete
		const r1 = updateFurnaceProcessing(furnace.id, 9.99);
		expect(r1!.completed).toBe(false);

		// At 0.01 more (total 10.0), should complete
		const r2 = updateFurnaceProcessing(furnace.id, 0.01);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("iron_plate");
	});

	it("copper takes 8 seconds", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		const r1 = updateFurnaceProcessing(furnace.id, 7.99);
		expect(r1!.completed).toBe(false);

		const r2 = updateFurnaceProcessing(furnace.id, 0.01);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("wire_bundle");
	});

	it("silicon takes 15 seconds", () => {
		const furnace = makeFurnaceWithHopper(["silicon"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		const r1 = updateFurnaceProcessing(furnace.id, 14.99);
		expect(r1!.completed).toBe(false);

		const r2 = updateFurnaceProcessing(furnace.id, 0.01);
		expect(r2!.completed).toBe(true);
		expect(r2!.outputMaterial).toBe("circuit_board");
	});
});

// ---------------------------------------------------------------------------
// Auto-start next hopper item
// ---------------------------------------------------------------------------

describe("auto-start next hopper item", () => {
	it("auto-starts next item after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron", "copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		// Complete first item (scrap_iron, 10s)
		const result = updateFurnaceProcessing(furnace.id, 10);

		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("iron_plate");

		// Furnace should now be processing copper
		expect(furnace.isProcessing).toBe(true);
		expect(furnace.currentItem).toBe("copper");
		expect(furnace.hopperQueue).toEqual([]);
	});

	it("does not auto-start when hopper is empty after completion", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		updateFurnaceProcessing(furnace.id, 10);

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
		startSmelting(furnace.id);

		// Complete scrap_iron (10s)
		const r1 = updateFurnaceProcessing(furnace.id, 10);
		expect(r1!.outputMaterial).toBe("iron_plate");
		expect(furnace.currentItem).toBe("copper");

		// Complete copper (8s)
		const r2 = updateFurnaceProcessing(furnace.id, 8);
		expect(r2!.outputMaterial).toBe("wire_bundle");
		expect(furnace.currentItem).toBe("silicon");

		// Complete silicon (15s)
		const r3 = updateFurnaceProcessing(furnace.id, 15);
		expect(r3!.outputMaterial).toBe("circuit_board");
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
		startSmelting(furnace.id);

		updateFurnaceProcessing(furnace.id, 5);

		// 5 / 10 = 0.5
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.5);
	});

	it("returns 0 after smelting completes (furnace resets)", () => {
		const furnace = makeFurnaceWithHopper(["copper"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		updateFurnaceProcessing(furnace.id, 8);

		// After completion with no more hopper items, progress resets
		expect(getSmeltingProgress(furnace.id)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// DEFAULT_RECIPES constant
// ---------------------------------------------------------------------------

describe("DEFAULT_RECIPES", () => {
	it("contains scrap_iron -> iron_plate recipe", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "scrap_iron");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("iron_plate");
		expect(recipe!.smeltTime).toBe(10);
	});

	it("contains copper -> wire_bundle recipe", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "copper");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("wire_bundle");
		expect(recipe!.smeltTime).toBe(8);
	});

	it("contains silicon -> circuit_board recipe", () => {
		const recipe = DEFAULT_RECIPES.find((r) => r.input === "silicon");
		expect(recipe).toBeDefined();
		expect(recipe!.output).toBe("circuit_board");
		expect(recipe!.smeltTime).toBe(15);
	});
});

// ---------------------------------------------------------------------------
// Power interaction with timer
// ---------------------------------------------------------------------------

describe("power interaction with timer", () => {
	it("pauses and resumes timer across power cycles", () => {
		const furnace = makeFurnaceWithHopper(["scrap_iron"]);
		setFurnacePowered(furnace.id, true);
		startSmelting(furnace.id);

		// Advance 3s while powered
		updateFurnaceProcessing(furnace.id, 3);
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.3);

		// Unpower — tick 5s — should not advance
		setFurnacePowered(furnace.id, false);
		updateFurnaceProcessing(furnace.id, 5);
		expect(getSmeltingProgress(furnace.id)).toBeCloseTo(0.3);

		// Re-power — advance remaining 7s
		setFurnacePowered(furnace.id, true);
		const result = updateFurnaceProcessing(furnace.id, 7);
		expect(result!.completed).toBe(true);
		expect(result!.outputMaterial).toBe("iron_plate");
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
		startSmelting(furnace.id);
		updateFurnaceProcessing(furnace.id, 3);

		_resetSmeltingState();

		// Processing state is gone — update returns null
		const result = updateFurnaceProcessing(furnace.id, 1);
		expect(result).toBeNull();
	});
});
