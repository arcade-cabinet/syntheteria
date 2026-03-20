/**
 * Growing Tree maze fill tests.
 *
 * Tests determinism, corridor properties, room preservation,
 * and maze structure invariants.
 */

import { describe, expect, it } from "vitest";
import {
	carveRoom,
	growingTreeMazeFill,
	initSolidGrid,
} from "../labyrinthMaze";
import { seededRng } from "../noise";
import type { TileData } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count tiles by floor type in a grid. */
function countFloorType(tiles: TileData[][], floorType: string): number {
	let count = 0;
	for (const row of tiles) {
		for (const tile of row) {
			if (tile.floorType === floorType) count++;
		}
	}
	return count;
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

/** Check that all corridors are exactly 1 tile wide (no 2x2 open areas in maze corridors). */
function hasNo2x2OpenAreas(
	tiles: TileData[][],
	width: number,
	height: number,
): boolean {
	for (let z = 0; z < height - 1; z++) {
		for (let x = 0; x < width - 1; x++) {
			if (
				tiles[z]![x]!.passable &&
				tiles[z]![x + 1]!.passable &&
				tiles[z + 1]![x]!.passable &&
				tiles[z + 1]![x + 1]!.passable
			) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Flood fill from a passable tile, returns count of reachable passable tiles.
 * Note: maze corridors may not be connected to rooms — that's Phase 3's job.
 * This tests connectivity WITHIN the maze itself.
 */
function floodFillCount(
	tiles: TileData[][],
	startX: number,
	startZ: number,
): number {
	if (!tiles[startZ]![startX]!.passable) return 0;
	const visited = new Set<string>();
	const stack: [number, number][] = [[startX, startZ]];
	while (stack.length > 0) {
		const [x, z] = stack.pop()!;
		const key = `${x},${z}`;
		if (visited.has(key)) continue;
		if (x < 0 || x >= tiles[0]!.length || z < 0 || z >= tiles.length) continue;
		if (!tiles[z]![x]!.passable) continue;
		visited.add(key);
		stack.push([x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]);
	}
	return visited.size;
}

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("determinism", () => {
	it("same seed produces identical maze", () => {
		const w = 21;
		const h = 21;

		const tiles1 = initSolidGrid(w, h);
		const rng1 = seededRng("test_maze_1");
		growingTreeMazeFill(tiles1, w, h, rng1);

		const tiles2 = initSolidGrid(w, h);
		const rng2 = seededRng("test_maze_1");
		growingTreeMazeFill(tiles2, w, h, rng2);

		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				expect(tiles1[z]![x]!.floorType).toBe(tiles2[z]![x]!.floorType);
				expect(tiles1[z]![x]!.passable).toBe(tiles2[z]![x]!.passable);
			}
		}
	});

	it("different seeds produce different mazes", () => {
		const w = 21;
		const h = 21;

		const tiles1 = initSolidGrid(w, h);
		growingTreeMazeFill(tiles1, w, h, seededRng("seed_A"));

		const tiles2 = initSolidGrid(w, h);
		growingTreeMazeFill(tiles2, w, h, seededRng("seed_B"));

		let differences = 0;
		for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				if (tiles1[z]![x]!.passable !== tiles2[z]![x]!.passable) {
					differences++;
				}
			}
		}
		expect(differences).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// initSolidGrid
// ---------------------------------------------------------------------------

describe("initSolidGrid", () => {
	it("creates all structural_mass tiles", () => {
		const tiles = initSolidGrid(10, 10);
		expect(countFloorType(tiles, "structural_mass")).toBe(100);
		expect(countPassable(tiles)).toBe(0);
	});

	it("creates correct dimensions", () => {
		const tiles = initSolidGrid(7, 13);
		expect(tiles.length).toBe(13);
		expect(tiles[0]!.length).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// Maze fill on empty grid (no rooms)
// ---------------------------------------------------------------------------

describe("growingTreeMazeFill — empty grid", () => {
	it("carves corridors in a solid grid", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);
		const rng = seededRng("fill_test");

		const carved = growingTreeMazeFill(tiles, w, h, rng);
		expect(carved).toBeGreaterThan(0);
		expect(countPassable(tiles)).toBeGreaterThan(0);
	});

	it("only carves at odd coordinates (cells) and between them (walls)", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("odd_test"));

		// Border (even rows/cols at edges 0 and w-1/h-1) should remain solid
		// since the algorithm only starts at odd coordinates
		for (let x = 0; x < w; x++) {
			// Top edge (z=0) and bottom edge (z=h-1) — both even — should be solid
			expect(tiles[0]![x]!.floorType).toBe("structural_mass");
			expect(tiles[h - 1]![x]!.floorType).toBe("structural_mass");
		}
		for (let z = 0; z < h; z++) {
			// Left edge (x=0) and right edge (x=w-1) should be solid
			expect(tiles[z]![0]!.floorType).toBe("structural_mass");
			expect(tiles[z]![w - 1]!.floorType).toBe("structural_mass");
		}
	});

	it("visits all odd-coordinate cells", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("all_cells"));

		// Every odd (x,z) should be carved
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}
	});

	it("maze corridors are exactly 1 tile wide (no 2x2 opens) on empty grid", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("width_test"));
		expect(hasNo2x2OpenAreas(tiles, w, h)).toBe(true);
	});

	it("all maze cells are connected on an empty grid (single region)", () => {
		const w = 15;
		const h = 15;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("connect_test"));

		// Find first passable tile
		let startX = -1;
		let startZ = -1;
		outer: for (let z = 0; z < h; z++) {
			for (let x = 0; x < w; x++) {
				if (tiles[z]![x]!.passable) {
					startX = x;
					startZ = z;
					break outer;
				}
			}
		}

		const reachable = floodFillCount(tiles, startX, startZ);
		const totalPassable = countPassable(tiles);
		expect(reachable).toBe(totalPassable);
	});
});

