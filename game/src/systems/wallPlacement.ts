/**
 * Wall auto-placement from stockpile for Syntheteria.
 *
 * Given a wall plan (array of grid slots) and a stockpile of physical
 * cubes, this module places cubes at each slot by consuming matching
 * cubes from the stockpile in order. Wrong-material cubes are skipped.
 *
 * All functions are pure — stockpile is consumed via parameter, not
 * global state. The placeCube dependency is injectable for testing.
 */

import type { GridCoord } from "./gridSnap";
import { placeCube } from "./cubePlacement";
import { calculateWallLine } from "./wallBuilder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A cube in the player's stockpile, identified by id and material. */
export interface StockpileCube {
	id: string;
	material: string;
}

/** Result of a wall placement operation. */
export interface WallPlacementResult {
	placed: number;
	failed: number;
	placedCubeIds: string[];
}

// ---------------------------------------------------------------------------
// Core placement
// ---------------------------------------------------------------------------

/**
 * Place cubes at each wall slot from the stockpile.
 *
 * Iterates wall slots in order. For each slot, finds the next
 * stockpile cube matching `requiredMaterial` (skipping wrong-material
 * cubes). Calls `placeCubeFn` for each valid cube. Tracks placed
 * vs failed counts.
 *
 * Each successfully placed cube gets a PlacedAt trait (handled by
 * the underlying placeCube call which registers it in the grid).
 *
 * @param wallSlots        Grid coordinates to fill, in placement order.
 * @param requiredMaterial The material type required for this wall.
 * @param stockpile        Available cubes to consume (not mutated).
 * @param placeCubeFn      Injectable placement function (defaults to placeCube).
 * @returns Placement result with counts and placed cube IDs.
 */
export function placeWall(
	wallSlots: GridCoord[],
	requiredMaterial: string,
	stockpile: StockpileCube[],
	placeCubeFn: (
		entityId: string,
		coord: GridCoord,
		material: string,
	) => boolean = placeCube,
): WallPlacementResult {
	const result: WallPlacementResult = {
		placed: 0,
		failed: 0,
		placedCubeIds: [],
	};

	// Track which stockpile cubes have been consumed
	const consumed = new Set<number>();

	for (const slot of wallSlots) {
		// Find the next matching stockpile cube that hasn't been consumed
		let foundIndex = -1;
		for (let i = 0; i < stockpile.length; i++) {
			if (!consumed.has(i) && stockpile[i].material === requiredMaterial) {
				foundIndex = i;
				break;
			}
		}

		if (foundIndex === -1) {
			// No matching cube available
			result.failed++;
			continue;
		}

		const cube = stockpile[foundIndex];
		const success = placeCubeFn(cube.id, slot, cube.material);

		if (success) {
			consumed.add(foundIndex);
			result.placed++;
			result.placedCubeIds.push(cube.id);
		} else {
			result.failed++;
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Build a wall from start to end at a given height, consuming cubes
 * from the stockpile.
 *
 * Convenience wrapper that calls `calculateWallLine` to compute
 * the wall plan, then `placeWall` to execute placement.
 *
 * @param startX   Grid X coordinate of the wall start.
 * @param startZ   Grid Z coordinate of the wall start.
 * @param endX     Grid X coordinate of the wall end.
 * @param endZ     Grid Z coordinate of the wall end.
 * @param height   Number of cube layers (Y levels 0 through height-1).
 * @param material Required material type for the wall cubes.
 * @param stockpile Available cubes to consume.
 * @param placeCubeFn Injectable placement function (defaults to placeCube).
 * @returns Placement result with counts and placed cube IDs.
 */
export function buildWall(
	startX: number,
	startZ: number,
	endX: number,
	endZ: number,
	height: number,
	material: string,
	stockpile: StockpileCube[],
	placeCubeFn: (
		entityId: string,
		coord: GridCoord,
		material: string,
	) => boolean = placeCube,
): WallPlacementResult {
	const wallSlots = calculateWallLine(startX, startZ, endX, endZ, height);
	return placeWall(wallSlots, material, stockpile, placeCubeFn);
}
