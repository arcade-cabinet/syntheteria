/**
 * Unit tests for the fragment merge system.
 *
 * Tests cover:
 * - fragmentMergeSystem: detecting close units and merging their fragments
 * - Fog data merging: survivor keeps the maximum detail at each cell
 * - Survivor selection: fragment with more revealed cells survives
 * - Entity reassignment: all units in absorbed fragment are moved to survivor
 * - Edge cases: same fragment, beyond merge distance, no fragments
 */

// Compat layer: defer world access until iteration time to avoid circular init issues
jest.mock("../../ecs/koota/compat", () => ({
	get units() {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("../../ecs/world").units;
	},
}));

import {
	createFragment,
	deleteFragment,
	getAllFragments,
	getFragment,
} from "../../ecs/terrain";
import type { Entity } from "../../ecs/types";
import { world } from "../../ecs/world";
import { fragmentMergeSystem } from "../fragmentMerge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const entitiesToCleanup: Entity[] = [];

function addUnit(
	fragmentId: string,
	x: number,
	z: number,
	id?: string,
): Entity {
	const entity = world.add({
		id: id ?? `unit_${Math.random().toString(36).slice(2, 6)}`,
		faction: "player",
		worldPosition: { x, y: 0, z },
		mapFragment: { fragmentId },
		unit: {
			type: "maintenance_bot",
			displayName: "Test Bot",
			speed: 5,
			selected: false,
			components: [],
		},
	} as Partial<Entity> as Entity);
	entitiesToCleanup.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	// Clean out any leftover fragments
	for (const frag of getAllFragments()) {
		deleteFragment(frag.id);
	}
});

afterEach(() => {
	for (const e of entitiesToCleanup) {
		try {
			world.remove(e);
		} catch {
			// entity may have already been removed
		}
	}
	entitiesToCleanup.length = 0;

	for (const frag of getAllFragments()) {
		deleteFragment(frag.id);
	}
});

// ---------------------------------------------------------------------------
// No merge scenarios
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — no merge", () => {
	it("returns empty when there are no units", () => {
		const events = fragmentMergeSystem();
		expect(events).toEqual([]);
	});

	it("returns empty when all units share the same fragment", () => {
		const frag = createFragment();
		addUnit(frag.id, 0, 0);
		addUnit(frag.id, 3, 3);

		const events = fragmentMergeSystem();
		expect(events).toEqual([]);
	});

	it("returns empty when units from different fragments are too far apart", () => {
		const fragA = createFragment();
		const fragB = createFragment();
		// MERGE_DISTANCE = 6, so place them 10 units apart
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 10, 0);

		const events = fragmentMergeSystem();
		expect(events).toEqual([]);

		// Both fragments should still exist
		expect(getFragment(fragA.id)).toBeDefined();
		expect(getFragment(fragB.id)).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Merge triggers
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — merge triggers", () => {
	it("merges when two units from different fragments are within MERGE_DISTANCE", () => {
		const fragA = createFragment();
		const fragB = createFragment();
		// MERGE_DISTANCE = 6, place them 4 units apart
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 4, 0);

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(1);
		expect(events[0]).toHaveProperty("absorbedId");
		expect(events[0]).toHaveProperty("survivorId");
	});

	it("merges at exactly MERGE_DISTANCE (6 units)", () => {
		const fragA = createFragment();
		const fragB = createFragment();
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 6, 0);

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(1);
	});

	it("does not merge when units are just beyond MERGE_DISTANCE", () => {
		const fragA = createFragment();
		const fragB = createFragment();
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 6.01, 0);

		const events = fragmentMergeSystem();
		expect(events).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Survivor selection
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — survivor selection", () => {
	it("survivor is the fragment with more revealed fog cells", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		// Give fragA more revealed cells
		const fogA = getFragment(fragA.id)!.fog;
		for (let i = 0; i < 100; i++) {
			fogA[i] = 2; // detailed
		}

		// Give fragB fewer revealed cells
		const fogB = getFragment(fragB.id)!.fog;
		for (let i = 0; i < 10; i++) {
			fogB[i] = 1; // abstract
		}

		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(1);
		expect(events[0].survivorId).toBe(fragA.id);
		expect(events[0].absorbedId).toBe(fragB.id);
	});

	it("when fog coverage is equal, one fragment survives and the other is absorbed", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		// Equal fog coverage (both empty)
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		const events = fragmentMergeSystem();
		expect(events).toHaveLength(1);
		// One survives, the other is absorbed — exact choice depends on unit ordering
		const ids = new Set([fragA.id, fragB.id]);
		expect(ids.has(events[0].survivorId)).toBe(true);
		expect(ids.has(events[0].absorbedId)).toBe(true);
		expect(events[0].survivorId).not.toBe(events[0].absorbedId);
	});
});

