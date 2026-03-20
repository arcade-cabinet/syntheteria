/**
 * POI placement — places Points of Interest on the game board during init.
 *
 * Reads POI_DEFINITIONS and converts relative coordinates to tile positions.
 * Creates ECS entities for each POI with a POIMarker trait.
 */

import type { World } from "koota";
import { POI_DEFINITIONS, poiToTile } from "../config";
import { POIMarker } from "../traits";

/**
 * Place all POI entities on the board. Call once during world init.
 *
 * @param world - The ECS world.
 * @param boardWidth - Board width in tiles.
 * @param boardHeight - Board height in tiles.
 */
export function placePOIs(
	world: World,
	boardWidth: number,
	boardHeight: number,
): void {
	for (const def of POI_DEFINITIONS) {
		const { x, z } = poiToTile(def, boardWidth, boardHeight);
		world.spawn(
			POIMarker({
				poiType: def.type,
				name: def.name,
				discovered: def.discoveredAtStart,
				cleared: false,
				tileX: x,
				tileZ: z,
			}),
		);
	}
}
