/**
 * Tile visibility lookup — used by all renderers to hide models on unexplored tiles.
 *
 * Fog of war gate: if a tile isn't explored, nothing on it should render.
 * This is the rendering-side enforcement of the grid GPS explored field.
 */

import type { World } from "koota";
import { Tile } from "../../traits";

/** Build a Set of "x,z" keys for all explored tiles. */
export function buildExploredSet(world: World): Set<string> {
	const explored = new Set<string>();
	for (const entity of world.query(Tile)) {
		const t = entity.get(Tile);
		if (t && t.explored) {
			explored.add(`${t.x},${t.z}`);
		}
	}
	return explored;
}

/** Check if a tile coordinate is explored. */
export function isTileExplored(
	explored: Set<string>,
	tileX: number,
	tileZ: number,
): boolean {
	return explored.has(`${tileX},${tileZ}`);
}
