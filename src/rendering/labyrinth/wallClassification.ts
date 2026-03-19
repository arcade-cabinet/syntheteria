/**
 * Wall tile classification — pure logic for labyrinth structure rendering.
 *
 * Classifies each structural_mass tile by its cardinal adjacency context:
 *   - isolated:   0 wall neighbors
 *   - dead_end:   1 wall neighbor
 *   - straight:   2 wall neighbors on opposite sides (N+S or E+W)
 *   - corner:     2 wall neighbors on adjacent sides (L-shape)
 *   - t_junction: 3 wall neighbors
 *   - crossroad:  4 wall neighbors
 *
 * Each classification includes a rotation (0°/90°/180°/270°) that orients
 * the model so its "open" side(s) face corridors.
 *
 * Works with any board that uses structural_mass — BSP or labyrinth.
 */

import type { GeneratedBoard } from "../../board/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WallShape =
	| "isolated"
	| "dead_end"
	| "straight"
	| "corner"
	| "t_junction"
	| "crossroad";

export interface ClassifiedWall {
	/** Tile grid x. */
	x: number;
	/** Tile grid z. */
	z: number;
	/** Structural shape classification. */
	shape: WallShape;
	/** Y-axis rotation in radians (0, π/2, π, 3π/2). */
	rotation: number;
}

// ---------------------------------------------------------------------------
// Adjacency bitmask
// ---------------------------------------------------------------------------

/** Bit flags for cardinal neighbors. */
const N = 1; // 0001 — north (z-1)
const E = 2; // 0010 — east  (x+1)
const S = 4; // 0100 — south (z+1)
const W = 8; // 1000 — west  (x-1)

const HALF_PI = Math.PI / 2;

function isWall(board: GeneratedBoard, x: number, z: number): boolean {
	const { width, height } = board.config;
	if (x < 0 || x >= width || z < 0 || z >= height) return false;
	return board.tiles[z]![x]!.floorType === "structural_mass";
}

function adjacencyMask(board: GeneratedBoard, x: number, z: number): number {
	let mask = 0;
	if (isWall(board, x, z - 1)) mask |= N;
	if (isWall(board, x + 1, z)) mask |= E;
	if (isWall(board, x, z + 1)) mask |= S;
	if (isWall(board, x - 1, z)) mask |= W;
	return mask;
}

// ---------------------------------------------------------------------------
// Classification lookup
// ---------------------------------------------------------------------------

/**
 * Maps a 4-bit adjacency mask to { shape, rotation }.
 *
 * Rotation convention: 0 = model's default orientation.
 * For dead_end: open end faces south (model extends north from open end).
 *   Rotation 0 = open south, π/2 = open west, π = open north, 3π/2 = open east.
 * For straight: wall runs N-S by default.
 *   Rotation 0 = N-S, π/2 = E-W.
 * For corner: default L has walls to north and east (open south-west).
 *   Rotation 0 = NE, π/2 = SE, π = SW, 3π/2 = NW.
 * For t_junction: default T has walls N+E+S (open west).
 *   Rotation 0 = open W, π/2 = open N, π = open E, 3π/2 = open S.
 */
const CLASSIFICATION_TABLE: Record<number, { shape: WallShape; rotation: number }> = {
	// 0 neighbors — isolated
	[0]:             { shape: "isolated",   rotation: 0 },

	// 1 neighbor — dead end (rotation points open end away from the neighbor)
	[N]:             { shape: "dead_end",   rotation: Math.PI },    // neighbor north → open south... no, open north
	[E]:             { shape: "dead_end",   rotation: 3 * HALF_PI },
	[S]:             { shape: "dead_end",   rotation: 0 },
	[W]:             { shape: "dead_end",   rotation: HALF_PI },

	// 2 neighbors opposite — straight
	[N | S]:         { shape: "straight",   rotation: 0 },           // N-S run
	[E | W]:         { shape: "straight",   rotation: HALF_PI },     // E-W run

	// 2 neighbors adjacent — corner
	[N | E]:         { shape: "corner",     rotation: 0 },
	[E | S]:         { shape: "corner",     rotation: HALF_PI },
	[S | W]:         { shape: "corner",     rotation: Math.PI },
	[N | W]:         { shape: "corner",     rotation: 3 * HALF_PI },

	// 3 neighbors — T-junction (rotation = which side is open)
	[N | E | S]:     { shape: "t_junction", rotation: 0 },          // open west
	[E | S | W]:     { shape: "t_junction", rotation: HALF_PI },    // open north
	[N | S | W]:     { shape: "t_junction", rotation: Math.PI },    // open east
	[N | E | W]:     { shape: "t_junction", rotation: 3 * HALF_PI },// open south

	// 4 neighbors — crossroad
	[N | E | S | W]: { shape: "crossroad",  rotation: 0 },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a single wall tile by its adjacency context.
 * Returns null if the tile at (x, z) is not structural_mass.
 */
export function classifyWallTile(
	board: GeneratedBoard,
	x: number,
	z: number,
): ClassifiedWall | null {
	if (!isWall(board, x, z)) return null;

	const mask = adjacencyMask(board, x, z);
	const entry = CLASSIFICATION_TABLE[mask]!;

	return {
		x,
		z,
		shape: entry.shape,
		rotation: entry.rotation,
	};
}

/**
 * Classify all structural_mass tiles on the board.
 * Optionally filter by an explored set (fog of war).
 */
export function classifyAllWalls(
	board: GeneratedBoard,
	explored?: Set<string>,
): ClassifiedWall[] {
	const { width, height } = board.config;
	const result: ClassifiedWall[] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			if (board.tiles[z]![x]!.floorType !== "structural_mass") continue;
			if (explored && !explored.has(`${x},${z}`)) continue;

			const mask = adjacencyMask(board, x, z);
			const entry = CLASSIFICATION_TABLE[mask]!;

			result.push({
				x,
				z,
				shape: entry.shape,
				rotation: entry.rotation,
			});
		}
	}

	return result;
}

/**
 * Count walls by shape — useful for debugging and testing.
 */
export function countByShape(walls: ClassifiedWall[]): Record<WallShape, number> {
	const counts: Record<WallShape, number> = {
		isolated: 0,
		dead_end: 0,
		straight: 0,
		corner: 0,
		t_junction: 0,
		crossroad: 0,
	};
	for (const w of walls) {
		counts[w.shape]++;
	}
	return counts;
}
