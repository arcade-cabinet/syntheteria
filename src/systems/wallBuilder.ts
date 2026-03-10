/**
 * Wall line calculator using Bresenham's line algorithm.
 *
 * Walls in Syntheteria are built by stacking compressed cubes in a line.
 * This module computes the grid slots a wall occupies given a start point,
 * end point, and wall height. The XZ footprint is traced via Bresenham's
 * algorithm, and each footprint cell is extruded vertically from Y=0 to
 * Y=height-1.
 *
 * All functions are pure — no side effects, no global state.
 */

import type { GridCoord } from "./gridSnap";

// ---------------------------------------------------------------------------
// Bresenham's line algorithm (all octants)
// ---------------------------------------------------------------------------

/**
 * Compute all integer grid cells along a line from (x0, z0) to (x1, z1)
 * on the XZ plane using Bresenham's line algorithm.
 *
 * Handles all octants: steep/gentle slopes, positive/negative directions.
 * Returns cells in order from start to end.
 */
function bresenhamLine(
	x0: number,
	z0: number,
	x1: number,
	z1: number,
): Array<{ x: number; z: number }> {
	const cells: Array<{ x: number; z: number }> = [];

	const dx = Math.abs(x1 - x0);
	const dz = Math.abs(z1 - z0);
	const sx = x0 < x1 ? 1 : -1;
	const sz = z0 < z1 ? 1 : -1;
	let err = dx - dz;

	let cx = x0;
	let cz = z0;

	while (true) {
		cells.push({ x: cx, z: cz });

		if (cx === x1 && cz === z1) {
			break;
		}

		const e2 = 2 * err;

		if (e2 > -dz) {
			err -= dz;
			cx += sx;
		}

		if (e2 < dx) {
			err += dx;
			cz += sz;
		}
	}

	return cells;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate all grid slots that a wall line would occupy.
 *
 * Uses Bresenham's line algorithm to trace the XZ footprint from
 * (startX, startZ) to (endX, endZ), then extrudes each footprint
 * cell vertically from Y=0 to Y=height-1.
 *
 * @param startX - Grid X coordinate of the wall start
 * @param startZ - Grid Z coordinate of the wall start
 * @param endX   - Grid X coordinate of the wall end
 * @param endZ   - Grid Z coordinate of the wall end
 * @param height - Number of cube layers (Y levels 0 through height-1)
 * @returns Array of all grid coordinates the wall would occupy
 */
export function calculateWallLine(
	startX: number,
	startZ: number,
	endX: number,
	endZ: number,
	height: number,
): GridCoord[] {
	const footprint = bresenhamLine(startX, startZ, endX, endZ);
	const slots: GridCoord[] = [];

	for (const cell of footprint) {
		for (let y = 0; y < height; y++) {
			slots.push({ x: cell.x, y, z: cell.z });
		}
	}

	return slots;
}

/**
 * Get the total number of cubes required to build a wall line.
 *
 * This is a convenience wrapper around `calculateWallLine` that
 * returns just the slot count — useful for cost previews and
 * resource checks before committing to a build.
 *
 * @param startX - Grid X coordinate of the wall start
 * @param startZ - Grid Z coordinate of the wall start
 * @param endX   - Grid X coordinate of the wall end
 * @param endZ   - Grid Z coordinate of the wall end
 * @param height - Number of cube layers
 * @returns Total number of cube slots the wall would occupy
 */
export function getWallCost(
	startX: number,
	startZ: number,
	endX: number,
	endZ: number,
	height: number,
): number {
	return calculateWallLine(startX, startZ, endX, endZ, height).length;
}
