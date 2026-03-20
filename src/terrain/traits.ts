/**
 * TileFloor — ECS trait encoding terrain surface type and strip-mining data.
 *
 * Assigned by initWorldFromBoard via floorTypeForTile() — same math as the
 * GLSL cluster selection in floorShader.ts, so visual and gameplay are
 * always in sync.
 */

import { trait } from "koota";
import type { FloorType, ResourceMaterial } from "./types";

export const TileFloor = trait({
	floorType: "grassland" as FloorType,
	mineable: false,
	hardness: 0,
	resourceMaterial: null as ResourceMaterial | null,
	resourceAmount: 0,
	/** True after floor mining completes — tile is now an excavated pit. */
	mined: false,
});
