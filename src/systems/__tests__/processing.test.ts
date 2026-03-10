/**
 * Unit tests for the processing system.
 *
 * Tests cover:
 * - Auto-pull from input belts (only items matching a valid recipe)
 * - Recipe application and material transformation
 * - Progress tracking per tick (advances by 1/speed each tick)
 * - Auto-push to output belt
 * - Edge cases: missing input, full output, invalid recipe, no recipe set,
 *   inactive/unpowered processor, no output belt, unknown processor type
 * - PROCESSING_RECIPES constant
 * - getProcessorInput helper
 */

import type { Entity } from "../../ecs/types";
import { world } from "../../ecs/world";
import {
	PROCESSING_RECIPES,
	getProcessorInput,
	processingSystem,
} from "../processing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const addedEntities: Entity[] = [];

function addEntity(partial: Partial<Entity>): Entity {
	const entity = world.add(partial as Entity);
	addedEntities.push(entity);
	return entity;
}

/**
 * Create a processor entity with all required components for the
 * `processors` archetype query (processor + building + worldPosition).
 */
function makeProcessor(
	overrides: {
		id?: string;
		processorType?: "smelter" | "refiner" | "separator";
		recipe?: string | null;
		inputBeltId?: string | null;
		outputBeltId?: string | null;
		speed?: number;
		active?: boolean;
		powered?: boolean;
		progress?: number;
	} = {},
): Entity {
	return addEntity({
		id: overrides.id ?? `proc_${Math.random().toString(36).slice(2, 8)}`,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		building: {
			type: overrides.processorType ?? "smelter",
			powered: overrides.powered ?? true,
			operational: true,
			selected: false,
			components: [],
		},
		processor: {
			processorType: overrides.processorType ?? "smelter",
			recipe: overrides.recipe !== undefined ? overrides.recipe : "scrap_metal",
			inputBeltId: overrides.inputBeltId ?? null,
			outputBeltId: overrides.outputBeltId ?? null,
			progress: overrides.progress ?? 0,
			speed: overrides.speed ?? 5,
			active: overrides.active ?? true,
		},
	});
}

/**
 * Create a belt entity with all required components for lookup.
 */
function makeBelt(
	id: string,
	carrying: string | null = null,
): Entity {
	return addEntity({
		id,
		faction: "player",
		worldPosition: { x: 0, y: 0, z: 0 },
		belt: {
			direction: "east",
			speed: 2,
			tier: "basic",
			carrying,
			nextBeltId: null,
			prevBeltId: null,
			itemProgress: 0,
		},
	});
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
	for (const e of addedEntities) {
		try {
			world.remove(e);
		} catch {
			// already removed
		}
	}
	addedEntities.length = 0;
});

// ---------------------------------------------------------------------------
// PROCESSING_RECIPES constant
// ---------------------------------------------------------------------------

describe("PROCESSING_RECIPES", () => {
	it("smelter has scrap_metal -> refined_metal recipe", () => {
		expect(PROCESSING_RECIPES.smelter.scrap_metal).toBe("refined_metal");
	});

	it("smelter has copper -> copper_ingot recipe", () => {
		expect(PROCESSING_RECIPES.smelter.copper).toBe("copper_ingot");
	});

	it("refiner has e_waste -> intact_components recipe", () => {
		expect(PROCESSING_RECIPES.refiner.e_waste).toBe("intact_components");
	});

	it("refiner has rare_alloy -> advanced_alloy recipe", () => {
		expect(PROCESSING_RECIPES.refiner.rare_alloy).toBe("advanced_alloy");
	});

	it("separator has fiber_optics -> optical_cable recipe", () => {
		expect(PROCESSING_RECIPES.separator.fiber_optics).toBe("optical_cable");
	});
});

// ---------------------------------------------------------------------------
// Auto-pull from input belt
// ---------------------------------------------------------------------------