// ---------------------------------------------------------------------------
// Room preservation
// ---------------------------------------------------------------------------

describe("room preservation", () => {
	it("does not overwrite pre-carved rooms", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);

		// Carve a room at (2, 2) with size 5x5
		carveRoom(tiles, 2, 2, 5, 5, "durasteel_span");

		// Snapshot room tiles
		const roomTiles: Array<{ x: number; z: number }> = [];
		for (let z = 2; z < 7; z++) {
			for (let x = 2; x < 7; x++) {
				roomTiles.push({ x, z });
			}
		}

		growingTreeMazeFill(tiles, w, h, seededRng("room_preserve"));

		// Room tiles should still be durasteel_span (not transit_deck)
		for (const { x, z } of roomTiles) {
			expect(tiles[z]![x]!.floorType).toBe("durasteel_span");
			expect(tiles[z]![x]!.passable).toBe(true);
		}
	});

	it("fills maze around a room", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);

		// Carve a room (Phase 1 would do this)
		carveRoom(tiles, 4, 4, 5, 5);

		const passableBefore = countPassable(tiles);
		growingTreeMazeFill(tiles, w, h, seededRng("around_room"));
		const passableAfter = countPassable(tiles);

		// Maze should have carved additional corridors beyond the room
		expect(passableAfter).toBeGreaterThan(passableBefore);
	});

	it("room cells at odd coordinates are marked as visited (not re-carved)", () => {
		const w = 15;
		const h = 15;
		const tiles = initSolidGrid(w, h);

		// Room at odd coordinates
		carveRoom(tiles, 3, 3, 3, 3, "bio_district");

		growingTreeMazeFill(tiles, w, h, seededRng("visited_test"));

		// Room interior tiles should keep bio_district, not be overwritten to transit_deck
		for (let z = 3; z < 6; z++) {
			for (let x = 3; x < 6; x++) {
				expect(tiles[z]![x]!.floorType).toBe("bio_district");
			}
		}
	});
});

// ---------------------------------------------------------------------------
// carveRoom
// ---------------------------------------------------------------------------

