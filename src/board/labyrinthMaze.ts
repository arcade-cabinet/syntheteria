/**
 * Labyrinth Phase 2 — Growing Tree maze fill.
 *
 * Takes a grid where rooms have already been carved (Phase 1) and fills
 * all remaining solid space with 1-tile-wide corridors using the Growing
 * Tree algorithm.
 *
 * The grid uses odd-coordinate addressing:
 *   - Odd (x,z) = "cells" (potential corridor)
 *   - Even (x,z) = "walls" (carved when connecting two adjacent cells)
 *
 * Cell selection: 70% newest (stack → long winding corridors),
 *                 30% random (branches, dead ends).
 *
 * All random decisions via seededRng for deterministic output.
 *
 * Reference: Bob Nystrom "Rooms and Mazes", Jamis Buck "Growing Tree".
 */

import type { TileData } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A grid cell coordinate (odd x and z). */
interface Cell {
	x: number;
	z: number;
}

/** Cardinal direction offsets. Step of 2 to move between odd-coordinate cells. */
const DIRECTIONS: readonly Cell[] = [
	{ x: 0, z: -2 }, // north
	{ x: 2, z: 0 },  // east
	{ x: 0, z: 2 },  // south
	{ x: -2, z: 0 }, // west
];

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

function inBounds(x: number, z: number, width: number, height: number): boolean {
	return x >= 0 && x < width && z >= 0 && z < height;
}

function isOdd(n: number): boolean {
	return (n & 1) === 1;
}

/**
 * Check if a tile is "solid" (uncarved wall / structural_mass).
 * Tiles that are already carved by room placement are non-solid.
 */
function isSolid(tiles: TileData[][], x: number, z: number): boolean {
	return tiles[z]![x]!.floorType === "structural_mass";
}

/**
 * Carve a tile — mark it as passable corridor.
 * Uses transit_deck as the default corridor floor type.
 */
function carve(
	tiles: TileData[][],
	x: number,
	z: number,
	floorType: TileData["floorType"] = "transit_deck",
): void {
	const tile = tiles[z]![x]!;
	tile.floorType = floorType;
	tile.elevation = 0;
	tile.passable = true;
}

// ---------------------------------------------------------------------------
// Growing Tree maze fill
// ---------------------------------------------------------------------------

export interface MazeFillOptions {
	/** Probability of selecting the newest cell (stack behavior). Default: 0.7 */
	newestBias?: number;
	/** Floor type for carved corridors. Default: "transit_deck" */
	corridorFloor?: TileData["floorType"];
}

/**
 * Fill all uncarved space in the grid with maze corridors.
 *
 * Preconditions:
 *   - `tiles` is a row-major grid where rooms have been carved (Phase 1)
 *   - All uncarved tiles have floorType === "structural_mass"
 *   - Rooms occupy even-aligned rectangles so they don't interfere with
 *     the odd-coordinate maze grid
 *
 * The algorithm:
 *   1. Find all unvisited odd-coordinate cells that are still solid
 *   2. For each connected region of unvisited cells, run Growing Tree:
 *      a. Pick a random unvisited cell as the starting point
 *      b. Add it to the frontier
 *      c. While frontier is non-empty:
 *         - Select a cell: 70% newest (last), 30% random
 *         - Find unvisited neighbors (solid cells 2 steps away)
 *         - If neighbors exist: pick random neighbor, carve passage
 *           (carve both the neighbor cell and the wall between), add
 *           neighbor to frontier
 *         - If no neighbors: remove cell from frontier
 *
 * Mutates `tiles` in place. Returns the number of cells carved.
 *
 * @param rng Seeded RNG function returning [0, 1)
 */
