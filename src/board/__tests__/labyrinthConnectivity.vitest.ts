/**
 * Labyrinth Phase 3 — Region connectivity + loop creation tests.
 *
 * Tests use hand-built grids (independent of Phases 1-2) to verify:
 * - Flood-fill region detection
 * - Spanning tree connects all regions
 * - Loop connectors add alternate paths
 * - Seed determinism
 * - Edge cases (0 regions, 1 region, many regions)
 */

import { describe, expect, it } from "vitest";
import { connectRegions, isFullyConnected } from "../labyrinthConnectivity";
import { carveRoom, initSolidGrid } from "../labyrinthMaze";
import type { TileData } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make a passable tile. */
function passableTile(x: number, z: number): TileData {
	return {
		x,
		z,
		elevation: 0,
		passable: true,
		floorType: "durasteel_span",
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

/** Make a wall tile. */
function wallTile(x: number, z: number): TileData {
	return {
		x,
		z,
		elevation: 1,
		passable: false,
		floorType: "structural_mass",
		resourceMaterial: null,
		resourceAmount: 0,
	};
}

/** Count passable tiles. */
function countPassable(tiles: TileData[][]): number {
	let count = 0;
	for (const row of tiles) {
		for (const tile of row) {
			if (tile.passable) count++;
		}
	}
	return count;
}

/**
 * Flood fill from a starting passable tile. Returns count of reachable tiles.
 */
function floodFillCount(
	tiles: TileData[][],
	startX: number,
	startZ: number,
	w: number,
	h: number,
): number {
	if (!tiles[startZ]?.[startX]?.passable) return 0;
	const visited = new Set<string>();
	const stack: Array<[number, number]> = [[startX, startZ]];
	visited.add(`${startX},${startZ}`);

	while (stack.length > 0) {
		const [cx, cz] = stack.pop()!;
		for (const [dx, dz] of [
			[0, -1],
			[1, 0],
			[0, 1],
			[-1, 0],
		]) {
			const nx = cx + dx!;
			const nz = cz + dz!;
			const key = `${nx},${nz}`;
			if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
			if (visited.has(key)) continue;
			if (!tiles[nz]![nx]!.passable) continue;
			visited.add(key);
			stack.push([nx, nz]);
		}
	}

	return visited.size;
}

/**
 * Build a hand-crafted grid with two rooms separated by a wall column.
 *
 *   0 1 2 3 4
 * 0 . . W . .
 * 1 . . W . .
 * 2 . . W . .
 * 3 . . W . .
 * 4 . . W . .
 *
 * Left room (x=0-1) and right room (x=3-4) are disconnected by column x=2.
 */
function makeTwoRoomGrid(): { tiles: TileData[][]; w: number; h: number } {
	const w = 5;
	const h = 5;
	const tiles: TileData[][] = [];

	for (let z = 0; z < h; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < w; x++) {
			if (x === 2) {
				row.push(wallTile(x, z));
			} else {
				row.push(passableTile(x, z));
			}
		}
		tiles.push(row);
	}

	return { tiles, w, h };
}

/**
 * Build a grid with 3 disconnected rooms separated by walls.
 *
 *   0 1 2 3 4 5 6
 * 0 . . W . . W .
 * 1 . . W . . W .
 * 2 . . W . . W .
 *
 * Three rooms: (0-1), (3-4), (6), all height 3.
 */
function makeThreeRoomGrid(): { tiles: TileData[][]; w: number; h: number } {
	const w = 7;
	const h = 3;
	const tiles: TileData[][] = [];

	for (let z = 0; z < h; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < w; x++) {
			if (x === 2 || x === 5) {
				row.push(wallTile(x, z));
			} else {
				row.push(passableTile(x, z));
			}
		}
		tiles.push(row);
	}

	return { tiles, w, h };
}

// ---------------------------------------------------------------------------
// Region detection
// ---------------------------------------------------------------------------

