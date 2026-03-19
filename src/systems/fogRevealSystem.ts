/**
 * fogRevealSystem — updates Tile.explored and Tile.visibility when units move.
 *
 * Called by movementSystem after a unit completes its move. Sets tiles within
 * the unit's scanRange to explored=true, visibility=1.0. Fringe tiles
 * (scanRange+1 and scanRange+2) get partial visibility (0.7, 0.4) for
 * smooth gradient bleeding at exploration edges.
 *
 * Never re-fogs explored tiles — visibility only increases.
 */

import type { World } from "koota";
import { Tile } from "../traits";

/** Fringe visibility values by distance past scanRange. */
const FRINGE_VISIBILITY: readonly number[] = [0.7, 0.4];

/**
 * Reveal fog around a position. Tiles within scanRange become fully explored.
 * Tiles in the fringe band (scanRange+1 to scanRange+2) get partial
 * visibility for gradient bleeding — but never reduce existing visibility.
 */
export function revealFog(
	world: World,
	tileX: number,
	tileZ: number,
	scanRange: number,
): void {
	const outerRadius = scanRange + FRINGE_VISIBILITY.length;

	for (const entity of world.query(Tile)) {
		const tile = entity.get(Tile);
		if (!tile) continue;

		const dist = Math.abs(tile.x - tileX) + Math.abs(tile.z - tileZ);
		if (dist > outerRadius) continue;

		if (dist <= scanRange) {
			// Full reveal — explored and fully visible
			if (!tile.explored || tile.visibility < 1.0) {
				entity.set(Tile, {
					...tile,
					explored: true,
					visibility: 1.0,
				});
			}
		} else {
			// Fringe band — partial visibility, never decrease
			const fringeIdx = dist - scanRange - 1;
			const fringeVis = FRINGE_VISIBILITY[fringeIdx] ?? 0;
			if (fringeVis > tile.visibility) {
				entity.set(Tile, {
					...tile,
					visibility: fringeVis,
				});
			}
		}
	}
}
