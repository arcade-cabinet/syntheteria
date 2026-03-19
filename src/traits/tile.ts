import { trait } from "koota";

export type Elevation = -1 | 0 | 1 | 2;

export const Tile = trait({
	x: 0,
	z: 0,
	elevation: 0 as Elevation,
	passable: true,
	/** Whether tile terrain has been revealed by sensor scan. */
	explored: false,
	/** Visibility [0-1]. Storm interference hides unexplored terrain. */
	visibility: 0,
});

export const TileHighlight = trait({
	emissive: 0.0,
	color: 0x00ffaa,
	reason: "none" as "none" | "reachable" | "selected" | "danger" | "placement",
});
