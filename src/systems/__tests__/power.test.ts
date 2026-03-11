/**
 * Unit tests for the power system (lightning rods + storm intensity).
 *
 * Tests cover:
 * - Storm intensity oscillation (updateStormIntensity)
 * - Lightning rod capture rates at different storm intensities
 * - Total power generation across multiple rods
 * - Power demand calculations for buildings and units
 * - Radius-based power distribution (buildings within rod protection radius)
 * - Protection radius mechanics (default and custom)
 * - PowerSnapshot accuracy
 * - Edge cases: zero rods, zero buildings, zero storm, max power
 */

import type {
	BuildingEntity,
	Entity,
	LightningRodEntity,
} from "../../ecs/types";

// ---------------------------------------------------------------------------
// Mock ECS world collections
// ---------------------------------------------------------------------------

const mockLightningRods: LightningRodEntity[] = [];
const mockBuildings: BuildingEntity[] = [];
const mockUnits: Entity[] = [];
jest.mock("../../ecs/world", () => ({
	lightningRods: mockLightningRods,
	buildings: mockBuildings,
	units: mockUnits,
	world: [],
}));

// Also mock the Koota compat layer (power.ts now imports from here)
jest.mock("../../ecs/koota/compat", () => ({
	lightningRods: mockLightningRods,
	buildings: mockBuildings,
	units: mockUnits,
}));

// Import after mocking
import {
	getPowerSnapshot,
	getStormIntensity,
	powerSystem,
} from "../power";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRod(
	id: string,
	opts: {
		rodCapacity?: number;
		protectionRadius?: number;
		x?: number;
		z?: number;
	} = {},
): LightningRodEntity {
	return {
		id,
		faction: "player",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		building: {
			type: "lightning_rod",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
		lightningRod: {
			rodCapacity: opts.rodCapacity ?? 10,
			currentOutput: 0,
			protectionRadius: opts.protectionRadius ?? 12,
		},
	} as LightningRodEntity;
}

function makeBuilding(
	id: string,
	type: string,
	opts: { x?: number; z?: number; operational?: boolean } = {},
): BuildingEntity {
	return {
		id,
		faction: "player",
		worldPosition: { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 },
		building: {
			type,
			powered: false,
			operational: opts.operational ?? true,
			selected: false,
			components: [],
		},
	} as BuildingEntity;
}

function makeUnit(
	id: string,
	opts: { type?: string; moving?: boolean } = {},
): Entity {
	return {
		id,
		faction: "player",
		unit: {
			type: opts.type ?? "maintenance_bot",
			displayName: id,
			speed: 1,
			selected: false,
			components: [],
		},
		navigation: { path: [], pathIndex: 0, moving: opts.moving ?? false },
	} as Entity;
}

/** Clear all mock collections and re-run at tick 0 to reset module state. */
function resetMockWorld() {
	mockLightningRods.length = 0;
	mockBuildings.length = 0;
	mockUnits.length = 0;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetMockWorld();
});

// ---------------------------------------------------------------------------
// Storm intensity oscillation
// ---------------------------------------------------------------------------

describe("storm intensity", () => {
	it("returns a positive value after updating", () => {
		powerSystem(0);
		expect(getStormIntensity()).toBeGreaterThan(0);
	});

	it("fluctuates across ticks", () => {
		const intensities: number[] = [];
		for (let tick = 0; tick < 200; tick += 10) {
			powerSystem(tick);
			intensities.push(getStormIntensity());
		}
		const min = Math.min(...intensities);
		const max = Math.max(...intensities);
		// Storm should vary over time, not be constant
		expect(max - min).toBeGreaterThan(0.01);
	});

	it("never exceeds 1.5 (stormMaxIntensity)", () => {
		for (let tick = 0; tick < 1000; tick++) {
			powerSystem(tick);
			expect(getStormIntensity()).toBeLessThanOrEqual(1.5);
		}
	});

	it("is always positive", () => {
		for (let tick = 0; tick < 1000; tick++) {
			powerSystem(tick);
			expect(getStormIntensity()).toBeGreaterThan(0);
		}
	});

	it("has base oscillation centered around 0.7-0.9 range", () => {
		// At tick 0, stormPhase = 0, base = 0.7 + 0.2 * sin(0) = 0.7
		powerSystem(0);
		const intensity = getStormIntensity();
		// With surge: max(0, sin(0 + 2.3)) * 0.3 = max(0, sin(2.3)) * 0.3
		// sin(2.3) ~ 0.746 => surge ~ 0.224
		// total = min(1.5, 0.7 + 0.224) = 0.924
		expect(intensity).toBeGreaterThanOrEqual(0.5);
		expect(intensity).toBeLessThanOrEqual(1.5);
	});
});

