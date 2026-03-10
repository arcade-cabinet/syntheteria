/**
 * Unit tests for the crafting system.
 *
 * Tests cover:
 * - Recipe management (get, register, getAllRecipes)
 * - Starting crafts: validation, input consumption, job creation
 * - Proximity checks: out of range, no positions registered
 * - Machine busy: cannot start two jobs on same machine
 * - craftingSystem tick: progress, completion, output delivery
 * - Multiple machines running concurrently
 * - Cancel craft: job removal without refund
 * - Queries: getActiveJobs, getJobForMachine, getActiveJobCount
 * - Reset clears all state
 */

// We import inventorySystem functions directly — no mock needed since
// inventorySystem is a sibling module with its own module-level state.

import {
	_resetInventoryState,
	addItem,
	createInventory,
	getItemCount,
} from "../inventorySystem";

import {
	_resetCraftingState,
	cancelCraft,
	craftingSystem,
	getActiveJobCount,
	getActiveJobs,
	getAllRecipes,
	getJobForMachine,
	getJobsForMachine,
	getRecipe,
	registerBotPosition,
	registerMachinePosition,
	registerRecipe,
	startCraft,
} from "../craftingSystem";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	_resetInventoryState();
	_resetCraftingState();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Give a bot the inputs needed for the "arm_assembly" recipe. */
function giveArmInputs(botId: string) {
	addItem(botId, "scrapMetal", 5);
}

/** Give a bot the inputs for the "wire_bundle" recipe. */
function giveWireInputs(botId: string) {
	addItem(botId, "copper", 1);
}

/** Place bot and machine close together (within range). */
function placeNear(botId: string, machineId: string) {
	registerBotPosition(botId, { x: 0, y: 0, z: 0 });
	registerMachinePosition(machineId, { x: 1, y: 0, z: 0 });
}

/** Place bot far from machine (out of range). */
function placeFar(botId: string, machineId: string) {
	registerBotPosition(botId, { x: 0, y: 0, z: 0 });
	registerMachinePosition(machineId, { x: 100, y: 0, z: 0 });
}

// ---------------------------------------------------------------------------
// Recipe management
// ---------------------------------------------------------------------------

describe("recipe management", () => {
	it("has default recipes loaded", () => {
		const all = getAllRecipes();
		expect(all.length).toBeGreaterThanOrEqual(6);
	});

	it("getRecipe returns a recipe by ID", () => {
		const recipe = getRecipe("arm_assembly");
		expect(recipe).toBeDefined();
		expect(recipe!.name).toBe("Arm Assembly");
		expect(recipe!.inputs).toEqual([{ itemId: "scrapMetal", count: 5 }]);
		expect(recipe!.outputItemId).toBe("grabber");
		expect(recipe!.craftTicks).toBe(6);
	});

	it("getRecipe returns undefined for unknown ID", () => {
		expect(getRecipe("nonexistent")).toBeUndefined();
	});

	it("registerRecipe adds a custom recipe", () => {
		registerRecipe({
			id: "custom_thing",
			name: "Custom Thing",
			inputs: [{ itemId: "iron", count: 1 }],
			outputItemId: "ironPlate",
			outputCount: 2,
			craftTicks: 3,
		});
		expect(getRecipe("custom_thing")).toBeDefined();
	});

	it("registerRecipe overrides existing recipe", () => {
		registerRecipe({
			id: "arm_assembly",
			name: "Arm Assembly v2",
			inputs: [{ itemId: "iron", count: 1 }],
			outputItemId: "grabber",
			outputCount: 1,
			craftTicks: 2,
		});
		expect(getRecipe("arm_assembly")!.name).toBe("Arm Assembly v2");
		expect(getRecipe("arm_assembly")!.craftTicks).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// startCraft — success
// ---------------------------------------------------------------------------

describe("startCraft — success", () => {
	it("starts a crafting job and consumes inputs", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		placeNear("bot-1", "machine-1");

		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(true);
		expect(result.jobId).toBeDefined();
		expect(getItemCount("bot-1", "scrapMetal")).toBe(0);
	});

	it("creates a job with correct tick count", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		placeNear("bot-1", "machine-1");

		startCraft("bot-1", "machine-1", "arm_assembly", 10);
		const job = getJobForMachine("machine-1");
		expect(job).not.toBeNull();
		expect(job!.ticksRemaining).toBe(6);
		expect(job!.totalTicks).toBe(6);
		expect(job!.progress).toBe(0);
	});

	it("works without registered positions (skip proximity check)", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		// No positions registered — should still work
		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// startCraft — validation failures
// ---------------------------------------------------------------------------

describe("startCraft — validation", () => {
	it("fails for unknown recipe", () => {
		createInventory("bot-1");
		placeNear("bot-1", "machine-1");
		const result = startCraft("bot-1", "machine-1", "fake_recipe", 0);
		expect(result.success).toBe(false);
		expect(result.reason).toBe("unknown_recipe");
	});

	it("fails when bot is out of range", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		placeFar("bot-1", "machine-1");

		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(false);
		expect(result.reason).toBe("out_of_range");
	});

	it("fails when bot has insufficient inputs", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 2); // need 5
		placeNear("bot-1", "machine-1");

		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(false);
		expect(result.reason).toBe("missing_inputs");
	});

	it("does not consume inputs on failure", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 2); // insufficient
		placeNear("bot-1", "machine-1");

		startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(getItemCount("bot-1", "scrapMetal")).toBe(2);
	});

	it("fails when machine already has an active job", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 10);
		placeNear("bot-1", "machine-1");

		startCraft("bot-1", "machine-1", "arm_assembly", 0);
		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(false);
		expect(result.reason).toBe("machine_busy");
	});

	it("allows different machines to run jobs concurrently", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 10);
		placeNear("bot-1", "machine-1");
		registerMachinePosition("machine-2", { x: 1, y: 0, z: 0 });

		const r1 = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		const r2 = startCraft("bot-1", "machine-2", "arm_assembly", 0);
		expect(r1.success).toBe(true);
		expect(r2.success).toBe(true);
		expect(getActiveJobCount()).toBe(2);
	});

	it("fails for multi-input recipe when one input is missing", () => {
		createInventory("bot-1");
		addItem("bot-1", "eWaste", 3); // power_cell needs eWaste:3 + scrapMetal:2
		// no scrapMetal
		placeNear("bot-1", "machine-1");

		const result = startCraft("bot-1", "machine-1", "power_cell", 0);
		expect(result.success).toBe(false);
		expect(result.reason).toBe("missing_inputs");
	});
});