describe("auto-pull from input belt", () => {
	it("pulls a matching item from the input belt", () => {
		const inputBelt = makeBelt("belt_in", "scrap_metal");
		const proc = makeProcessor({
			id: "proc_1",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in",
			speed: 5,
		});

		processingSystem();

		// Belt should be empty after pull
		expect(inputBelt.belt!.carrying).toBeNull();
		expect(inputBelt.belt!.itemProgress).toBe(0);
		// Processor should have the input
		expect(getProcessorInput("proc_1")).toBe("scrap_metal");
		// Progress should be reset and advanced by 1/speed
		expect(proc.processor!.progress).toBeCloseTo(1 / 5);
	});

	it("does not pull items that don't match any recipe", () => {
		const inputBelt = makeBelt("belt_in", "unknown_junk");
		makeProcessor({
			id: "proc_2",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in",
			speed: 5,
		});

		processingSystem();

		// Belt should still carry the item
		expect(inputBelt.belt!.carrying).toBe("unknown_junk");
		expect(getProcessorInput("proc_2")).toBeNull();
	});

	it("does not pull when input belt is empty", () => {
		makeBelt("belt_in", null);
		makeProcessor({
			id: "proc_3",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in",
			speed: 5,
		});

		processingSystem();

		expect(getProcessorInput("proc_3")).toBeNull();
	});

	it("does not pull when no input belt is connected", () => {
		makeProcessor({
			id: "proc_4",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: null,
			speed: 5,
		});

		processingSystem();

		expect(getProcessorInput("proc_4")).toBeNull();
	});

	it("does not pull when already processing an item", () => {
		const inputBelt = makeBelt("belt_in", "copper");
		makeProcessor({
			id: "proc_5",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in",
			speed: 10,
		});

		// First tick — pull scrap_metal
		inputBelt.belt!.carrying = "scrap_metal";
		processingSystem();
		expect(getProcessorInput("proc_5")).toBe("scrap_metal");

		// Second tick — belt now has copper, but processor is busy
		inputBelt.belt!.carrying = "copper";
		processingSystem();

		// Belt should not be pulled from (processor already has an item)
		expect(inputBelt.belt!.carrying).toBe("copper");
	});
});

// ---------------------------------------------------------------------------
// Recipe application and material transformation
// ---------------------------------------------------------------------------

describe("recipe application", () => {
	it("smelter transforms scrap_metal into refined_metal", () => {
		const outputBelt = makeBelt("belt_out");
		makeProcessor({
			id: "proc_smelt",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: null,
			outputBeltId: "belt_out",
			speed: 1, // completes in 1 tick
		});

		// Manually set the input (simulating a previous pull)
		makeBelt("belt_in_s", "scrap_metal");
		// Re-create processor with input belt
		world.remove(addedEntities.pop()!); // remove the inputBelt we just made
		// Use the processor we already made — it needs an input.
		// Actually, let's just create a fresh scenario:
		// Remove old processor
		const oldProc = addedEntities.find((e) => e.id === "proc_smelt");
		if (oldProc) {
			world.remove(oldProc);
			addedEntities.splice(addedEntities.indexOf(oldProc), 1);
		}

		makeBelt("belt_in_smelt", "scrap_metal");
		makeProcessor({
			id: "proc_smelt2",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_smelt",
			outputBeltId: "belt_out",
			speed: 1,
		});

		// Tick 1: pull input and progress reaches 1.0
		processingSystem();

		// With speed=1, progress += 1/1 = 1.0, so it completes immediately
		expect(outputBelt.belt!.carrying).toBe("refined_metal");
		expect(getProcessorInput("proc_smelt2")).toBeNull();
	});

	it("refiner transforms e_waste into intact_components", () => {
		makeBelt("belt_in_r", "e_waste");
		const outputBelt = makeBelt("belt_out_r");

		makeProcessor({
			id: "proc_refine",
			processorType: "refiner",
			recipe: "e_waste",
			inputBeltId: "belt_in_r",
			outputBeltId: "belt_out_r",
			speed: 1,
		});

		processingSystem();

		expect(outputBelt.belt!.carrying).toBe("intact_components");
	});

	it("separator transforms fiber_optics into optical_cable", () => {
		makeBelt("belt_in_sep", "fiber_optics");
		const outputBelt = makeBelt("belt_out_sep");

		makeProcessor({
			id: "proc_sep",
			processorType: "separator",
			recipe: "fiber_optics",
			inputBeltId: "belt_in_sep",
			outputBeltId: "belt_out_sep",
			speed: 1,
		});

		processingSystem();

		expect(outputBelt.belt!.carrying).toBe("optical_cable");
	});
});

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

