import { beforeEach, describe, expect, it } from "vitest";
import {
	computeInfluenceMap,
	findHighValueTile,
	getTopTiles,
	needsRefresh,
	getFactionInfluenceMap,
	resetInfluenceMaps,
	type InfluenceInput,
	type InfluenceMap,
} from "../planning/influenceMap";
import type { GeneratedBoard, TileData } from "../../board/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTile(
	x: number,
	z: number,
	passable = true,
): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable,
		floorType: "durasteel_span",
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

function makeBoard(width: number, height: number, impassable: Array<[number, number]> = []): GeneratedBoard {
	const impassableSet = new Set(impassable.map(([x, z]) => `${x},${z}`));
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push(makeTile(x, z, !impassableSet.has(`${x},${z}`)));
		}
		tiles.push(row);
	}
	return {
		config: { width, height, seed: "test", difficulty: "normal" },
		tiles,
	};
}

function makeInput(overrides: Partial<InfluenceInput> = {}): InfluenceInput {
	return {
		deposits: [],
		enemies: [],
		factionCenter: { x: 5, z: 5 },
		friendlies: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeInfluenceMap", () => {
	beforeEach(() => {
		resetInfluenceMaps();
	});

	it("produces a grid of correct dimensions", () => {
		const board = makeBoard(10, 8);
		const map = computeInfluenceMap(board, makeInput(), 1);
		expect(map.width).toBe(10);
		expect(map.height).toBe(8);
		expect(map.cells.length).toBe(8);
		expect(map.cells[0].length).toBe(10);
	});

	it("marks impassable tiles with value -1", () => {
		const board = makeBoard(5, 5, [[2, 2]]);
		const map = computeInfluenceMap(board, makeInput(), 1);
		expect(map.cells[2][2].value).toBe(-1);
	});

	it("tiles near deposits have higher resourceScore", () => {
		const board = makeBoard(10, 10);
		const input = makeInput({ deposits: [{ x: 3, z: 3 }] });
		const map = computeInfluenceMap(board, input, 1);

		const nearDeposit = map.cells[3][4]; // adjacent
		const farFromDeposit = map.cells[9][9]; // far away
		expect(nearDeposit.resourceScore).toBeGreaterThan(farFromDeposit.resourceScore);
	});

	it("tiles near enemies have higher threatScore", () => {
		const board = makeBoard(10, 10);
		const input = makeInput({ enemies: [{ x: 5, z: 5 }] });
		const map = computeInfluenceMap(board, input, 1);

		const nearEnemy = map.cells[5][6];
		const farFromEnemy = map.cells[0][0];
		expect(nearEnemy.threatScore).toBeGreaterThan(farFromEnemy.threatScore);
	});

	it("enemy threat reduces combined value", () => {
		const board = makeBoard(10, 10);
		// Same resource but one location has enemy nearby
		const input = makeInput({
			deposits: [{ x: 3, z: 3 }, { x: 7, z: 7 }],
			enemies: [{ x: 3, z: 4 }],
		});
		const map = computeInfluenceMap(board, input, 1);

		const nearEnemyAndDeposit = map.cells[3][3];
		const safeDeposit = map.cells[7][7];
		// Safe deposit should have higher value than the threatened one
		expect(safeDeposit.value).toBeGreaterThan(nearEnemyAndDeposit.value);
	});

	it("frontier tiles have higher frontierScore", () => {
		const board = makeBoard(20, 20);
		const input = makeInput({ factionCenter: { x: 10, z: 10 } });
		const map = computeInfluenceMap(board, input, 1);

		const atCenter = map.cells[10][10];
		const atEdge = map.cells[0][0];
		expect(atEdge.frontierScore).toBeGreaterThan(atCenter.frontierScore);
	});

	it("chokepoints (2 or fewer neighbors) have high chokeScore", () => {
		// Create a narrow corridor
		const board = makeBoard(5, 5, [
			[0, 1], [1, 1], [3, 1], [4, 1], // wall with gap at (2,1)
			[0, 3], [1, 3], [3, 3], [4, 3], // wall with gap at (2,3)
		]);
		const map = computeInfluenceMap(board, makeInput(), 1);

		// The corridor tile at (2,2) has neighbors: up(2,1)=passable, down(2,3)=passable, left(1,2), right(3,2)
		// Both left and right are passable, so 4 neighbors — not a choke
		// The gap tiles at (2,1) have: up(2,0)=passable, down(2,2)=passable, left(1,1)=impassable, right(3,1)=impassable
		// → 2 neighbors = chokepoint
		expect(map.cells[1][2].chokeScore).toBe(1); // chokepoint
	});

	it("records computedAtTurn", () => {
		const board = makeBoard(5, 5);
		const map = computeInfluenceMap(board, makeInput(), 42);
		expect(map.computedAtTurn).toBe(42);
	});
});