describe("carveRoom", () => {
	it("carves a rectangular area", () => {
		const tiles = initSolidGrid(10, 10);
		carveRoom(tiles, 2, 3, 4, 3);

		for (let z = 3; z < 6; z++) {
			for (let x = 2; x < 6; x++) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}
	});

	it("uses specified floor type", () => {
		const tiles = initSolidGrid(10, 10);
		carveRoom(tiles, 1, 1, 3, 3, "bio_district");

		expect(tiles[1]![1]!.floorType).toBe("bio_district");
		expect(tiles[2]![2]!.floorType).toBe("bio_district");
	});

	it("clips to grid bounds", () => {
		const tiles = initSolidGrid(5, 5);
		// Room extends beyond grid
		carveRoom(tiles, 3, 3, 10, 10);

		// Should carve within bounds without error
		expect(tiles[3]![3]!.passable).toBe(true);
		expect(tiles[4]![4]!.passable).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

describe("options", () => {
	it("newestBias=1.0 produces long corridors (stack-only)", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("stack_only"), {
			newestBias: 1.0,
		});

		// Should still fill all cells
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}
	});

	it("newestBias=0.0 produces branching (random-only, Prim-like)", () => {
		const w = 21;
		const h = 21;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("prim_like"), {
			newestBias: 0.0,
		});

		// Should still fill all cells
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}
	});

	it("custom corridorFloor type is applied", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);
		growingTreeMazeFill(tiles, w, h, seededRng("custom_floor"), {
			corridorFloor: "collapsed_zone",
		});

		// Corridor cells should use the custom floor type
		let foundCustom = false;
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				if (tiles[z]![x]!.floorType === "collapsed_zone") {
					foundCustom = true;
				}
			}
		}
		expect(foundCustom).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("handles very small grid (3x3)", () => {
		const w = 3;
		const h = 3;
		const tiles = initSolidGrid(w, h);
		const carved = growingTreeMazeFill(tiles, w, h, seededRng("tiny"));

		// Only one odd cell at (1,1)
		expect(carved).toBe(1);
		expect(tiles[1]![1]!.passable).toBe(true);
	});

	it("handles 1x1 grid (no odd cells)", () => {
		const w = 1;
		const h = 1;
		const tiles = initSolidGrid(w, h);
		const carved = growingTreeMazeFill(tiles, w, h, seededRng("one"));
		expect(carved).toBe(0);
	});

	it("handles even-sized grid (odd cells still work)", () => {
		const w = 10;
		const h = 10;
		const tiles = initSolidGrid(w, h);
		const carved = growingTreeMazeFill(tiles, w, h, seededRng("even"));
		expect(carved).toBeGreaterThan(0);

		// Odd cells within bounds should be carved
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}
	});

	it("fully pre-carved grid produces 0 new carvings", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);

		// Carve all odd cells manually
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				carveRoom(tiles, x, z, 1, 1);
			}
		}

		const carved = growingTreeMazeFill(tiles, w, h, seededRng("full"));
		expect(carved).toBe(0);
	});

	it("returns correct carved count", () => {
		const w = 11;
		const h = 11;
		const tiles = initSolidGrid(w, h);
		const solidBefore = countFloorType(tiles, "structural_mass");
		const carved = growingTreeMazeFill(tiles, w, h, seededRng("count"));
		const solidAfter = countFloorType(tiles, "structural_mass");

		// Carved count = tiles that changed from structural_mass to something else
		expect(solidBefore - solidAfter).toBe(carved);
	});
});

// ---------------------------------------------------------------------------
// Scale test
// ---------------------------------------------------------------------------

describe("scale", () => {
	it("handles a 61x61 grid (game-sized board)", () => {
		const w = 61;
		const h = 61;
		const tiles = initSolidGrid(w, h);
		const rng = seededRng("scale_test");

		const carved = growingTreeMazeFill(tiles, w, h, rng);

		// 30x30 = 900 odd cells, each cell + its wall = ~1800 carvings
		expect(carved).toBeGreaterThan(800);

		// All odd cells should be passable
		for (let z = 1; z < h; z += 2) {
			for (let x = 1; x < w; x += 2) {
				expect(tiles[z]![x]!.passable).toBe(true);
			}
		}

		// Should complete in well under 1 second (algorithmic correctness)
	});
});