// ---------------------------------------------------------------------------
// Lightning rod capture rates
// ---------------------------------------------------------------------------

describe("lightning rod capture rates", () => {
	it("rod output equals rodCapacity * stormIntensity", () => {
		const rod = makeRod("rod-1", { rodCapacity: 10 });
		mockLightningRods.push(rod);

		powerSystem(0);

		const stormI = getStormIntensity();
		expect(rod.lightningRod.currentOutput).toBeCloseTo(10 * stormI);
	});

	it("higher rodCapacity produces more power", () => {
		const smallRod = makeRod("rod-small", { rodCapacity: 5 });
		const bigRod = makeRod("rod-big", { rodCapacity: 20 });
		mockLightningRods.push(smallRod, bigRod);

		powerSystem(0);

		expect(bigRod.lightningRod.currentOutput).toBeGreaterThan(
			smallRod.lightningRod.currentOutput,
		);
		expect(bigRod.lightningRod.currentOutput).toBeCloseTo(
			smallRod.lightningRod.currentOutput * 4,
		);
	});

	it("rod output changes with storm intensity across ticks", () => {
		const rod = makeRod("rod-1", { rodCapacity: 10 });
		mockLightningRods.push(rod);

		powerSystem(0);
		const output1 = rod.lightningRod.currentOutput;

		// Run many ticks to find a different output
		let foundDifferent = false;
		for (let tick = 1; tick < 500; tick++) {
			powerSystem(tick);
			if (Math.abs(rod.lightningRod.currentOutput - output1) > 0.01) {
				foundDifferent = true;
				break;
			}
		}
		expect(foundDifferent).toBe(true);
	});

	it("zero capacity rod produces zero output", () => {
		const rod = makeRod("rod-zero", { rodCapacity: 0 });
		mockLightningRods.push(rod);

		powerSystem(50);

		expect(rod.lightningRod.currentOutput).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Total power generation
// ---------------------------------------------------------------------------

describe("total power generation", () => {
	it("sums output across multiple rods", () => {
		const rod1 = makeRod("rod-1", { rodCapacity: 10 });
		const rod2 = makeRod("rod-2", { rodCapacity: 5 });
		mockLightningRods.push(rod1, rod2);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		const expectedTotal =
			rod1.lightningRod.currentOutput + rod2.lightningRod.currentOutput;
		expect(snapshot.totalGeneration).toBeCloseTo(
			Math.round(expectedTotal * 10) / 10,
			1,
		);
	});

	it("reports correct rod count", () => {
		mockLightningRods.push(
			makeRod("r1"),
			makeRod("r2"),
			makeRod("r3"),
		);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.rodCount).toBe(3);
	});

	it("generation is zero with no rods", () => {
		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalGeneration).toBe(0);
		expect(snapshot.rodCount).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Power demand calculations
// ---------------------------------------------------------------------------

describe("power demand", () => {
	it("fabrication_unit demands 3 power", () => {
		const building = makeBuilding("fab-1", "fabrication_unit");
		mockBuildings.push(building);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalDemand).toBeCloseTo(3);
	});

	it("lightning_rod demands 0 power", () => {
		// Lightning rods generate, they don't consume
		const rod = makeRod("rod-1");
		mockLightningRods.push(rod);
		// Also add as a building (rod entities appear in both queries)
		mockBuildings.push({
			...rod,
			building: { ...rod.building, type: "lightning_rod" },
		} as BuildingEntity);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		// Only the rod generation, no demand from it
		// Demand should be 0 since lightning_rod type returns 0
		expect(snapshot.totalDemand).toBe(0);
	});

	it("default building demands 1 power", () => {
		const building = makeBuilding("gen-1", "some_building");
		mockBuildings.push(building);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalDemand).toBeCloseTo(1);
	});

	it("only counts operational buildings", () => {
		const building = makeBuilding("b1", "fabrication_unit", {
			operational: false,
		});
		mockBuildings.push(building);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		// Non-operational building should not contribute demand
		expect(snapshot.totalDemand).toBe(0);
	});

	it("sums demand across multiple buildings", () => {
		mockBuildings.push(
			makeBuilding("fab-1", "fabrication_unit"), // 3
			makeBuilding("gen-1", "outpost"), // 1
			makeBuilding("gen-2", "outpost"), // 1
		);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalDemand).toBeCloseTo(5);
	});

	it("unit base demand is 0.5", () => {
		const unit = makeUnit("u1", { moving: false });
		mockUnits.push(unit);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalDemand).toBeCloseTo(0.5);
	});

	it("moving unit demands 0.5 + 0.3 = 0.8", () => {
		const unit = makeUnit("u1", { moving: true });
		mockUnits.push(unit);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalDemand).toBeCloseTo(0.8);
	});

	it("fabrication_unit type units are skipped (counted via building)", () => {
		const unit = makeUnit("fab-u1", { type: "fabrication_unit" });
		mockUnits.push(unit);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		// fabrication_unit units are skipped in unit demand calculation
		expect(snapshot.totalDemand).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Radius-based power distribution
// ---------------------------------------------------------------------------

describe("power distribution (radius-based)", () => {
	it("powers buildings within rod radius", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 12,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		const building = makeBuilding("b1", "outpost", { x: 5, z: 0 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(true);
		expect(building.building.operational).toBe(true);
	});

	it("does NOT power buildings outside rod radius", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 12,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		const building = makeBuilding("b1", "outpost", { x: 20, z: 0 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(false);
	});

	it("building exactly at radius boundary is powered", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 10,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		// Distance = exactly 10
		const building = makeBuilding("b1", "outpost", { x: 10, z: 0 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(true);
	});

	it("building just beyond radius boundary is NOT powered", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 10,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		// Distance = 10.01, just outside
		const building = makeBuilding("b1", "outpost", { x: 10.01, z: 0 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(false);
	});

	it("uses Euclidean distance (x and z)", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 10,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		// Distance = sqrt(6^2 + 8^2) = sqrt(100) = 10
		const building = makeBuilding("b1", "outpost", { x: 6, z: 8 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(true);
	});

	it("uses custom protectionRadius when set", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 5,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		const nearBuilding = makeBuilding("b1", "outpost", { x: 4, z: 0 });
		const farBuilding = makeBuilding("b2", "outpost", { x: 7, z: 0 });
		mockBuildings.push(nearBuilding, farBuilding);

		powerSystem(0);

		expect(nearBuilding.building.powered).toBe(true);
		expect(farBuilding.building.powered).toBe(false);
	});

	it("multiple rods can power different buildings", () => {
		const rod1 = makeRod("rod-1", {
			protectionRadius: 5,
			x: 0,
			z: 0,
		});
		const rod2 = makeRod("rod-2", {
			protectionRadius: 5,
			x: 20,
			z: 0,
		});
		mockLightningRods.push(rod1, rod2);

		const b1 = makeBuilding("b1", "outpost", { x: 3, z: 0 });
		const b2 = makeBuilding("b2", "outpost", { x: 18, z: 0 });
		const b3 = makeBuilding("b3", "outpost", { x: 10, z: 0 }); // too far from both
		mockBuildings.push(b1, b2, b3);

		powerSystem(0);

		expect(b1.building.powered).toBe(true);
		expect(b2.building.powered).toBe(true);
		expect(b3.building.powered).toBe(false);
	});

	it("resets building powered state each tick", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 5,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		const building = makeBuilding("b1", "outpost", { x: 3, z: 0 });
		mockBuildings.push(building);

		// First tick: powered
		powerSystem(0);
		expect(building.building.powered).toBe(true);

		// Remove the rod, building should lose power
		mockLightningRods.length = 0;
		powerSystem(1);
		expect(building.building.powered).toBe(false);
	});

	it("lightning_rod buildings are NOT unpowered during distribution", () => {
		const rod = makeRod("rod-1", { x: 0, z: 0 });
		mockLightningRods.push(rod);
		// Add the rod as a building too (it has building component)
		mockBuildings.push({
			...rod,
		} as BuildingEntity);

		powerSystem(0);

		// The rod building should not be marked unpowered (it's skipped in distribution)
		// The building distribution skips lightning_rod type
		expect(rod.building.powered).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// PowerSnapshot accuracy
// ---------------------------------------------------------------------------

describe("PowerSnapshot", () => {
	it("reports correct poweredBuildingCount", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 10,
			x: 0,
			z: 0,
		});
		mockLightningRods.push(rod);

		// 2 buildings within range, 1 outside
		mockBuildings.push(
			makeBuilding("b1", "outpost", { x: 3, z: 0 }),
			makeBuilding("b2", "outpost", { x: 5, z: 0 }),
			makeBuilding("b3", "outpost", { x: 50, z: 0 }),
		);

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.poweredBuildingCount).toBe(2);
	});

	it("rounds generation and demand to 1 decimal place", () => {
		const rod = makeRod("rod-1", { rodCapacity: 10 });
		mockLightningRods.push(rod);

		mockBuildings.push(makeBuilding("b1", "fabrication_unit"));

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		// Check that values are rounded to 1 decimal
		const genStr = snapshot.totalGeneration.toString();
		const decimalPart = genStr.split(".")[1] ?? "";
		expect(decimalPart.length).toBeLessThanOrEqual(1);
	});

	it("stormIntensity is rounded to 2 decimal places", () => {
		powerSystem(0);
		const snapshot = getPowerSnapshot();

		const intensityStr = snapshot.stormIntensity.toString();
		const decimalPart = intensityStr.split(".")[1] ?? "";
		expect(decimalPart.length).toBeLessThanOrEqual(2);
	});

	it("snapshot updates each tick", () => {
		const rod = makeRod("rod-1", { rodCapacity: 10 });
		mockLightningRods.push(rod);

		powerSystem(0);
		const snap1 = { ...getPowerSnapshot() };

		// Run many ticks to find a different snapshot
		let found = false;
		for (let tick = 1; tick < 200; tick++) {
			powerSystem(tick);
			const snap2 = getPowerSnapshot();
			if (snap2.totalGeneration !== snap1.totalGeneration) {
				found = true;
				break;
			}
		}
		expect(found).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("no rods, no buildings, no units — empty snapshot", () => {
		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalGeneration).toBe(0);
		expect(snapshot.totalDemand).toBe(0);
		expect(snapshot.rodCount).toBe(0);
		expect(snapshot.poweredBuildingCount).toBe(0);
	});

	it("buildings with no rods are all unpowered", () => {
		mockBuildings.push(
			makeBuilding("b1", "outpost", { x: 0, z: 0 }),
			makeBuilding("b2", "outpost", { x: 5, z: 5 }),
		);

		powerSystem(0);

		for (const b of mockBuildings) {
			expect(b.building.powered).toBe(false);
		}
	});

	it("rods with no buildings produce power but powered count is 0", () => {
		mockLightningRods.push(makeRod("rod-1", { rodCapacity: 10 }));

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.totalGeneration).toBeGreaterThan(0);
		expect(snapshot.poweredBuildingCount).toBe(0);
	});

	it("very large rodCapacity produces proportionally large output", () => {
		const rod = makeRod("rod-huge", { rodCapacity: 1000 });
		mockLightningRods.push(rod);

		powerSystem(0);

		expect(rod.lightningRod.currentOutput).toBeGreaterThan(500);
	});

	it("many rods at same position all produce power", () => {
		for (let i = 0; i < 10; i++) {
			mockLightningRods.push(
				makeRod(`rod-${i}`, { rodCapacity: 5, x: 0, z: 0 }),
			);
		}

		powerSystem(0);
		const snapshot = getPowerSnapshot();

		expect(snapshot.rodCount).toBe(10);
		// Each rod produces 5 * stormIntensity
		const expectedPerRod = 5 * getStormIntensity();
		const expectedTotal = expectedPerRod * 10;
		expect(snapshot.totalGeneration).toBeCloseTo(
			Math.round(expectedTotal * 10) / 10,
			1,
		);
	});

	it("building at rod position (distance 0) is powered", () => {
		const rod = makeRod("rod-1", {
			protectionRadius: 1,
			x: 10,
			z: 10,
		});
		mockLightningRods.push(rod);

		const building = makeBuilding("b1", "outpost", { x: 10, z: 10 });
		mockBuildings.push(building);

		powerSystem(0);

		expect(building.building.powered).toBe(true);
	});
});