describe("findHighValueTile", () => {
	it("returns the highest-value tile in the region", () => {
		const board = makeBoard(10, 10);
		const input = makeInput({ deposits: [{ x: 7, z: 7 }] });
		const map = computeInfluenceMap(board, input, 1);

		const result = findHighValueTile(map, 5, 5, 9, 9);
		expect(result).not.toBeNull();
		// The returned tile should have positive value and be within the search region
		if (result) {
			expect(result.value).toBeGreaterThan(0);
			expect(result.x).toBeGreaterThanOrEqual(5);
			expect(result.x).toBeLessThanOrEqual(9);
			expect(result.z).toBeGreaterThanOrEqual(5);
			expect(result.z).toBeLessThanOrEqual(9);
		}
	});

	it("returns null for fully impassable region", () => {
		const board = makeBoard(5, 5, [[1, 1], [2, 1], [1, 2], [2, 2]]);
		const map = computeInfluenceMap(board, makeInput(), 1);
		const result = findHighValueTile(map, 1, 1, 2, 2);
		expect(result).toBeNull();
	});

	it("clamps to board bounds", () => {
		const board = makeBoard(5, 5);
		const map = computeInfluenceMap(board, makeInput(), 1);
		// Search beyond board bounds — should not crash
		const result = findHighValueTile(map, -5, -5, 20, 20);
		expect(result).not.toBeNull();
	});
});

describe("getTopTiles", () => {
	it("returns requested number of tiles sorted by value", () => {
		const board = makeBoard(10, 10);
		const input = makeInput({
			deposits: [{ x: 2, z: 2 }, { x: 8, z: 8 }],
		});
		const map = computeInfluenceMap(board, input, 1);

		const top = getTopTiles(map, 5);
		expect(top.length).toBe(5);
		// Should be in descending order
		for (let i = 1; i < top.length; i++) {
			expect(top[i].value).toBeLessThanOrEqual(top[i - 1].value);
		}
	});

	it("returns fewer tiles if not enough positive-value tiles exist", () => {
		const board = makeBoard(2, 2, [[0, 0], [1, 0], [0, 1]]); // only (1,1) passable
		const map = computeInfluenceMap(board, makeInput(), 1);
		const top = getTopTiles(map, 10);
		expect(top.length).toBeLessThanOrEqual(1);
	});
});

describe("needsRefresh", () => {
	it("returns true when map is null", () => {
		expect(needsRefresh(null, 1)).toBe(true);
	});

	it("returns false within refresh interval", () => {
		const board = makeBoard(5, 5);
		const map = computeInfluenceMap(board, makeInput(), 5);
		expect(needsRefresh(map, 10)).toBe(false);
	});

	it("returns true after refresh interval", () => {
		const board = makeBoard(5, 5);
		const map = computeInfluenceMap(board, makeInput(), 5);
		expect(needsRefresh(map, 16)).toBe(true);
	});
});

describe("getFactionInfluenceMap", () => {
	beforeEach(() => {
		resetInfluenceMaps();
	});

	it("caches and returns same map within refresh interval", () => {
		const board = makeBoard(5, 5);
		const input = makeInput();

		const map1 = getFactionInfluenceMap("reclaimers", board, input, 1);
		const map2 = getFactionInfluenceMap("reclaimers", board, input, 5);
		expect(map2).toBe(map1); // Same reference — cached
	});

	it("recomputes after refresh interval", () => {
		const board = makeBoard(5, 5);
		const input = makeInput();

		const map1 = getFactionInfluenceMap("reclaimers", board, input, 1);
		const map2 = getFactionInfluenceMap("reclaimers", board, input, 12);
		expect(map2).not.toBe(map1); // Different reference — recomputed
		expect(map2.computedAtTurn).toBe(12);
	});

	it("maintains separate maps per faction", () => {
		const board = makeBoard(5, 5);
		const input1 = makeInput({ factionCenter: { x: 1, z: 1 } });
		const input2 = makeInput({ factionCenter: { x: 4, z: 4 } });

		const map1 = getFactionInfluenceMap("reclaimers", board, input1, 1);
		const map2 = getFactionInfluenceMap("iron_creed", board, input2, 1);
		expect(map1).not.toBe(map2);
	});
});
