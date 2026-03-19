import { trait } from "koota";

export type Elevation = -1 | 0 | 1 | 2;

export const Tile = trait({
	x: 0,
	z: 0,
	elevation: 0 as Elevation,
	passable: true,
	/** Tile is always explored from turn 1 — terrain is fully visible. */
	explored: true,
	/** Visibility [0-1]. All tiles start at 1.0 — no fog of war on terrain. */
	visibility: 1,
});

export const TileHighlight = trait({
	emissive: 0.0,
	color: 0x00ffaa,
	reason: "none" as "none" | "reachable" | "selected" | "danger" | "placement",
});