// ---------------------------------------------------------------------------
// craftingSystem — tick processing
// ---------------------------------------------------------------------------

describe("craftingSystem", () => {
	it("decrements ticksRemaining each tick", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		startCraft("bot-1", "machine-1", "arm_assembly", 0);

		craftingSystem(1);
		const job = getJobForMachine("machine-1");
		expect(job!.ticksRemaining).toBe(5);
	});

	it("completes job and delivers output to bot inventory", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		startCraft("bot-1", "machine-1", "arm_assembly", 0);

		// Tick 6 times to complete (craftTicks = 6)
		for (let t = 1; t <= 6; t++) {
			craftingSystem(t);
		}

		expect(getActiveJobCount()).toBe(0);
		expect(getItemCount("bot-1", "grabber")).toBe(1);
	});

	it("returns completed job IDs", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		const { jobId } = startCraft("bot-1", "machine-1", "arm_assembly", 0);

		let completed: string[] = [];
		for (let t = 1; t <= 6; t++) {
			completed = craftingSystem(t);
		}

		expect(completed).toHaveLength(1);
		expect(completed[0]).toBe(jobId);
	});

	it("delivers correct output count (wire_bundle outputs 4)", () => {
		createInventory("bot-1");
		giveWireInputs("bot-1");
		startCraft("bot-1", "machine-1", "wire_bundle", 0);

		for (let t = 1; t <= 4; t++) {
			craftingSystem(t);
		}

		expect(getItemCount("bot-1", "wireBundle")).toBe(4);
	});

	it("handles multiple concurrent jobs completing at different times", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 5);
		addItem("bot-1", "copper", 1);

		startCraft("bot-1", "machine-1", "arm_assembly", 0); // 6 ticks
		startCraft("bot-1", "machine-2", "wire_bundle", 0); // 4 ticks

		// After 4 ticks: wire_bundle done
		for (let t = 1; t <= 4; t++) {
			craftingSystem(t);
		}
		expect(getActiveJobCount()).toBe(1);
		expect(getItemCount("bot-1", "wireBundle")).toBe(4);

		// After 2 more ticks: arm_assembly done
		craftingSystem(5);
		craftingSystem(6);
		expect(getActiveJobCount()).toBe(0);
		expect(getItemCount("bot-1", "grabber")).toBe(1);
	});

	it("does nothing when no active jobs", () => {
		const completed = craftingSystem(0);
		expect(completed).toEqual([]);
	});

	it("reports progress correctly", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		startCraft("bot-1", "machine-1", "arm_assembly", 0);

		craftingSystem(1);
		craftingSystem(2);
		craftingSystem(3);
		// 3 of 6 ticks done → progress = 0.5
		const job = getJobForMachine("machine-1");
		expect(job!.progress).toBeCloseTo(0.5);
	});
});