describe("progress tracking", () => {
	it("advances progress by 1/speed each tick", () => {
		makeBelt("belt_in_p", "scrap_metal");
		const proc = makeProcessor({
			id: "proc_progress",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_p",
			outputBeltId: null,
			speed: 10,
		});

		// Tick 1: pull input, advance by 1/10
		processingSystem();
		expect(proc.processor!.progress).toBeCloseTo(0.1);

		// Tick 2: advance by another 1/10
		processingSystem();
		expect(proc.processor!.progress).toBeCloseTo(0.2);

		// Tick 3
		processingSystem();
		expect(proc.processor!.progress).toBeCloseTo(0.3);
	});

	it("completes when progress reaches 1.0", () => {
		makeBelt("belt_in_c", "scrap_metal");
		const proc = makeProcessor({
			id: "proc_complete",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_c",
			outputBeltId: null, // no output belt — item consumed
			speed: 3,
		});

		// Tick 1: progress = 1/3 ~ 0.333
		processingSystem();
		expect(proc.processor!.progress).toBeCloseTo(1 / 3);

		// Tick 2: progress = 2/3 ~ 0.667
		processingSystem();
		expect(proc.processor!.progress).toBeCloseTo(2 / 3);

		// Tick 3: progress = 3/3 = 1.0 => completes
		processingSystem();
		// After completion (no output belt), progress resets to 0
		expect(proc.processor!.progress).toBe(0);
		expect(getProcessorInput("proc_complete")).toBeNull();
	});

	it("resets progress to 0 after completion with output", () => {
		makeBelt("belt_in_reset", "copper");
		const outputBelt = makeBelt("belt_out_reset");

		const proc = makeProcessor({
			id: "proc_reset",
			processorType: "smelter",
			recipe: "copper",
			inputBeltId: "belt_in_reset",
			outputBeltId: "belt_out_reset",
			speed: 1,
		});

		processingSystem();

		expect(proc.processor!.progress).toBe(0);
		expect(outputBelt.belt!.carrying).toBe("copper_ingot");
	});
});

// ---------------------------------------------------------------------------
// Auto-push to output belt
// ---------------------------------------------------------------------------

