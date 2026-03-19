import { describe, expect, it } from "vitest";
import { ensureConnectivity } from "../connectivity";
import { generateBoard } from "../generator";
import type { TileData } from "../types";

/**
 * Flood-fill helper — returns set of "x,z" keys for all passable tiles
 * reachable from (startX, startZ).
 */
function floodFillCheck(
	tiles: TileData[][],
	startX: number,
	startZ: number,
	width: number,
	height: number,
): Set<string> {
	const reachable = new Set<string>();
	const startTile = tiles[startZ]?.[startX];
	if (!startTile || !startTile.passable) return reachable;

	const queue: [number, number][] = [[startX, startZ]];
	reachable.add(`${startX},${startZ}`);

	while (queue.length > 0) {
		const [x, z] = queue.shift()!;
		for (const [dx, dz] of [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		]) {
			const nx = x + dx!;
			const nz = z + dz!;
			if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
			const key = `${nx},${nz}`;
			if (!reachable.has(key) && tiles[nz]![nx]!.passable) {
				reachable.add(key);
				queue.push([nx, nz]);
			}
		}
	}

	return reachable;
}

describe("connectivity guarantee", () => {
	it("all passable tiles reachable from center after generation", () => {
		const board = generateBoard({
			width: 44,
			height: 44,
			seed: "conn-test",
			difficulty: "normal",
		});
		const cx = 22;
		const cz = 22;

		const reachable = floodFillCheck(board.tiles, cx, cz, 44, 44);
		const allPassable = board.tiles.flat().filter((t) => t.passable);
		expect(reachable.size).toBe(allPassable.length);
	});

	it("works across multiple seeds", () => {
		for (const seed of ["conn-a", "conn-b", "conn-c"]) {
			const board = generateBoard({
				width: 32,
				height: 32,
				seed,
				difficulty: "normal",
			});
			const cx = 16;
			const cz = 16;

			const reachable = floodFillCheck(board.tiles, cx, cz, 32, 32);
			const allPassable = board.tiles.flat().filter((t) => t.passable);
			expect(
				reachable.size,
				`seed "${seed}": ${reachable.size} reachable vs ${allPassable.length} passable`,
			).toBe(allPassable.length);
		}
	});

	it("connects isolated pocket to main area", () => {
		// Create a small grid with an isolated pocket
		const width = 10;
		const height = 10;
		const tiles: TileData[][] = [];

		for (let z = 0; z < height; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < width; x++) {
				row.push({
					x,
					z,
					elevation: 0,
					passable: true,
					floorType: "transit_deck",
					resourceMaterial: null,
					resourceAmount: 0,
				});
			}
			tiles.push(row);
		}

		// Create a wall across the middle (row 5), isolating bottom from top
		for (let x = 0; x < width; x++) {
			tiles[5]![x]!.passable = false;
			tiles[5]![x]!.floorType = "structural_mass";
			tiles[5]![x]!.elevation = 1;
		}

		// Spawn at top-left
		ensureConnectivity(tiles, 0, 0, width, height);

		// After connectivity, all passable tiles should be reachable from (0,0)
		const reachable = floodFillCheck(tiles, 0, 0, width, height);
		const allPassable = tiles.flat().filter((t) => t.passable);
		expect(reachable.size).toBe(allPassable.length);
	});

	it("handles already-connected board (no-op)", () => {
		// Create a fully passable grid — no walls at all
		const width = 8;
		const height = 8;
		const tiles: TileData[][] = [];

		for (let z = 0; z < height; z++) {
			const row: TileData[] = [];
			for (let x = 0; x < width; x++) {
				row.push({
					x,
					z,
					elevation: 0,
					passable: true,
					floorType: "transit_deck",
					resourceMaterial: null,
					resourceAmount: 0,
				});
			}
			tiles.push(row);
		}

		// Should be a no-op — no walls to punch
		ensureConnectivity(tiles, 0, 0, width, height);

		const reachable = floodFillCheck(tiles, 0, 0, width, height);
		expect(reachable.size).toBe(width * height);
	});
});
