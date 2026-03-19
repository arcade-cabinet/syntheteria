import { trait } from "koota";

export type Elevation = -1 | 0 | 1 | 2;

export const Tile = trait({
	x: 0,
	z: 0,
	elevation: 0 as Elevation,
	passable: true,
	/** Fog of war — has this cell been explored? Top-level gate for all rendering. */
	explored: false,
	/** Fog fringe visibility [0-1] for smooth gradient bleeding at exploration edges. */
	visibility: 0,
});

export const TileHighlight = trait({
	emissive: 0.0,
	color: 0x00ffaa,
	reason: "none" as "none" | "reachable" | "selected" | "danger" | "placement",
});
