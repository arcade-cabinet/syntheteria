/**
 * Movement overlay computation — pure logic extracted from the renderer
 * for testability. Returns the cells to highlight and their visual intensity.
 */

import { findReachableCells } from "../systems/navmesh";

export interface OverlayCell {
	q: number;
	r: number;
	cost: number;
	/** 0..1 intensity for rendering — higher cost = lower intensity */
	intensity: number;
}

const BASE_INTENSITY = 1.0;

/**
 * Compute the set of reachable cells and their display intensity.
 * Returns empty array when no cells are reachable.
 */
export function computeMovementOverlay(
	startX: number,
	startZ: number,
	maxMP: number,
): OverlayCell[] {
	if (maxMP <= 0) return [];

	const reachable = findReachableCells(startX, startZ, maxMP);
	const result: OverlayCell[] = [];

	for (const [, cell] of reachable) {
		const costRatio = cell.cost / maxMP;
		const intensity = Math.max(0.3, BASE_INTENSITY * (1 - costRatio * 0.5));
		result.push({
			q: cell.q,
			r: cell.r,
			cost: cell.cost,
			intensity,
		});
	}

	return result;
}