export function growingTreeMazeFill(
	tiles: TileData[][],
	width: number,
	height: number,
	rng: () => number,
	options: MazeFillOptions = {},
): number {
	const newestBias = options.newestBias ?? 0.7;
	const corridorFloor = options.corridorFloor ?? "transit_deck";

	// Track which odd-coordinate cells have been visited
	const visited = new Set<string>();
	let totalCarved = 0;

	// Mark cells that are already carved (rooms from Phase 1) as visited
	for (let z = 1; z < height; z += 2) {
		for (let x = 1; x < width; x += 2) {
			if (!isSolid(tiles, x, z)) {
				visited.add(`${x},${z}`);
			}
		}
	}

	// Collect all unvisited odd-coordinate cells
	const unvisitedCells: Cell[] = [];
	for (let z = 1; z < height; z += 2) {
		for (let x = 1; x < width; x += 2) {
			if (!visited.has(`${x},${z}`)) {
				unvisitedCells.push({ x, z });
			}
		}
	}

	// Shuffle to randomize which region we start from
	shuffleArray(unvisitedCells, rng);

	// Run Growing Tree from each unvisited cell
	for (const startCell of unvisitedCells) {
		if (visited.has(`${startCell.x},${startCell.z}`)) continue;

		// Carve the starting cell
		carve(tiles, startCell.x, startCell.z, corridorFloor);
		visited.add(`${startCell.x},${startCell.z}`);
		totalCarved++;

		const frontier: Cell[] = [startCell];

		while (frontier.length > 0) {
			// Select cell: newest (stack) vs random
			const idx =
				rng() < newestBias
					? frontier.length - 1
					: Math.floor(rng() * frontier.length);

			const cell = frontier[idx]!;

			// Find unvisited neighbors
			const neighbors = getUnvisitedNeighbors(
				cell,
				tiles,
				width,
				height,
				visited,
			);

			if (neighbors.length > 0) {
				// Pick a random neighbor
				const neighbor = neighbors[Math.floor(rng() * neighbors.length)]!;

				// Carve the wall between current cell and neighbor
				const wallX = cell.x + (neighbor.x - cell.x) / 2;
				const wallZ = cell.z + (neighbor.z - cell.z) / 2;
				carve(tiles, wallX, wallZ, corridorFloor);
				totalCarved++;

				// Carve the neighbor cell
				carve(tiles, neighbor.x, neighbor.z, corridorFloor);
				visited.add(`${neighbor.x},${neighbor.z}`);
				totalCarved++;

				// Add neighbor to frontier
				frontier.push(neighbor);
			} else {
				// No unvisited neighbors — remove from frontier
				frontier[idx] = frontier[frontier.length - 1]!;
				frontier.pop();
			}
		}
	}

	return totalCarved;
}

/**
 * Get unvisited odd-coordinate neighbors of a cell.
 * A neighbor is 2 steps away in a cardinal direction.
 * Both the neighbor cell AND the wall between must be in bounds.
 * The neighbor must be solid (uncarved) and not yet visited.
 */
function getUnvisitedNeighbors(
	cell: Cell,
	tiles: TileData[][],
	width: number,
	height: number,
	visited: Set<string>,
): Cell[] {
	const neighbors: Cell[] = [];

	for (const dir of DIRECTIONS) {
		const nx = cell.x + dir.x;
		const nz = cell.z + dir.z;

		if (!inBounds(nx, nz, width, height)) continue;
		if (visited.has(`${nx},${nz}`)) continue;
		if (!isSolid(tiles, nx, nz)) continue;

		// Also check the wall tile between is in bounds
		const wx = cell.x + dir.x / 2;
		const wz = cell.z + dir.z / 2;
		if (!inBounds(wx, wz, width, height)) continue;

		neighbors.push({ x: nx, z: nz });
	}

	return neighbors;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle in place using seeded RNG. */
function shuffleArray<T>(arr: T[], rng: () => number): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[arr[i], arr[j]] = [arr[j]!, arr[i]!];
	}
}

// ---------------------------------------------------------------------------
// Grid initialization helper
// ---------------------------------------------------------------------------

/**
 * Initialize a grid as fully solid (all structural_mass).
 * This is the starting state before room placement and maze fill.
 * Used by the labyrinth generator pipeline.
 */
export function initSolidGrid(width: number, height: number): TileData[][] {
	const tiles: TileData[][] = [];
	for (let z = 0; z < height; z++) {
		const row: TileData[] = [];
		for (let x = 0; x < width; x++) {
			row.push({
				x,
				z,
				elevation: 1,
				passable: false,
				floorType: "structural_mass",
				resourceMaterial: null,
				resourceAmount: 0,
			});
		}
		tiles.push(row);
	}
	return tiles;
}

/**
 * Carve a rectangular room into the grid.
 * Room coordinates should be even-aligned so they don't
 * interfere with the odd-coordinate maze cells.
 *
 * @param x Room left edge (should be even)
 * @param z Room top edge (should be even)
 * @param w Room width (should be odd, so interior is even-aligned)
 * @param h Room height (should be odd)
 * @param floorType Floor type for the room interior
 */
export function carveRoom(
	tiles: TileData[][],
	x: number,
	z: number,
	w: number,
	h: number,
	floorType: TileData["floorType"] = "durasteel_span",
): void {
	const maxZ = tiles.length;
	const maxX = tiles[0]!.length;

	for (let rz = z; rz < z + h; rz++) {
		for (let rx = x; rx < x + w; rx++) {
			if (rx < 0 || rx >= maxX || rz < 0 || rz >= maxZ) continue;
			carve(tiles, rx, rz, floorType);
		}
	}
}
