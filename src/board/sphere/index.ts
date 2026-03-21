/**
 * @package board/sphere
 *
 * Pure math for mapping a tile grid onto a sphere surface.
 * Used by the title globe (R3F) and sphere orbit camera.
 */

// --- Sphere geometry ---
export {
	buildSphereGeometry,
	SEGS,
	spherePosToTile,
	sphereRadius,
	tileToSpherePos,
} from "./boardGeometry";

// --- Sphere placement ---
export {
	sphereModelPlacement,
	sphereModelPlacementWithRotation,
	worldToTileCoords,
} from "./spherePlacement";
