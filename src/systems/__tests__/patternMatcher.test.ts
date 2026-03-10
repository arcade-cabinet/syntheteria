/**
 * Unit tests for the 3D pattern matcher.
 *
 * Tests cover:
 * - matchBlueprint: returns matching blueprint when pattern found
 * - matchBlueprint: returns null when no match
 * - Rotation: tries all 4 Y-axis rotations (0, 90, 180, 270)
 * - Underscore: matches empty slots
 * - Material types: must match exactly
 * - rotatePattern90: correct 90-degree Y-axis rotation
 * - Edge cases: empty pattern, single cell, multi-layer (3D stacking)
 */

import { type GridCoord, gridKey } from "../gridSnap";
import {
	type Blueprint,
	matchBlueprint,
	rotatePattern90,
} from "../patternMatcher";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a world grid from an array of [coord, material] pairs. */
function makeGrid(
	entries: [GridCoord, string][],
): Map<string, string> {
	const grid = new Map<string, string>();
	for (const [coord, material] of entries) {
		grid.set(gridKey(coord), material);
	}
	return grid;
}

// ---------------------------------------------------------------------------
// Test blueprints (not imported from JSON — passed as parameters)
// ---------------------------------------------------------------------------

const BASIC_MINER: Blueprint = {
	id: "basic_miner",
	name: "Basic Miner",
	pattern: [[["scrap_iron", "scrap_iron"]]],
	result: "miner",
};

