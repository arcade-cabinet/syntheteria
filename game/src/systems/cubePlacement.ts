/**
 * Cube placement and structural integrity for Syntheteria.
 *
 * All resources are physical 0.5m cubes placed on a discrete grid.
 * This module manages the placement registry, validates placement
 * rules (ground support, stacking, no overlaps), and performs
 * structural integrity checks via BFS to find unsupported cubes.
 *
 * Depends on gridSnap.ts for grid math utilities.
 */

import {
	type GridCoord,
	getAdjacentSlots,
	gridKey,
	isSlotOccupied,
} from "./gridSnap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data stored for each placed cube in the registry. */
export interface PlacedCubeData {
	entityId: string;
	material: string;
	gridCoord: GridCoord;
}

/** Result of a placement validity check. */
export interface PlacementResult {
	valid: boolean;
	reason?: string;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Registry of all placed cubes, keyed by gridKey string. */
const placedCubes: Map<string, PlacedCubeData> = new Map();

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

/**
 * Check whether a cube can be placed at the given grid coordinate.
 *
 * Rules:
 * 1. The slot must not already be occupied.
 * 2. The cube must either be at ground level (y === 0) or have a
 *    cube directly below it (y - 1 slot occupied).
 *
 * @param coord          Target grid coordinate.
 * @param occupiedSlots  Set of gridKey strings for all occupied slots.
 */
export function canPlaceCube(
	coord: GridCoord,
	occupiedSlots: Set<string>,
): PlacementResult {
	// Rule 1: slot must be free
	if (isSlotOccupied(coord, occupiedSlots)) {
		return { valid: false, reason: "Slot is already occupied" };
	}

	// Rule 2: must have support (ground or cube below)
	if (coord.y === 0) {
		return { valid: true };
	}

	const below: GridCoord = { x: coord.x, y: coord.y - 1, z: coord.z };
	if (isSlotOccupied(below, occupiedSlots)) {
		return { valid: true };
	}

	return { valid: false, reason: "No support below — cube would float" };
}

// ---------------------------------------------------------------------------
// Placement operations
// ---------------------------------------------------------------------------

/**
 * Place a cube into the registry.
 *
 * Validates placement against the current registry state and adds
 * the cube if valid. Returns true on success, false if placement
 * is invalid.
 */
export function placeCube(
	entityId: string,
	coord: GridCoord,
	material: string,
): boolean {
	const occupied = getOccupiedSlots();
	const result = canPlaceCube(coord, occupied);
	if (!result.valid) {
		return false;
	}

	const key = gridKey(coord);
	placedCubes.set(key, { entityId, material, gridCoord: coord });
	return true;
}

/**
 * Remove a cube from the registry at the given grid coordinate.
 *
 * No-op if the slot is empty.
 */
export function removeCube(coord: GridCoord): void {
	const key = gridKey(coord);
	placedCubes.delete(key);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return a set of all currently occupied grid keys.
 */
export function getOccupiedSlots(): Set<string> {
	return new Set(placedCubes.keys());
}

/**
 * Get the placed cube data at a specific coordinate, or undefined.
 */
export function getCubeAt(coord: GridCoord): PlacedCubeData | undefined {
	return placedCubes.get(gridKey(coord));
}

// ---------------------------------------------------------------------------
// Structural integrity
// ---------------------------------------------------------------------------

/**
 * Find all cubes that lack structural support.
 *
 * Uses BFS from all ground-level cubes (y === 0) through
 * face-adjacent occupied slots. Any cube not reachable from the
 * ground set is considered unsupported.
 *
 * @param occupiedSlots  Set of gridKey strings for all occupied slots.
 * @returns Array of GridCoords for unsupported cubes.
 */
export function checkStructuralIntegrity(
	occupiedSlots: Set<string>,
): GridCoord[] {
	// Build a quick lookup of all coords from keys
	const allCoords: Map<string, GridCoord> = new Map();
	for (const key of occupiedSlots) {
		const parts = key.split(",");
		const coord: GridCoord = {
			x: Number(parts[0]),
			y: Number(parts[1]),
			z: Number(parts[2]),
		};
		allCoords.set(key, coord);
	}

	// Seed BFS with all ground-level cubes
	const visited = new Set<string>();
	const queue: string[] = [];

	for (const [key, coord] of allCoords) {
		if (coord.y === 0) {
			visited.add(key);
			queue.push(key);
		}
	}

	// BFS: expand through face-adjacent occupied neighbors
	while (queue.length > 0) {
		const currentKey = queue.shift()!;
		const currentCoord = allCoords.get(currentKey)!;
		const neighbors = getAdjacentSlots(currentCoord);

		for (const neighbor of neighbors) {
			const neighborKey = gridKey(neighbor);
			if (occupiedSlots.has(neighborKey) && !visited.has(neighborKey)) {
				visited.add(neighborKey);
				queue.push(neighborKey);
			}
		}
	}

	// Any occupied slot not visited is unsupported
	const unsupported: GridCoord[] = [];
	for (const [key, coord] of allCoords) {
		if (!visited.has(key)) {
			unsupported.push(coord);
		}
	}

	return unsupported;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Reset the placement grid. Test-only — not for production use.
 */
export function _resetPlacementGrid(): void {
	placedCubes.clear();
}
