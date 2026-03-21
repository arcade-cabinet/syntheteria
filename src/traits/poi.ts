import { trait } from "koota";

/** Marks an entity as a Point of Interest on the game board. */
export const POIMarker = trait({
	poiType: "" as string,
	name: "" as string,
	discovered: false,
	cleared: false,
	tileX: 0,
	tileZ: 0,
});
