/**
 * Unit tests for the repair system.
 *
 * Tests cover:
 * - Starting repairs (validation: arms, distance, broken component, resources)
 * - Repair system tick (progress, completion, marking component functional)
 * - Repairing building components
 * - Edge cases: duplicate repairs, no arms, too far, already functional
 * - getActiveRepairs returns copies
 * - Material-based repair costs
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	BuildingEntity,
	Entity,
	UnitEntity,
} from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock ECS world collections
// ---------------------------------------------------------------------------

const { mockUnits, mockBuildings } = vi.hoisted(() => {
	const mockUnits: Entity[] = [];
	const mockBuildings: BuildingEntity[] = [];
	return { mockUnits, mockBuildings };
});

vi.mock("../../ecs/world", () => ({
	units: mockUnits,
	buildings: mockBuildings,
	world: [],
}));

// Import after mocking
import {
	getActiveRepairs,
	repairSystem,
	startRepair,
} from "../repair";
import {
	addResource,
	getResources,
	resetResourcePool,
} from "../resources";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRepairer(
	id: string,
	x: number,
	z: number,
	hasArms = true,
): UnitEntity {
	const entity = {
		id,
		faction: "player" as const,
		worldPosition: { x, y: 0, z },
		mapFragment: { fragmentId: "frag-1" },
		unit: {
			type: "maintenance_bot" as const,
			displayName: id,
			speed: 3,
			selected: false,
			components: hasArms
				? [{ name: "arms", functional: true, material: "metal" as const }]
				: [{ name: "arms", functional: false, material: "metal" as const }],
		},
	} as UnitEntity;
	mockUnits.push(entity);
	return entity;
}

function makeTarget(
	id: string,
	x: number,
	z: number,
	components: { name: string; functional: boolean; material: "metal" | "plastic" | "electronic" }[],
): Entity {
	const entity: Entity = {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		mapFragment: { fragmentId: "frag-1" },
		unit: {
			type: "maintenance_bot",
			displayName: id,
			speed: 3,
			selected: false,
			components,
		},
	};
	mockUnits.push(entity);
	return entity;
}

function makeBuildingTarget(
	id: string,
	x: number,
	z: number,
	components: { name: string; functional: boolean; material: "metal" | "plastic" | "electronic" }[],
): BuildingEntity {
	const entity = {
		id,
		faction: "player",
		worldPosition: { x, y: 0, z },
		building: {
			type: "fabrication_unit",
			powered: true,
			operational: true,
			selected: false,
			components,
		},
	} as BuildingEntity;
	mockBuildings.push(entity);
	return entity;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	mockUnits.length = 0;
	mockBuildings.length = 0;
	resetResourcePool();
	// Drain any leftover active repairs
	for (let i = 0; i < 10; i++) {
		repairSystem();
	}
});

afterEach(() => {
	mockUnits.length = 0;
	mockBuildings.length = 0;
});

// ---------------------------------------------------------------------------
// startRepair
// ---------------------------------------------------------------------------

describe("startRepair", () => {
	it("returns true and queues repair for a broken metal component", () => {
		const repairer = makeRepairer("rep-1", 0, 0);
		const target = makeTarget("tgt-1", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		const result = startRepair(repairer, target, "camera");
		expect(result).toBe(true);

		const repairs = getActiveRepairs();
		expect(repairs).toHaveLength(1);
		expect(repairs[0].repairerId).toBe("rep-1");
		expect(repairs[0].targetId).toBe("tgt-1");
		expect(repairs[0].componentName).toBe("camera");
		expect(repairs[0].ticksRemaining).toBe(5);
		expect(repairs[0].totalTicks).toBe(5);
	});

	it("spends correct resources for metal component", () => {
		const repairer = makeRepairer("rep-m", 0, 0);
		const target = makeTarget("tgt-m", 1, 0, [
			{ name: "arms", functional: false, material: "metal" },
		]);
		addResource("scrapMetal", 10);

		startRepair(repairer, target, "arms");
		expect(getResources().scrapMetal).toBe(7); // 10 - 3
	});

	it("spends correct resources for plastic component", () => {
		const repairer = makeRepairer("rep-p", 0, 0);
		const target = makeTarget("tgt-p", 1, 0, [
			{ name: "hull", functional: false, material: "plastic" },
		]);
		addResource("scrapMetal", 10);

		startRepair(repairer, target, "hull");
		expect(getResources().scrapMetal).toBe(9); // 10 - 1
	});

	it("spends correct resources for electronic component", () => {
		const repairer = makeRepairer("rep-e", 0, 0);
		const target = makeTarget("tgt-e", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		startRepair(repairer, target, "camera");
		expect(getResources().eWaste).toBe(8); // 10 - 2
	});

	it("returns false when repairer has no functional arms", () => {
		const repairer = makeRepairer("rep-noarms", 0, 0, false);
		const target = makeTarget("tgt-na", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "camera")).toBe(false);
	});

	it("returns false when target is too far away", () => {
		const repairer = makeRepairer("rep-far", 0, 0);
		const target = makeTarget("tgt-far", 10, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]); // Distance = 10 > REPAIR_RANGE (3.0)
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "camera")).toBe(false);
	});

	it("returns true when target is exactly at repair range", () => {
		const repairer = makeRepairer("rep-edge", 0, 0);
		const target = makeTarget("tgt-edge", 3, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]); // Distance = 3.0 = REPAIR_RANGE
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "camera")).toBe(true);
	});

	it("returns false when component is already functional", () => {
		const repairer = makeRepairer("rep-func", 0, 0);
		const target = makeTarget("tgt-func", 1, 0, [
			{ name: "camera", functional: true, material: "electronic" },
		]);
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "camera")).toBe(false);
	});

	it("returns false when component name not found on target", () => {
		const repairer = makeRepairer("rep-notfound", 0, 0);
		const target = makeTarget("tgt-notfound", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "nonexistent")).toBe(false);
	});

	it("returns false when insufficient resources", () => {
		const repairer = makeRepairer("rep-nores", 0, 0);
		const target = makeTarget("tgt-nores", 1, 0, [
			{ name: "arms", functional: false, material: "metal" },
		]);
		// Need 3 scrapMetal, have 0

		expect(startRepair(repairer, target, "arms")).toBe(false);
	});

	it("returns false for duplicate repair on same component", () => {
		const repairer = makeRepairer("rep-dup", 0, 0);
		const target = makeTarget("tgt-dup", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 20);

		expect(startRepair(repairer, target, "camera")).toBe(true);
		expect(startRepair(repairer, target, "camera")).toBe(false);
	});

	it("returns false when repairer has no worldPosition", () => {
		const repairer = {
			id: "rep-nopos",
			faction: "player" as const,
			mapFragment: { fragmentId: "frag-1" },
			unit: {
				type: "maintenance_bot" as const,
				displayName: "Bot",
				speed: 3,
				selected: false,
				components: [{ name: "arms", functional: true, material: "metal" as const }],
			},
		} as UnitEntity;

		const target = makeTarget("tgt-nopos", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		expect(startRepair(repairer, target, "camera")).toBe(false);
	});

	it("returns false when target has no worldPosition", () => {
		const repairer = makeRepairer("rep-tnp", 0, 0);
		const target: Entity = {
			id: "tgt-nopos2",
			faction: "player",
			unit: {
				type: "maintenance_bot",
				displayName: "Bot",
				speed: 3,
				selected: false,
				components: [{ name: "camera", functional: false, material: "electronic" }],
			},
		};
		addResource("eWaste", 10);

		expect(startRepair(repairer as UnitEntity, target, "camera")).toBe(false);
	});

	it("can start repair on a building component", () => {
		const repairer = makeRepairer("rep-bldg", 0, 0);
		const building = makeBuildingTarget("bldg-1", 1, 0, [
			{ name: "power_supply", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);

		expect(startRepair(repairer, building, "power_supply")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getActiveRepairs
// ---------------------------------------------------------------------------

describe("getActiveRepairs", () => {
	it("returns empty array when no repairs", () => {
		expect(getActiveRepairs()).toEqual([]);
	});

	it("returns a copy of the repairs array", () => {
		const repairer = makeRepairer("rep-copy", 0, 0);
		const target = makeTarget("tgt-copy", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);
		startRepair(repairer, target, "camera");

		const r1 = getActiveRepairs();
		const r2 = getActiveRepairs();
		expect(r1).not.toBe(r2);
		expect(r1).toEqual(r2);
	});
});

// ---------------------------------------------------------------------------
// repairSystem tick
// ---------------------------------------------------------------------------

describe("repairSystem", () => {
	it("decrements ticksRemaining each tick", () => {
		const repairer = makeRepairer("rep-tick", 0, 0);
		const target = makeTarget("tgt-tick", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);
		startRepair(repairer, target, "camera");

		repairSystem();
		expect(getActiveRepairs()[0].ticksRemaining).toBe(4);

		repairSystem();
		expect(getActiveRepairs()[0].ticksRemaining).toBe(3);
	});

	it("marks unit component functional after 5 ticks", () => {
		const repairer = makeRepairer("rep-complete", 0, 0);
		const target = makeTarget("tgt-complete", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);
		startRepair(repairer, target, "camera");

		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		expect(getActiveRepairs()).toHaveLength(0);
		const comp = target.unit!.components.find((c) => c.name === "camera");
		expect(comp!.functional).toBe(true);
	});

	it("marks building component functional after 5 ticks", () => {
		const repairer = makeRepairer("rep-bldg-done", 0, 0);
		const building = makeBuildingTarget("bldg-done", 1, 0, [
			{ name: "power_supply", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);
		startRepair(repairer, building, "power_supply");

		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		expect(getActiveRepairs()).toHaveLength(0);
		const comp = building.building.components.find(
			(c) => c.name === "power_supply",
		);
		expect(comp!.functional).toBe(true);
	});

	it("does nothing when no active repairs", () => {
		expect(() => repairSystem()).not.toThrow();
	});

	it("handles multiple concurrent repairs", () => {
		const repairer = makeRepairer("rep-multi", 0, 0);
		const target1 = makeTarget("tgt-m1", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		const target2 = makeTarget("tgt-m2", 0, 1, [
			{ name: "arms", functional: false, material: "metal" },
		]);
		addResource("eWaste", 10);
		addResource("scrapMetal", 10);

		startRepair(repairer, target1, "camera");
		startRepair(repairer, target2, "arms");

		expect(getActiveRepairs()).toHaveLength(2);

		for (let i = 0; i < 5; i++) {
			repairSystem();
		}

		expect(getActiveRepairs()).toHaveLength(0);
		expect(target1.unit!.components[0].functional).toBe(true);
		expect(target2.unit!.components[0].functional).toBe(true);
	});

	it("handles repair on a target that was removed from world", () => {
		const repairer = makeRepairer("rep-removed", 0, 0);
		const target = makeTarget("tgt-removed", 1, 0, [
			{ name: "camera", functional: false, material: "electronic" },
		]);
		addResource("eWaste", 10);
		startRepair(repairer, target, "camera");

		// Remove target from both units and buildings lists
		const idx = mockUnits.indexOf(target);
		if (idx >= 0) mockUnits.splice(idx, 1);

		// Run repair to completion — should not crash
		for (let i = 0; i < 5; i++) {
			expect(() => repairSystem()).not.toThrow();
		}

		// Repair should have been removed from active list
		expect(getActiveRepairs()).toHaveLength(0);
	});
});
