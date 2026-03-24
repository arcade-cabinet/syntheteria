import type { FloorType, ResourceMaterial } from "../terrain";
import type { ClimateProfile } from "../world/config";

export type { FloorType, ResourceMaterial };
export type Elevation = -1 | 0 | 1 | 2;
export type WeightClass = "light" | "medium" | "heavy";

export interface TileData {
	x: number;
	z: number;
	elevation: Elevation;
	passable: boolean;
	/** Terrain substrate — set by generateBoard, used by initWorldFromBoard. */
	floorType: FloorType;
	resourceMaterial: ResourceMaterial | null;
	resourceAmount: number;
}

export interface BoardConfig {
	width: number;
	height: number;
	seed: string;
	difficulty: "easy" | "normal" | "hard";
	/** Climate profile — affects terrain generation waterLevel. Defaults to temperate. */
	climateProfile?: ClimateProfile;
}

export interface GeneratedBoard {
	config: BoardConfig;
	tiles: TileData[][]; // row-major: tiles[z][x]
}