const BASIC_FABRICATOR: Blueprint = {
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

const TURRET: Blueprint = {
	id: "turret",
	name: "Turret",
	pattern: [
		[["scrap_iron"]],
		[["scrap_iron"]],
		[["titanium"]],
	],
	result: "turret",
};

const ALL_BLUEPRINTS: Blueprint[] = [BASIC_MINER, BASIC_FABRICATOR, TURRET];

// ---------------------------------------------------------------------------
// rotatePattern90
// ---------------------------------------------------------------------------

describe("rotatePattern90", () => {
	it("rotates a 1x1x2 pattern (2 along X) into 1x2x1 (2 along Z)", () => {
		// Before: one layer, one row, two columns [["A", "B"]]
		// After 90 CW: one layer, two rows, one column [["A"], ["B"]]
		// Actually: new[newZ][newX] where newZ=old_x, newX=(maxZ - old_z)
		// old layer: z=0 row: ["A","B"]
		// newZ=0 (old_x=0): newX=0 (maxZ - old_z = 0 - 0 = 0) -> layer[0][0] = "A"
		// newZ=1 (old_x=1): newX=0 (maxZ - old_z = 0 - 0 = 0) -> layer[0][1] = "B"
		const pattern: string[][][] = [[["A", "B"]]];
		const rotated = rotatePattern90(pattern);
		expect(rotated).toEqual([[["A"], ["B"]]]);
	});

	it("rotates a 1x2x1 pattern into 1x1x2", () => {
		// Before: [["A"], ["B"]] (2 rows along Z, 1 column)
		// After 90 CW:
		// newZ=0 (old_x=0): newX=0 (maxZ=1, old_z=1): layer[1][0]="B", newX=1 (old_z=0): layer[0][0]="A"
		// Result: [["B", "A"]]
		const pattern: string[][][] = [[["A"], ["B"]]];
		const rotated = rotatePattern90(pattern);
		expect(rotated).toEqual([[["B", "A"]]]);
	});

	it("rotates a 2x2 layer correctly (90 CW from above)", () => {
		// Before:  [["A", "B"],
		//           ["C", "D"]]
		// 90 CW:   [["C", "A"],
		//           ["D", "B"]]
		const pattern: string[][][] = [
			[
				["A", "B"],
				["C", "D"],
			],
		];
		const rotated = rotatePattern90(pattern);
		expect(rotated).toEqual([
			[
				["C", "A"],
				["D", "B"],
			],
		]);
	});

	it("four rotations return to original", () => {
		const pattern: string[][][] = [
			[
				["A", "B"],
				["C", "D"],
			],
		];
		let current = pattern;
		for (let i = 0; i < 4; i++) {
			current = rotatePattern90(current);
		}
		expect(current).toEqual(pattern);
	});

	it("preserves Y layers independently", () => {
		// Two Y layers, each 1x2
		const pattern: string[][][] = [
			[["A", "B"]],
			[["C", "D"]],
		];
		const rotated = rotatePattern90(pattern);
		// Each layer rotated independently
		expect(rotated).toEqual([
			[["A"], ["B"]],
			[["C"], ["D"]],
		]);
	});

	it("handles empty pattern", () => {
		expect(rotatePattern90([])).toEqual([]);
	});

	it("handles single cell", () => {
		const pattern: string[][][] = [[["X"]]];
		const rotated = rotatePattern90(pattern);
		expect(rotated).toEqual([[["X"]]]);
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — basic matching
// ---------------------------------------------------------------------------

describe("matchBlueprint", () => {
	it("returns matching blueprint when pattern found", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, ALL_BLUEPRINTS);

		expect(result).not.toBeNull();
		expect(result!.blueprint.id).toBe("basic_miner");
		expect(result!.rotation).toBe(0);
		expect(result!.cubeCoords).toHaveLength(2);
	});

	it("returns null when no match", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "copper"],
			[{ x: 1, y: 0, z: 0 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, ALL_BLUEPRINTS);

		expect(result).toBeNull();
	});

	it("returns null for empty grid", () => {
		const grid = new Map<string, string>();
		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, ALL_BLUEPRINTS);
		expect(result).toBeNull();
	});

	it("returns null for empty blueprints array", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
		]);
		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, []);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — material type matching
// ---------------------------------------------------------------------------

describe("matchBlueprint — material types", () => {
	it("requires exact material match", () => {
		// Miner needs scrap_iron, scrap_iron — copper won't work
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [BASIC_MINER]);
		expect(result).toBeNull();
	});

	it("matches 2x2 fabricator pattern", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "copper"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 0, z: 1 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 1 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [BASIC_FABRICATOR]);

		expect(result).not.toBeNull();
		expect(result!.blueprint.id).toBe("basic_fabricator");
		expect(result!.cubeCoords).toHaveLength(4);
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — Y-axis rotation
// ---------------------------------------------------------------------------

describe("matchBlueprint — rotations", () => {
	it("matches at 0 degrees (no rotation needed)", () => {
		// Miner: [[["scrap_iron", "scrap_iron"]]] — 2 cubes along X
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [BASIC_MINER]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(0);
	});

	it("matches at 90 degrees", () => {
		// Miner pattern is 2 along X. At 90 CW, it becomes 2 along Z.
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 0, z: 1 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [BASIC_MINER]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(90);
	});

	it("matches asymmetric pattern at 90 degrees", () => {
		// Use a pattern where rotation matters:
		// L-shape: [[["A", "B"], ["C", "_"]]]
		const lShape: Blueprint = {
			id: "l_shape",
			name: "L Shape",
			pattern: [
				[
					["scrap_iron", "copper"],
					["scrap_iron", "_"],
				],
			],
			result: "l_thing",
		};

		// Original: z=0: [iron, copper], z=1: [iron, _]
		// 90 CW: z=0: [iron, iron], z=1: [_, copper]
		// So at 90 degrees, we need: (0,0,0)=iron, (1,0,0)=iron, (1,0,1)=copper
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 1 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [lShape]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(90);
		expect(result!.cubeCoords).toHaveLength(3);
	});

	it("matches at 180 degrees", () => {
		// L-shape original: z=0:[iron,copper], z=1:[iron,_]
		// 180 CW (two rotations): z=0:[_,iron], z=1:[copper,iron]
		const lShape: Blueprint = {
			id: "l_shape",
			name: "L Shape",
			pattern: [
				[
					["scrap_iron", "copper"],
					["scrap_iron", "_"],
				],
			],
			result: "l_thing",
		};

		// At 180: need (1,0,0)=iron, (0,0,1)=copper, (1,0,1)=iron
		// and (0,0,0) must be empty
		const grid = makeGrid([
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 0, z: 1 }, "copper"],
			[{ x: 1, y: 0, z: 1 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [lShape]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(180);
	});

	it("matches at 270 degrees", () => {
		// L-shape original: z=0:[iron,copper], z=1:[iron,_]
		// 270 CW (three rotations): z=0:[copper,_], z=1:[iron,iron]
		const lShape: Blueprint = {
			id: "l_shape",
			name: "L Shape",
			pattern: [
				[
					["scrap_iron", "copper"],
					["scrap_iron", "_"],
				],
			],
			result: "l_thing",
		};

		// At 270: need (0,0,0)=copper, (0,0,1)=iron, (1,0,1)=iron
		// and (1,0,0) must be empty
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "copper"],
			[{ x: 0, y: 0, z: 1 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 1 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [lShape]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(270);
	});

	it("returns first rotation that matches (prefers 0)", () => {
		// Symmetric pattern: matches at all rotations
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 0, z: 1 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 1 }, "scrap_iron"],
		]);

		const sym: Blueprint = {
			id: "sym",
			name: "Symmetric",
			pattern: [
				[
					["scrap_iron", "scrap_iron"],
					["scrap_iron", "scrap_iron"],
				],
			],
			result: "sym",
		};

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [sym]);
		expect(result).not.toBeNull();
		expect(result!.rotation).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — underscore (empty slot)
// ---------------------------------------------------------------------------

describe("matchBlueprint — underscore matches empty", () => {
	it("underscore matches when no cube is present", () => {
		// Pattern with underscore: [[["iron", "_"]]]
		const bp: Blueprint = {
			id: "half",
			name: "Half",
			pattern: [[["scrap_iron", "_"]]],
			result: "half",
		};

		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			// x=1,y=0,z=0 is empty — underscore should match
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [bp]);
		expect(result).not.toBeNull();
		expect(result!.cubeCoords).toHaveLength(1);
		expect(result!.cubeCoords[0]).toEqual({ x: 0, y: 0, z: 0 });
	});

	it("underscore fails when a cube IS present", () => {
		const bp: Blueprint = {
			id: "half",
			name: "Half",
			pattern: [[["scrap_iron", "_"]]],
			result: "half",
		};

		// Occupy both adjacent positions so no rotation can match the
		// underscore (empty) requirement — (1,0,0) blocks 0 deg,
		// (0,0,1) blocks 90 deg.
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "copper"],
			[{ x: 0, y: 0, z: 1 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [bp]);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — multi-layer (Y stacking)
// ---------------------------------------------------------------------------

describe("matchBlueprint — multi-layer patterns", () => {
	it("matches turret pattern (3 Y layers)", () => {
		// Turret: layer 0 = iron, layer 1 = iron, layer 2 = titanium
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 1, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 2, z: 0 }, "titanium"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [TURRET]);

		expect(result).not.toBeNull();
		expect(result!.blueprint.id).toBe("turret");
		expect(result!.cubeCoords).toHaveLength(3);
	});

	it("fails turret with wrong top material", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 1, z: 0 }, "scrap_iron"],
			[{ x: 0, y: 2, z: 0 }, "copper"], // should be titanium
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [TURRET]);
		expect(result).toBeNull();
	});

	it("fails turret when middle layer missing", () => {
		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			// y=1 missing
			[{ x: 0, y: 2, z: 0 }, "titanium"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [TURRET]);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — anchor offset
// ---------------------------------------------------------------------------

describe("matchBlueprint — anchor offset", () => {
	it("matches pattern at non-origin anchor", () => {
		const grid = makeGrid([
			[{ x: 5, y: 3, z: 7 }, "scrap_iron"],
			[{ x: 6, y: 3, z: 7 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 5, y: 3, z: 7 }, [BASIC_MINER]);

		expect(result).not.toBeNull();
		expect(result!.blueprint.id).toBe("basic_miner");
		expect(result!.cubeCoords).toEqual([
			{ x: 5, y: 3, z: 7 },
			{ x: 6, y: 3, z: 7 },
		]);
	});

	it("matches pattern at negative anchor", () => {
		const grid = makeGrid([
			[{ x: -2, y: 0, z: -3 }, "scrap_iron"],
			[{ x: -1, y: 0, z: -3 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: -2, y: 0, z: -3 }, [BASIC_MINER]);

		expect(result).not.toBeNull();
		expect(result!.blueprint.id).toBe("basic_miner");
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — cubeCoords correctness
// ---------------------------------------------------------------------------

describe("matchBlueprint — cubeCoords", () => {
	it("cubeCoords excludes underscore positions", () => {
		const bp: Blueprint = {
			id: "gap",
			name: "Gap",
			pattern: [[["scrap_iron", "_", "copper"]]],
			result: "gap",
		};

		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			// x=1 is empty (underscore)
			[{ x: 2, y: 0, z: 0 }, "copper"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [bp]);

		expect(result).not.toBeNull();
		expect(result!.cubeCoords).toHaveLength(2);
		expect(result!.cubeCoords).toEqual([
			{ x: 0, y: 0, z: 0 },
			{ x: 2, y: 0, z: 0 },
		]);
	});
});

// ---------------------------------------------------------------------------
// matchBlueprint — priority (first blueprint wins)
// ---------------------------------------------------------------------------

describe("matchBlueprint — blueprint priority", () => {
	it("returns the first matching blueprint in the list", () => {
		// Both miner and a duplicate would match
		const miner2: Blueprint = {
			id: "miner_v2",
			name: "Miner V2",
			pattern: [[["scrap_iron", "scrap_iron"]]],
			result: "miner_v2",
		};

		const grid = makeGrid([
			[{ x: 0, y: 0, z: 0 }, "scrap_iron"],
			[{ x: 1, y: 0, z: 0 }, "scrap_iron"],
		]);

		const result = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [BASIC_MINER, miner2]);
		expect(result!.blueprint.id).toBe("basic_miner");

		// Reversed order
		const result2 = matchBlueprint(grid, { x: 0, y: 0, z: 0 }, [miner2, BASIC_MINER]);
		expect(result2!.blueprint.id).toBe("miner_v2");
	});
});