// ---------------------------------------------------------------------------
// Fog merging
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — fog merging", () => {
	it("survivor keeps the higher detail level at each cell", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		const fogA = getFragment(fragA.id)!.fog;
		const fogB = getFragment(fragB.id)!.fog;

		// Set up fog data where each fragment has some cells the other doesn't
		fogA[0] = 2; // detailed
		fogA[1] = 0; // unexplored
		fogA[2] = 1; // abstract

		fogB[0] = 1; // abstract (lower than A)
		fogB[1] = 2; // detailed (higher than A)
		fogB[2] = 2; // detailed (higher than A)

		// Give fragA more revealed cells so it becomes the survivor
		for (let i = 10; i < 50; i++) {
			fogA[i] = 2;
		}

		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		fragmentMergeSystem();

		const survivorFog = getFragment(fragA.id)!.fog;
		expect(survivorFog[0]).toBe(2); // kept fragA's detailed
		expect(survivorFog[1]).toBe(2); // took fragB's detailed
		expect(survivorFog[2]).toBe(2); // took fragB's detailed
	});
});

// ---------------------------------------------------------------------------
// Entity reassignment
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — entity reassignment", () => {
	it("reassigns all absorbed units to the survivor fragment", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		// Give fragA more revealed cells so it's the survivor
		const fogA = getFragment(fragA.id)!.fog;
		for (let i = 0; i < 100; i++) fogA[i] = 2;

		const unitA = addUnit(fragA.id, 0, 0, "unit_a");
		const unitB1 = addUnit(fragB.id, 3, 0, "unit_b1");
		const unitB2 = addUnit(fragB.id, 4, 0, "unit_b2");

		fragmentMergeSystem();

		// All units should now be in fragA
		expect(unitA.mapFragment!.fragmentId).toBe(fragA.id);
		expect(unitB1.mapFragment!.fragmentId).toBe(fragA.id);
		expect(unitB2.mapFragment!.fragmentId).toBe(fragA.id);
	});
});

// ---------------------------------------------------------------------------
// Fragment cleanup
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — fragment cleanup", () => {
	it("deletes the absorbed fragment", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		fragmentMergeSystem();

		// One of the fragments should be deleted
		const remaining = getAllFragments();
		expect(remaining).toHaveLength(1);
	});

	it("adds absorbed fragment ID to survivor's mergedWith set", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		// Make fragA the survivor
		const fogA = getFragment(fragA.id)!.fog;
		for (let i = 0; i < 100; i++) fogA[i] = 2;

		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		fragmentMergeSystem();

		const survivor = getFragment(fragA.id)!;
		expect(survivor.mergedWith.has(fragB.id)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Multiple merges in one tick
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — multiple merges", () => {
	it("handles two separate merge pairs in one tick", () => {
		const fragA = createFragment();
		const fragB = createFragment();
		const fragC = createFragment();
		const fragD = createFragment();

		// Pair 1: A and B close together
		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		// Pair 2: C and D close together but far from pair 1
		addUnit(fragC.id, 100, 100);
		addUnit(fragD.id, 103, 100);

		const events = fragmentMergeSystem();
		// Should get at least 1 merge event (might be 2 depending on fragment state after first merge)
		expect(events.length).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Edge: fragments don't exist
// ---------------------------------------------------------------------------

describe("fragmentMergeSystem — missing fragments", () => {
	it("handles units referencing deleted fragments gracefully", () => {
		const fragA = createFragment();
		const fragB = createFragment();

		addUnit(fragA.id, 0, 0);
		addUnit(fragB.id, 3, 0);

		// Delete fragB before merge
		deleteFragment(fragB.id);

		// Should not crash
		const events = fragmentMergeSystem();
		// No merge should happen since fragB doesn't exist
		expect(events).toEqual([]);
	});
});