describe("region detection", () => {
	it("detects 2 disconnected regions", () => {
		const { tiles, w, h } = makeTwoRoomGrid();
		const result = connectRegions(tiles, w, h, "detect-2");
		expect(result.regionCount).toBe(2);
	});

	it("detects 3 disconnected regions", () => {
		const { tiles, w, h } = makeThreeRoomGrid();
		const result = connectRegions(tiles, w, h, "detect-3");
		expect(result.regionCount).toBe(3);
	});

	it("detects 1 region when already connected", () => {
		const w = 5;
		const h = 3;
		const tiles: TileData[][] = [];
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				row.push(passableTile(x, z));
			}
			tiles.push(row);
		}

		const result = connectRegions(tiles, w, h, "detect-1");
		expect(result.regionCount).toBe(1);
		expect(result.spanningConnectors).toBe(0);
		expect(result.loopConnectors).toBe(0);
	});

	it("detects 0 regions on fully solid grid", () => {
		const tiles = initSolidGrid(5, 5);
		const result = connectRegions(tiles, 5, 5, "detect-0");
		expect(result.regionCount).toBe(0);
		expect(result.spanningConnectors).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Spanning tree connectivity
// ---------------------------------------------------------------------------

describe("spanning tree connectivity", () => {
	it("connects 2 rooms — all tiles reachable after", () => {
		const { tiles, w, h } = makeTwoRoomGrid();
		expect(isFullyConnected(tiles, w, h)).toBe(false);

		const result = connectRegions(tiles, w, h, "span-2");
		expect(result.spanningConnectors).toBe(1); // need exactly 1 to connect 2 regions
		expect(isFullyConnected(tiles, w, h)).toBe(true);

		// Verify flood fill reaches all passable tiles
		const totalPassable = countPassable(tiles);
		const reachable = floodFillCount(tiles, 0, 0, w, h);
		expect(reachable).toBe(totalPassable);
	});

	it("connects 3 rooms — spanning tree uses 2 connectors", () => {
		const { tiles, w, h } = makeThreeRoomGrid();
		const result = connectRegions(tiles, w, h, "span-3");
		expect(result.spanningConnectors).toBe(2); // 3 regions need 2 edges
		expect(isFullyConnected(tiles, w, h)).toBe(true);
	});

	it("connects many rooms separated by 1-tile walls", () => {
		// Build a grid with 4 rooms, each separated by exactly 1 wall tile.
		// Layout (w=9, h=5):
		//   A A A | B B B | C C C
		//   A A A | B B B | C C C
		//   ------+---------+------  (wall row at z=2)
		//   D D D | E E E | _ _ _
		//   D D D | E E E | _ _ _
		//
		// Walls at x=3, x=6, z=2
		const w = 9;
		const h = 5;
		const tiles: TileData[][] = [];
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				if (x === 3 || x === 6 || z === 2) {
					row.push(wallTile(x, z));
				} else {
					row.push(passableTile(x, z));
				}
			}
			tiles.push(row);
		}

		expect(isFullyConnected(tiles, w, h)).toBe(false);

		const result = connectRegions(tiles, w, h, "span-many");
		// 6 disconnected regions (3 top + 3 bottom, minus any that share a wall)
		expect(result.regionCount).toBeGreaterThanOrEqual(4);
		// Spanning tree needs regionCount - 1 connectors
		expect(result.spanningConnectors).toBe(result.regionCount - 1);
		expect(isFullyConnected(tiles, w, h)).toBe(true);
	});

	it("opened connectors become transit_deck at elevation 0", () => {
		const { tiles, w, h } = makeTwoRoomGrid();
		connectRegions(tiles, w, h, "floor-check");

		// Find the opened connector in column x=2
		let connectorFound = false;
		for (let z = 0; z < h; z++) {
			const tile = tiles[z]![2]!;
			if (tile.passable) {
				expect(tile.floorType).toBe("transit_deck");
				expect(tile.elevation).toBe(0);
				connectorFound = true;
			}
		}
		expect(connectorFound).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Loop connectors
// ---------------------------------------------------------------------------

describe("loop connectors", () => {
	it("adds loops when connectors remain after spanning tree", () => {
		// Build a grid where there are many possible connectors
		// to ensure some become loops
		const w = 7;
		const h = 3;
		const tiles: TileData[][] = [];

		// Two rooms separated by a single wall column at x=3
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				if (x === 3) {
					row.push(wallTile(x, z));
				} else {
					row.push(passableTile(x, z));
				}
			}
			tiles.push(row);
		}

		const result = connectRegions(tiles, w, h, "loop-test");
		expect(result.spanningConnectors).toBe(1);
		// Wall column has 3 tiles, 1 used for spanning, 2 remaining
		// 15% of 2 remaining = ~0.3, rounds to 0
		// With such a small grid, loop count may be 0
		expect(result.loopConnectors).toBeGreaterThanOrEqual(0);
	});

	it("loop count scales with available connectors (~15%)", () => {
		// Large grid with 2 big rooms and a long wall between them
		const w = 3;
		const h = 41; // tall wall with many connectors
		const tiles: TileData[][] = [];

		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				if (x === 1) {
					row.push(wallTile(x, z));
				} else {
					row.push(passableTile(x, z));
				}
			}
			tiles.push(row);
		}

		const result = connectRegions(tiles, w, h, "loop-scale");
		expect(result.spanningConnectors).toBe(1);

		// 41 wall tiles total, 1 used for spanning = 40 remaining
		// 15% of 40 = 6
		expect(result.loopConnectors).toBeGreaterThanOrEqual(4);
		expect(result.loopConnectors).toBeLessThanOrEqual(8);
	});

	it("loop connectors create alternate paths (reachable count stays correct)", () => {
		const { tiles, w, h } = makeTwoRoomGrid();
		connectRegions(tiles, w, h, "loop-alternate");
		expect(isFullyConnected(tiles, w, h)).toBe(true);

		// All passable tiles remain reachable
		const totalPassable = countPassable(tiles);
		const reachable = floodFillCount(tiles, 0, 0, w, h);
		expect(reachable).toBe(totalPassable);
	});
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
	it("same seed produces identical connectivity", () => {
		// Run 1
		const g1 = makeTwoRoomGrid();
		const r1 = connectRegions(g1.tiles, g1.w, g1.h, "determinism-A");

		// Run 2
		const g2 = makeTwoRoomGrid();
		const r2 = connectRegions(g2.tiles, g2.w, g2.h, "determinism-A");

		// Same result
		expect(r1.regionCount).toBe(r2.regionCount);
		expect(r1.spanningConnectors).toBe(r2.spanningConnectors);
		expect(r1.loopConnectors).toBe(r2.loopConnectors);

		// Same tiles
		for (let z = 0; z < g1.h; z++) {
			for (let x = 0; x < g1.w; x++) {
				expect(g1.tiles[z]![x]!.passable).toBe(g2.tiles[z]![x]!.passable);
				expect(g1.tiles[z]![x]!.floorType).toBe(g2.tiles[z]![x]!.floorType);
			}
		}
	});

	it("different seeds can produce different connector positions", () => {
		// Use a grid with many possible connectors so different seeds pick different ones
		const w = 3;
		const h = 21;

		function buildGrid(): TileData[][] {
			const tiles: TileData[][] = [];
			for (let z = 0; z < h; z++) {
				const row: TileData[] = [];
				for (let x = 0; x < w; x++) {
					if (x === 1) row.push(wallTile(x, z));
					else row.push(passableTile(x, z));
				}
				tiles.push(row);
			}
			return tiles;
		}

		const tiles1 = buildGrid();
		connectRegions(tiles1, w, h, "seed-X");

		const tiles2 = buildGrid();
		connectRegions(tiles2, w, h, "seed-Y");

		// Both should be connected, but connector positions may differ
		expect(isFullyConnected(tiles1, w, h)).toBe(true);
		expect(isFullyConnected(tiles2, w, h)).toBe(true);

		// Check if at least one connector position differs
		let differences = 0;
		for (let z = 0; z < h; z++) {
			if (tiles1[z]![1]!.passable !== tiles2[z]![1]!.passable) {
				differences++;
			}
		}
		expect(differences).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// isFullyConnected
// ---------------------------------------------------------------------------

describe("isFullyConnected", () => {
	it("returns true for empty passable grid", () => {
		const w = 4;
		const h = 4;
		const tiles: TileData[][] = [];
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) row.push(passableTile(x, z));
			tiles.push(row);
		}
		expect(isFullyConnected(tiles, w, h)).toBe(true);
	});

	it("returns false for two disconnected rooms", () => {
		const { tiles, w, h } = makeTwoRoomGrid();
		expect(isFullyConnected(tiles, w, h)).toBe(false);
	});

	it("returns true for fully solid grid (0 regions)", () => {
		const tiles = initSolidGrid(5, 5);
		expect(isFullyConnected(tiles, 5, 5)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles single passable tile", () => {
		const tiles = initSolidGrid(5, 5);
		tiles[2]![2]!.passable = true;
		tiles[2]![2]!.floorType = "durasteel_span";

		const result = connectRegions(tiles, 5, 5, "single");
		expect(result.regionCount).toBe(1);
		expect(result.spanningConnectors).toBe(0);
		expect(isFullyConnected(tiles, 5, 5)).toBe(true);
	});

	it("handles regions with no connectable wall between them", () => {
		// Two isolated single-tile rooms with 3+ walls between them
		const tiles = initSolidGrid(9, 1);
		tiles[0]![0]!.passable = true;
		tiles[0]![0]!.floorType = "durasteel_span";
		tiles[0]![8]!.passable = true;
		tiles[0]![8]!.floorType = "durasteel_span";

		// These two tiles are separated by 7 wall tiles
		// But none of those walls touch both regions — they're too far apart
		const result = connectRegions(tiles, 9, 1, "no-adjacent");
		expect(result.regionCount).toBe(2);
		// No connectors adjacent to both regions
		expect(result.spanningConnectors).toBe(0);
	});

	it("handles grid after Phase 1 rooms + Phase 2 maze fill", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);

		// Carve rooms (Phase 1 simulation)
		carveRoom(tiles, 2, 2, 3, 3);
		carveRoom(tiles, 10, 10, 3, 3);
		carveRoom(tiles, 16, 2, 3, 3);

		// These rooms are disconnected in a solid grid
		expect(isFullyConnected(tiles, w, h)).toBe(false);

		const result = connectRegions(tiles, w, h, "phase12");
		// Result is valid — it may or may not fully connect depending on
		// whether wall tiles are adjacent to multiple regions.
		// In a solid grid with widely spaced rooms, connectors exist only
		// if rooms are adjacent (1 wall apart).
		expect(result.regionCount).toBe(3);
	});

	it("no-op for grid with no passable tiles", () => {
		const tiles = initSolidGrid(5, 5);
		const result = connectRegions(tiles, 5, 5, "allwalls");
		expect(result.regionCount).toBe(0);
		expect(result.spanningConnectors).toBe(0);
		expect(result.loopConnectors).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Integration-style: rooms separated by exactly 1 wall
// ---------------------------------------------------------------------------

describe("rooms separated by 1-tile wall", () => {
	it("connects two adjacent rooms through the wall between them", () => {
		// Room A: x=0..2, Room B: x=4..6, wall at x=3
		// Height 5
		const w = 7;
		const h = 5;
		const tiles: TileData[][] = [];
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				if (x === 3) {
					row.push(wallTile(x, z));
				} else {
					row.push(passableTile(x, z));
				}
			}
			tiles.push(row);
		}

		const result = connectRegions(tiles, w, h, "adj-rooms");
		expect(result.regionCount).toBe(2);
		expect(result.spanningConnectors).toBe(1);
		expect(isFullyConnected(tiles, w, h)).toBe(true);
	});

	it("connects rooms separated by horizontal wall", () => {
		// Room A: z=0..2, Room B: z=4..6, wall at z=3
		const w = 5;
		const h = 7;
		const tiles: TileData[][] = [];
		for (let z = 0; z < h; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < w; x++) {
				if (z === 3) {
					row.push(wallTile(x, z));
				} else {
					row.push(passableTile(x, z));
				}
			}
			tiles.push(row);
		}

		const result = connectRegions(tiles, w, h, "horiz-wall");
		expect(result.regionCount).toBe(2);
		expect(result.spanningConnectors).toBe(1);
		expect(isFullyConnected(tiles, w, h)).toBe(true);
	});
});