// ---------------------------------------------------------------------------
// cancelCraft
// ---------------------------------------------------------------------------

describe("cancelCraft", () => {
	it("removes the job from active jobs", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		const { jobId } = startCraft("bot-1", "machine-1", "arm_assembly", 0);

		expect(cancelCraft(jobId!)).toBe(true);
		expect(getActiveJobCount()).toBe(0);
	});

	it("does not refund consumed inputs", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		const { jobId } = startCraft("bot-1", "machine-1", "arm_assembly", 0);

		cancelCraft(jobId!);
		expect(getItemCount("bot-1", "scrapMetal")).toBe(0);
	});

	it("returns false for nonexistent job", () => {
		expect(cancelCraft("no-such-job")).toBe(false);
	});

	it("frees the machine for a new job after cancel", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 10);
		placeNear("bot-1", "machine-1");

		const { jobId } = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		cancelCraft(jobId!);

		const result = startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("getActiveJobs", () => {
	it("returns empty array when no jobs", () => {
		expect(getActiveJobs()).toEqual([]);
	});

	it("returns snapshots of all active jobs", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 5);
		addItem("bot-1", "copper", 1);

		startCraft("bot-1", "machine-1", "arm_assembly", 0);
		startCraft("bot-1", "machine-2", "wire_bundle", 0);

		const jobs = getActiveJobs();
		expect(jobs).toHaveLength(2);
		expect(jobs.map((j) => j.recipeName).sort()).toEqual([
			"Arm Assembly",
			"Wire Bundle",
		]);
	});
});

describe("getJobsForMachine", () => {
	it("returns jobs for a specific machine", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 5);
		addItem("bot-1", "copper", 1);

		startCraft("bot-1", "machine-1", "arm_assembly", 0);
		startCraft("bot-1", "machine-2", "wire_bundle", 0);

		expect(getJobsForMachine("machine-1")).toHaveLength(1);
		expect(getJobsForMachine("machine-1")[0].recipeName).toBe("Arm Assembly");
		expect(getJobsForMachine("machine-2")).toHaveLength(1);
	});

	it("returns empty for machine with no job", () => {
		expect(getJobsForMachine("empty-machine")).toEqual([]);
	});
});

describe("getJobForMachine", () => {
	it("returns null when machine has no job", () => {
		expect(getJobForMachine("empty-machine")).toBeNull();
	});
});

describe("getActiveJobCount", () => {
	it("tracks job count accurately", () => {
		createInventory("bot-1");
		addItem("bot-1", "scrapMetal", 10);
		addItem("bot-1", "copper", 2);

		expect(getActiveJobCount()).toBe(0);
		startCraft("bot-1", "machine-1", "arm_assembly", 0);
		expect(getActiveJobCount()).toBe(1);
		startCraft("bot-1", "machine-2", "wire_bundle", 0);
		expect(getActiveJobCount()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// _resetCraftingState
// ---------------------------------------------------------------------------

describe("_resetCraftingState", () => {
	it("clears all active jobs", () => {
		createInventory("bot-1");
		giveArmInputs("bot-1");
		startCraft("bot-1", "machine-1", "arm_assembly", 0);

		_resetCraftingState();
		expect(getActiveJobCount()).toBe(0);
	});

	it("clears registered positions", () => {
		registerBotPosition("bot-1", { x: 0, y: 0, z: 0 });
		registerMachinePosition("machine-1", { x: 100, y: 0, z: 0 });

		_resetCraftingState();

		// After reset, positions cleared — crafting should skip proximity
		createInventory("bot-2");
		giveArmInputs("bot-2");
		const result = startCraft("bot-2", "machine-1", "arm_assembly", 0);
		expect(result.success).toBe(true);
	});

	it("restores default recipes", () => {
		registerRecipe({
			id: "arm_assembly",
			name: "Override",
			inputs: [],
			outputItemId: "iron",
			outputCount: 1,
			craftTicks: 1,
		});
		_resetCraftingState();
		expect(getRecipe("arm_assembly")!.name).toBe("Arm Assembly");
	});
});
