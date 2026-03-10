/**
 * Grid snap math utility for cube placement and stacking.
 *
 * All resources in Syntheteria are physical 0.5m cubes placed on a
 * discrete grid. This module handles the conversion between world
 * coordinates and grid indices, adjacency queries, and occupancy
 * checks.
 *
 * All functions are pure — no side effects, no global state.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Side length of one grid cell in world units. */
export const GRID_SIZE = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Integer grid coordinates (indices, not world units). */
export interface GridCoord {
	x: number;
	y: number;
	z: number;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Convert a world-space position to the nearest grid index.
 *
 * Each axis is independently rounded to the closest grid cell center:
 *   index = Math.round(worldPos / GRID_SIZE)
 */
export function snapToGrid(worldPos: {
	x: number;
	y: number;
	z: number;
}): GridCoord {
	return {
		x: Math.round(worldPos.x / GRID_SIZE) || 0,
		y: Math.round(worldPos.y / GRID_SIZE) || 0,
		z: Math.round(worldPos.z / GRID_SIZE) || 0,
	};
}

/**
 * Convert a grid index back to its world-space center position.
 *
 * This is the inverse of `snapToGrid` — a round-trip is guaranteed
 * to produce the original grid coordinate.
 */
export function gridToWorld(coord: GridCoord): {
	x: number;
	y: number;
	z: number;
} {
	return {
		x: coord.x * GRID_SIZE,
		y: coord.y * GRID_SIZE,
		z: coord.z * GRID_SIZE,
	};
}

/**
 * Return the 6 face-adjacent grid positions (±x, ±y, ±z).
 *
 * Useful for checking stacking neighbors, snap targets, and
 * flood-fill algorithms.
 */
export function getAdjacentSlots(coord: GridCoord): GridCoord[] {
	return [
		{ x: coord.x + 1, y: coord.y, z: coord.z },
		{ x: coord.x - 1, y: coord.y, z: coord.z },
		{ x: coord.x, y: coord.y + 1, z: coord.z },
		{ x: coord.x, y: coord.y - 1, z: coord.z },
		{ x: coord.x, y: coord.y, z: coord.z + 1 },
		{ x: coord.x, y: coord.y, z: coord.z - 1 },
	];
}

/**
 * Produce a deterministic string key for a grid coordinate.
 *
 * Format: `"x,y,z"` — suitable for use in `Set<string>` or as a
 * `Map` key for O(1) occupancy lookups.
 */
export function gridKey(coord: GridCoord): string {
	return `${coord.x},${coord.y},${coord.z}`;
}

/**
 * Check whether a grid slot is already occupied.
 *
 * @param coord         The grid position to test.
 * @param occupiedSlots A set of `gridKey` strings representing filled slots.
 * @returns `true` if the slot is occupied, `false` otherwise.
 */
export function isSlotOccupied(
	coord: GridCoord,
	occupiedSlots: Set<string>,
): boolean {
	return occupiedSlots.has(gridKey(coord));
}