describe("auto-push to output", () => {
	it("pushes completed item to empty output belt", () => {
		makeBelt("belt_in_push", "scrap_metal");
		const outputBelt = makeBelt("belt_out_push");

		makeProcessor({
			id: "proc_push",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_push",
			outputBeltId: "belt_out_push",
			speed: 1,
		});

		processingSystem();

		expect(outputBelt.belt!.carrying).toBe("refined_metal");
		expect(outputBelt.belt!.itemProgress).toBe(0);
	});

	it("holds at progress 1.0 when output belt is blocked", () => {
		makeBelt("belt_in_block", "scrap_metal");
		const outputBelt = makeBelt("belt_out_block", "existing_item"); // already carrying something

		const proc = makeProcessor({
			id: "proc_block",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_block",
			outputBeltId: "belt_out_block",
			speed: 1,
		});

		processingSystem();

		// Progress should be clamped to 1.0 (holding because output is full)
		expect(proc.processor!.progress).toBe(1.0);
		// Input should still be held (not consumed)
		expect(getProcessorInput("proc_block")).toBe("scrap_metal");
		// Output belt should still carry the existing item
		expect(outputBelt.belt!.carrying).toBe("existing_item");
	});

	it("unblocks and pushes when output belt becomes empty", () => {
		makeBelt("belt_in_unblock", "scrap_metal");
		const outputBelt = makeBelt("belt_out_unblock", "blocker");

		const proc = makeProcessor({
			id: "proc_unblock",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_unblock",
			outputBeltId: "belt_out_unblock",
			speed: 1,
		});

		// Tick 1: completes but output blocked
		processingSystem();
		expect(proc.processor!.progress).toBe(1.0);
		expect(outputBelt.belt!.carrying).toBe("blocker");

		// Clear the output belt
		outputBelt.belt!.carrying = null;

		// Tick 2: should push now
		processingSystem();
		expect(proc.processor!.progress).toBe(0);
		expect(outputBelt.belt!.carrying).toBe("refined_metal");
		expect(getProcessorInput("proc_unblock")).toBeNull();
	});

	it("consumes item when no output belt is connected", () => {
		makeBelt("belt_in_noout", "scrap_metal");
		const proc = makeProcessor({
			id: "proc_noout",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_noout",
			outputBeltId: null,
			speed: 1,
		});

		processingSystem();

		// Processing completes, item is consumed (lost)
		expect(proc.processor!.progress).toBe(0);
		expect(getProcessorInput("proc_noout")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases: inactive / unpowered processor
// ---------------------------------------------------------------------------

describe("inactive / unpowered processor", () => {
	it("skips inactive processor", () => {
		const inputBelt = makeBelt("belt_in_inactive", "scrap_metal");
		makeProcessor({
			id: "proc_inactive",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_inactive",
			speed: 5,
			active: false,
		});

		processingSystem();

		// Belt should not be touched
		expect(inputBelt.belt!.carrying).toBe("scrap_metal");
		expect(getProcessorInput("proc_inactive")).toBeNull();
	});

	it("skips unpowered processor", () => {
		const inputBelt = makeBelt("belt_in_nopower", "scrap_metal");
		makeProcessor({
			id: "proc_nopower",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_nopower",
			speed: 5,
			powered: false,
		});

		processingSystem();

		// Belt should not be touched
		expect(inputBelt.belt!.carrying).toBe("scrap_metal");
		expect(getProcessorInput("proc_nopower")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases: no recipe set
// ---------------------------------------------------------------------------

describe("no recipe set", () => {
	it("skips processor with recipe=null", () => {
		const inputBelt = makeBelt("belt_in_norec", "scrap_metal");
		makeProcessor({
			id: "proc_norec",
			processorType: "smelter",
			recipe: null,
			inputBeltId: "belt_in_norec",
			speed: 5,
		});

		processingSystem();

		expect(inputBelt.belt!.carrying).toBe("scrap_metal");
		expect(getProcessorInput("proc_norec")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases: unknown processor type
// ---------------------------------------------------------------------------

describe("unknown processor type", () => {
	it("skips processor with unrecognized type", () => {
		const inputBelt = makeBelt("belt_in_unknown", "scrap_metal");
		makeProcessor({
			id: "proc_unknown",
			processorType: "smelter" as "smelter", // hack: force-set then override
			recipe: "scrap_metal",
			inputBeltId: "belt_in_unknown",
			speed: 5,
		});

		// Override the processor type to something not in PROCESSING_RECIPES
		const proc = addedEntities.find((e) => e.id === "proc_unknown")!;
		(proc.processor as unknown as Record<string, unknown>).processorType = "assembler";

		processingSystem();

		// Should skip because "assembler" has no recipes
		expect(inputBelt.belt!.carrying).toBe("scrap_metal");
	});
});

// ---------------------------------------------------------------------------
// Edge cases: input belt entity not found
// ---------------------------------------------------------------------------

describe("input belt entity not found", () => {
	it("does not crash when inputBeltId points to non-existent entity", () => {
		makeProcessor({
			id: "proc_missing_belt",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "nonexistent_belt",
			speed: 5,
		});

		expect(() => processingSystem()).not.toThrow();
		expect(getProcessorInput("proc_missing_belt")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Edge cases: output belt entity not found
// ---------------------------------------------------------------------------

describe("output belt entity not found", () => {
	it("does not crash when outputBeltId points to non-existent entity", () => {
		makeBelt("belt_in_misout", "scrap_metal");
		const proc = makeProcessor({
			id: "proc_missing_outbelt",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_misout",
			outputBeltId: "nonexistent_out",
			speed: 1,
		});

		// Should not crash even though output belt doesn't exist
		expect(() => processingSystem()).not.toThrow();

		// Progress should be 1.0 (completed but can't push — output belt not found)
		// The code checks outputBelt?.belt, which will be falsy for a missing entity
		expect(proc.processor!.progress).toBe(1.0);
	});
});

// ---------------------------------------------------------------------------
// getProcessorInput
// ---------------------------------------------------------------------------

describe("getProcessorInput", () => {
	it("returns null for unknown processor", () => {
		expect(getProcessorInput("nonexistent")).toBeNull();
	});

	it("returns the current input material", () => {
		makeBelt("belt_in_gpi", "copper");
		makeProcessor({
			id: "proc_gpi",
			processorType: "smelter",
			recipe: "copper",
			inputBeltId: "belt_in_gpi",
			speed: 10,
		});

		processingSystem();

		expect(getProcessorInput("proc_gpi")).toBe("copper");
	});

	it("returns null after processing completes", () => {
		makeBelt("belt_in_gpi2", "copper");
		makeProcessor({
			id: "proc_gpi2",
			processorType: "smelter",
			recipe: "copper",
			inputBeltId: "belt_in_gpi2",
			outputBeltId: null,
			speed: 1,
		});

		processingSystem();

		// Processing completed (speed=1, no output belt)
		expect(getProcessorInput("proc_gpi2")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Multiple processors in parallel
// ---------------------------------------------------------------------------

describe("multiple processors", () => {
	it("processes multiple processors independently", () => {
		makeBelt("belt_in_a", "scrap_metal");
		const outputA = makeBelt("belt_out_a");
		makeBelt("belt_in_b", "e_waste");
		const outputB = makeBelt("belt_out_b");

		makeProcessor({
			id: "proc_a",
			processorType: "smelter",
			recipe: "scrap_metal",
			inputBeltId: "belt_in_a",
			outputBeltId: "belt_out_a",
			speed: 1,
		});

		makeProcessor({
			id: "proc_b",
			processorType: "refiner",
			recipe: "e_waste",
			inputBeltId: "belt_in_b",
			outputBeltId: "belt_out_b",
			speed: 1,
		});

		processingSystem();

		expect(outputA.belt!.carrying).toBe("refined_metal");
		expect(outputB.belt!.carrying).toBe("intact_components");
	});
});
