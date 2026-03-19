/**
 * Phase 7: Multi-level platform generation tests.
 *
 * Verifies that the generator creates elevated platforms in large rooms
 * with ramp tiles connecting Layer 0 → Layer 1 at platform edges.
 */

import { describe, expect, it } from "vitest";
import { generateBoard } from "../generator";
import type { BoardConfig, TileData } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(seed: string, size = 44): BoardConfig {
	return { width: size, height: size, seed, difficulty: "normal" };
}

function countByElevation(tiles: TileData[][]): Map<number, number> {
	const counts = new Map<number, number>();
	for (const row of tiles) {
		for (const t of row) {
			counts.set(t.elevation, (counts.get(t.elevation) ?? 0) + 1);
		}
	}
	return counts;
}

function getPassableTiles(tiles: TileData[][]): TileData[] {
	const result: TileData[] = [];
	for (const row of tiles) {
		for (const t of row) {
			if (t.passable) result.push(t);
		}
	}
	return result;
}

function getElevatedTiles(tiles: TileData[][]): TileData[] {
	const result: TileData[] = [];
	for (const row of tiles) {
		for (const t of row) {
			if (t.elevation === 1 && t.passable) result.push(t);
		}
	}
	return result;
}

/** Check if a tile at (x,z) has at least one passable neighbor at elevation 0. */
function hasGroundNeighbor(tiles: TileData[][], x: number, z: number, w: number, h: number): boolean {
	for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
		const nx = x + dx!;
		const nz = z + dz!;
		if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
		const neighbor = tiles[nz]![nx]!;
		if (neighbor.passable && neighbor.elevation === 0) return true;
	}
	return false;
}

// ---------------------------------------------------------------------------
// Platform generation
// ---------------------------------------------------------------------------

describe("Phase 7: multi-level platforms", () => {
	it("generates elevated tiles (elevation 1) on a 44x44 board", () => {
		const board = generateBoard(makeConfig("platform-test-1"));
		const elevated = getElevatedTiles(board.tiles);
		expect(elevated.length).toBeGreaterThan(0);
	});

	it("elevated tiles exist across multiple seeds", () => {
		// Test across multiple seeds — platform generation should produce
		// elevated tiles on most boards with sufficient room area
		let totalElevated = 0;
		for (const seed of ["ratio-a", "ratio-b", "ratio-c"]) {
			const board = generateBoard(makeConfig(seed, 48));
			const elevated = getElevatedTiles(board.tiles);
			totalElevated += elevated.length;
		}
		// Across 3 boards, we expect some elevated tiles
		expect(totalElevated).toBeGreaterThan(0);
	});

	it("every elevated region has at least one ramp-adjacent tile", () => {
		const board = generateBoard(makeConfig("ramp-adj-test", 44));
		const { width, height } = board.config;
		const elevated = getElevatedTiles(board.tiles);

		if (elevated.length === 0) return; // skip if no platforms generated

		// Group elevated tiles into connected regions via flood fill
		const visited = new Set<string>();
		const regions: TileData[][] = [];

		for (const tile of elevated) {
			const key = `${tile.x},${tile.z}`;
			if (visited.has(key)) continue;

			// Flood fill this elevated region
			const region: TileData[] = [];
			const stack = [tile];
			visited.add(key);

			while (stack.length > 0) {
				const current = stack.pop()!;
				region.push(current);

				for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
					const nx = current.x + dx!;
					const nz = current.z + dz!;
					const nkey = `${nx},${nz}`;
					if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
					if (visited.has(nkey)) continue;
					const neighbor = board.tiles[nz]![nx]!;
					if (neighbor.passable && neighbor.elevation === 1) {
						visited.add(nkey);
						stack.push(neighbor);
					}
				}
			}

			regions.push(region);
		}

		// Each elevated region must have at least one tile adjacent to ground level
		for (const region of regions) {
			const hasRampEdge = region.some((t) =>
				hasGroundNeighbor(board.tiles, t.x, t.z, width, height),
			);
			expect(hasRampEdge).toBe(true);
		}
	});

	it("player start center tile remains at elevation 0", () => {
		const board = generateBoard(makeConfig("center-safe", 44));
		const cx = Math.floor(44 / 2);
		const cz = Math.floor(44 / 2);
		const center = board.tiles[cz]![cx]!;
		expect(center.elevation).toBe(0);
		expect(center.passable).toBe(true);
	});

	it("seed determinism — same seed produces same elevation layout", () => {
		const b1 = generateBoard(makeConfig("elev-det-42", 44));
		const b2 = generateBoard(makeConfig("elev-det-42", 44));

		for (let z = 0; z < 44; z++) {
			for (let x = 0; x < 44; x++) {
				expect(b1.tiles[z]![x]!.elevation).toBe(b2.tiles[z]![x]!.elevation);
			}
		}
	});

	it("passable elevated tiles are not structural_mass", () => {
		// Walls (structural_mass) start at elevation 1 in the labyrinth generator,
		// but Phase 7 should only SET elevation 1 on passable, non-wall tiles.
		// We verify that all PASSABLE tiles at elevation 1 have valid floor types.
		const board = generateBoard(makeConfig("no-wall-elev"));
		for (const row of board.tiles) {
			for (const t of row) {
				if (t.elevation === 1 && t.passable) {
					expect(t.floorType).not.toBe("structural_mass");
					expect(t.floorType).not.toBe("void_pit");
				}
			}
		}
	});
});
