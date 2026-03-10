import {
	_resetPlacementGrid,
	getCubeAt,
	placeCube,
	removeCube,
} from "../cubePlacement";
import type { GridCoord } from "../gridSnap";
import {
	_resetMachineState,
	assembleMachine,
	disassembleMachine,
	getAllMachines,
	getMachine,
	MATERIAL_QUALITY,
} from "../machineAssembly";
import type { Blueprint, MatchResult } from "../patternMatcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a MatchResult for testing with the given blueprint and cube coords. */
function makeMatchResult(
	blueprint: Blueprint,
	cubeCoords: GridCoord[],
	rotation = 0,
): MatchResult {
	return { blueprint, rotation, cubeCoords };
}

/** Adapter: look up material at a grid coord via cubePlacement. */
function getCubeMaterial(coord: GridCoord): string | undefined {
	const data = getCubeAt(coord);
	return data?.material;
}

/** Adapter: remove a cube via cubePlacement. */
function removeCubeAt(coord: GridCoord): void {
	removeCube(coord);
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const minerBlueprint: Blueprint = {
	id: "basic_miner",
	name: "Basic Miner",
	pattern: [[["scrap_iron", "scrap_iron"]]],
	result: "miner",
};

const fabricatorBlueprint: Blueprint = {
	id: "basic_fabricator",
	name: "Basic Fabricator",
	pattern: [
		[
			["copper", "scrap_iron"],
			["scrap_iron", "copper"],
		],
	],
	result: "fabricator",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("machineAssembly", () => {
	beforeEach(() => {
		_resetMachineState();
		_resetPlacementGrid();
	});

	describe("assembleMachine", () => {
		it("removes all constituent cube entities", () => {
			// Place two iron cubes side by side
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Both cubes should be removed from the grid
			expect(getCubeAt(c1)).toBeUndefined();
			expect(getCubeAt(c2)).toBeUndefined();
		});

		it("creates a machine entity at the anchor position", () => {
			const c1: GridCoord = { x: 5, y: 0, z: 3 };
			const c2: GridCoord = { x: 6, y: 0, z: 3 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Anchor should be the first cube coord
			expect(machine.anchor).toEqual(c1);
			expect(getMachine(machine.id)).toBeDefined();
		});

		it("sets machine type from blueprint.result", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			expect(machine.type).toBe("miner");
		});

		it("stats scale by material quality", () => {
			// Iron cubes (quality 1.0 each) => average 1.0
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const matchIron = makeMatchResult(minerBlueprint, [c1, c2]);
			const ironMachine = assembleMachine(
				matchIron,
				getCubeMaterial,
				removeCubeAt,
			);

			// Titanium has quality 2.0 — make a turret
			_resetMachineState();
			_resetPlacementGrid();

			const t1: GridCoord = { x: 0, y: 0, z: 0 };
			const t2: GridCoord = { x: 0, y: 0, z: 1 };
			const t3: GridCoord = { x: 0, y: 0, z: 2 };
			placeCube("t1", t1, "titanium");
			placeCube("t2", t2, "titanium");
			placeCube("t3", t3, "titanium");

			// Use a custom blueprint that accepts any arrangement of 3 titanium
			const titaniumBP: Blueprint = {
				id: "test_3tile",
				name: "Test 3-Tile",
				pattern: [[["titanium", "titanium", "titanium"]]],
				result: "test_machine",
			};
			const matchTi = makeMatchResult(titaniumBP, [t1, t2, t3]);
			const tiMachine = assembleMachine(matchTi, getCubeMaterial, removeCubeAt);

			// Iron quality = 1.0, Titanium quality = 2.0
			expect(ironMachine.stats.efficiency).toBeCloseTo(1.0);
			expect(tiMachine.stats.efficiency).toBeCloseTo(2.0);
			expect(tiMachine.stats.durability).toBeGreaterThan(
				ironMachine.stats.durability,
			);
		});

		it("stores machine in the registry and can be retrieved", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			expect(getMachine(machine.id)).toEqual(machine);
			expect(getAllMachines()).toHaveLength(1);
		});

		it("handles mixed material cubes and averages quality", () => {
			// copper (1.2) + scrap_iron (1.0) + scrap_iron (1.0) + copper (1.2) => avg 1.1
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			const c3: GridCoord = { x: 0, y: 0, z: 1 };
			const c4: GridCoord = { x: 1, y: 0, z: 1 };
			placeCube("c1", c1, "copper");
			placeCube("c2", c2, "scrap_iron");
			placeCube("c3", c3, "scrap_iron");
			placeCube("c4", c4, "copper");

			const match = makeMatchResult(fabricatorBlueprint, [c1, c2, c3, c4]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			const expectedQuality =
				(MATERIAL_QUALITY.copper +
					MATERIAL_QUALITY.scrap_iron +
					MATERIAL_QUALITY.scrap_iron +
					MATERIAL_QUALITY.copper) /
				4;
			expect(machine.stats.efficiency).toBeCloseTo(expectedQuality);
		});

		it("uses default quality for unknown materials", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("c1", c1, "unobtanium");
			placeCube("c2", c2, "unobtanium");

			const bp: Blueprint = {
				id: "test",
				name: "Test",
				pattern: [[["unobtanium", "unobtanium"]]],
				result: "test_machine",
			};
			const match = makeMatchResult(bp, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Default quality is 1.0
			expect(machine.stats.efficiency).toBeCloseTo(1.0);
		});
	});

	describe("disassembleMachine", () => {
		it("restores cubes at original positions", () => {
			const c1: GridCoord = { x: 3, y: 0, z: 4 };
			const c2: GridCoord = { x: 4, y: 0, z: 4 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Cubes are gone
			expect(getCubeAt(c1)).toBeUndefined();
			expect(getCubeAt(c2)).toBeUndefined();

			// Disassemble
			const restored = disassembleMachine(machine.id, placeCube);

			expect(restored).not.toBeNull();
			expect(restored).toHaveLength(2);

			// Cubes should be back
			const cube1 = getCubeAt(c1);
			const cube2 = getCubeAt(c2);
			expect(cube1).toBeDefined();
			expect(cube2).toBeDefined();
		});

		it("preserves material types on round-trip", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			const c3: GridCoord = { x: 0, y: 0, z: 1 };
			const c4: GridCoord = { x: 1, y: 0, z: 1 };
			placeCube("c1", c1, "copper");
			placeCube("c2", c2, "scrap_iron");
			placeCube("c3", c3, "scrap_iron");
			placeCube("c4", c4, "copper");

			const match = makeMatchResult(fabricatorBlueprint, [c1, c2, c3, c4]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Disassemble
			const restored = disassembleMachine(machine.id, placeCube);

			expect(restored).not.toBeNull();
			expect(restored).toHaveLength(4);

			// Check materials are preserved
			expect(getCubeAt(c1)?.material).toBe("copper");
			expect(getCubeAt(c2)?.material).toBe("scrap_iron");
			expect(getCubeAt(c3)?.material).toBe("scrap_iron");
			expect(getCubeAt(c4)?.material).toBe("copper");
		});

		it("removes machine from registry after disassembly", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			expect(getMachine(machine.id)).toBeDefined();

			disassembleMachine(machine.id, placeCube);

			expect(getMachine(machine.id)).toBeUndefined();
			expect(getAllMachines()).toHaveLength(0);
		});

		it("returns null for non-existent machine ID", () => {
			const result = disassembleMachine("nonexistent_id", placeCube);
			expect(result).toBeNull();
		});

		it("returns restored cube data with coordinates and materials", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			const restored = disassembleMachine(machine.id, placeCube);

			expect(restored).toEqual([
				{ coord: c1, material: "scrap_iron" },
				{ coord: c2, material: "scrap_iron" },
			]);
		});
	});

	describe("round-trip assembly/disassembly", () => {
		it("full round-trip preserves all cube positions and materials", () => {
			// Set up a 2x2 fabricator pattern
			const coords: GridCoord[] = [
				{ x: 10, y: 0, z: 10 },
				{ x: 11, y: 0, z: 10 },
				{ x: 10, y: 0, z: 11 },
				{ x: 11, y: 0, z: 11 },
			];
			const materials = ["copper", "scrap_iron", "scrap_iron", "copper"];

			for (let i = 0; i < coords.length; i++) {
				placeCube(`cube_${i}`, coords[i], materials[i]);
			}

			// Verify all placed
			for (const coord of coords) {
				expect(getCubeAt(coord)).toBeDefined();
			}

			// Assemble
			const match = makeMatchResult(fabricatorBlueprint, coords);
			const machine = assembleMachine(match, getCubeMaterial, removeCubeAt);

			// Verify all removed
			for (const coord of coords) {
				expect(getCubeAt(coord)).toBeUndefined();
			}

			// Disassemble
			const restored = disassembleMachine(machine.id, placeCube);

			// Verify all restored with correct materials
			expect(restored).toHaveLength(4);
			for (let i = 0; i < coords.length; i++) {
				const cube = getCubeAt(coords[i]);
				expect(cube).toBeDefined();
				expect(cube?.material).toBe(materials[i]);
			}
		});
	});

	describe("getMachine / getAllMachines", () => {
		it("returns undefined for unknown machine ID", () => {
			expect(getMachine("unknown")).toBeUndefined();
		});

		it("tracks multiple machines", () => {
			// Machine 1
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("a1", c1, "scrap_iron");
			placeCube("a2", c2, "scrap_iron");
			const match1 = makeMatchResult(minerBlueprint, [c1, c2]);
			const m1 = assembleMachine(match1, getCubeMaterial, removeCubeAt);

			// Machine 2
			const c3: GridCoord = { x: 5, y: 0, z: 5 };
			const c4: GridCoord = { x: 6, y: 0, z: 5 };
			placeCube("b1", c3, "scrap_iron");
			placeCube("b2", c4, "scrap_iron");
			const match2 = makeMatchResult(minerBlueprint, [c3, c4]);
			const m2 = assembleMachine(match2, getCubeMaterial, removeCubeAt);

			expect(getAllMachines()).toHaveLength(2);
			expect(getMachine(m1.id)).toBeDefined();
			expect(getMachine(m2.id)).toBeDefined();
			expect(m1.id).not.toBe(m2.id);
		});
	});

	describe("_resetMachineState", () => {
		it("clears all machines and resets ID counter", () => {
			const c1: GridCoord = { x: 0, y: 0, z: 0 };
			const c2: GridCoord = { x: 1, y: 0, z: 0 };
			placeCube("cube1", c1, "scrap_iron");
			placeCube("cube2", c2, "scrap_iron");

			const match = makeMatchResult(minerBlueprint, [c1, c2]);
			const m1 = assembleMachine(match, getCubeMaterial, removeCubeAt);

			expect(getAllMachines()).toHaveLength(1);

			_resetMachineState();

			expect(getAllMachines()).toHaveLength(0);
			expect(getMachine(m1.id)).toBeUndefined();

			// ID counter resets — next machine should get machine_1
			_resetPlacementGrid();
			placeCube("x1", c1, "scrap_iron");
			placeCube("x2", c2, "scrap_iron");
			const match2 = makeMatchResult(minerBlueprint, [c1, c2]);
			const m2 = assembleMachine(match2, getCubeMaterial, removeCubeAt);

			expect(m2.id).toBe("machine_1");
		});
	});
});
