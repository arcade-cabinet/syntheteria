/**
 * Types for the ecumenopolis world map.
 *
 * This is a Civ-style terrain map where mountains=buildings, plains=floor,
 * forests=harvestable resources, hills=platforms, water=breach.
 */

// ─── Grid Constants ──────────────────────────────────────────────────────────

/** Tile size in meters (matches chunks.json cellWorldSize) */
export const TILE_SIZE = 2.0;

/** Tiles per chunk side (matches chunks.json chunkSize) */
export const CHUNK_SIZE = 8;

/** World-Y heights for each level */
export const LEVEL_HEIGHTS = [0.0, 2.5, 5.0] as const;

/** Height step between levels */
export const LEVEL_STEP = 2.5;

/** Maximum supported level index */
export const MAX_LEVEL = 2;

/** Minimum vertical clearance for a robot to pass under a structure */
export const ROBOT_CLEARANCE = 1.2;

/** Max bridge tiles in a row before a visibility gap is required */
export const MAX_BRIDGE_SPAN = 3;

// ─── Map Tile ────────────────────────────────────────────────────────────────

export interface MapTile {
	/** Tile X in world grid coords */
	x: number;
	/** Tile Z in world grid coords */
	z: number;
	/** Elevation level: 0=ground, 1=raised, 2=upper */
	level: number;
	/** World-space Y position */
	elevationY: number;
	/** Meters of free space above this tile before hitting something */
	clearanceAbove: number;
	/** Floor material ID (from tile_definitions) */
	floorMaterial: string;
	/** Model placed on this tile, or null if empty floor */
	modelId: string | null;
	/** What kind of placement */
	modelLayer: "structure" | "resource" | "prop" | "bridge" | "ramp" | "support" | null;
	/** Quarter-turn rotation of placed model (0-3) */
	rotation: 0 | 1 | 2 | 3;
	/** Is this tile walkable? Derived from model passability + level logic */
	passable: boolean;
	/** Is this a bridge tile (platform at level > 0)? */
	isBridge: boolean;
	/** Is this a ramp tile (connects two levels)? */
	isRamp: boolean;
}

// ─── Chunk ───────────────────────────────────────────────────────────────────

export interface MapChunk {
	/** Chunk X coordinate */
	cx: number;
	/** Chunk Z coordinate */
	cz: number;
	/** CHUNK_SIZE × CHUNK_SIZE array of tiles, row-major */
	tiles: MapTile[];
}

// ─── Delta (what SQLite stores per save game) ────────────────────────────────

export interface TileDelta {
	tileX: number;
	tileZ: number;
	level: number;
	/** What changed */
	changeType: "harvested" | "built" | "destroyed" | "faction_change" | "resource_depleted";
	/** The new state after the change */
	newModelId: string | null;
	newPassable: boolean | null;
	controllerFaction: string | null;
	resourceRemaining: number | null;
	turnNumber: number;
}

// ─── Floor Materials ─────────────────────────────────────────────────────────

export const FLOOR_MATERIALS = [
	"metal_panel",
	"concrete_slab",
	"industrial_grating",
	"rusty_plating",
	"corroded_steel",
] as const;

export type FloorMaterial = (typeof FLOOR_MATERIALS)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function tileKey(x: number, z: number): string {
	return `${x},${z}`;
}

export function tileKey3D(x: number, z: number, level: number): string {
	return `${x},${z},${level}`;
}

export function chunkKey(cx: number, cz: number): string {
	return `${cx},${cz}`;
}

/** Convert world tile coords to chunk coords */
export function tileToChunk(x: number, z: number): { cx: number; cz: number } {
	return {
		cx: Math.floor(x / CHUNK_SIZE),
		cz: Math.floor(z / CHUNK_SIZE),
	};
}

/** Convert chunk coords to the world tile coords of its top-left corner */
export function chunkOrigin(cx: number, cz: number): { x: number; z: number } {
	return {
		x: cx * CHUNK_SIZE,
		z: cz * CHUNK_SIZE,
	};
}

/** Index into a chunk's tile array (row-major) */
export function chunkTileIndex(localX: number, localZ: number): number {
	return localZ * CHUNK_SIZE + localX;
}

export const FOUR_DIRS: readonly [number, number][] = [
	[0, -1], [1, 0], [0, 1], [-1, 0],
];
