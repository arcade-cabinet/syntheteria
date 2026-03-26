/**
 * biomeVisualDefs — renderer-agnostic visual definitions per BiomeType.
 *
 * Single source of truth for how each biome LOOKS. No rendering library
 * dependency — just RGB tuples, scatter densities, and labels.
 *
 * Consumed by: terrain renderers (Babylon, Three, 2D canvas, minimap).
 * NOT consumed by: gameplay systems (those use BIOME_DEFS in terrain/types.ts).
 */

import type { BiomeType } from "../terrain/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BiomeVisual {
	/** RGB color [0-1] for terrain surface rendering (fallback / minimap). */
	readonly color: readonly [number, number, number];
	/** RGB color [0-1] for minimap dots. */
	readonly minimapColor: readonly [number, number, number];
	/** Whether this biome renders as ocean/water (special material, reflective). */
	readonly isWater: boolean;
	/** Elevation level this biome typically occupies (-1=water, 0=flat, 1=hills, 2=mountains). */
	readonly typicalElevation: -1 | 0 | 1 | 2;
	/** Procedural scatter: how many decoration objects per tile (trees, rocks, etc). */
	readonly scatterDensity: number;
	/** What scatter objects to place. Empty = none. */
	readonly scatterTypes: readonly string[];
	/** GLB model paths (relative to /assets/models/) for scatter objects on this biome. */
	readonly scatterModels: readonly string[];
	/** Per-biome spawn probability (0-1) for resource scatter during board generation. */
	readonly scatterRate: number;
	/** Opacity of roboforming overlay when civilization develops this tile. */
	readonly roboformOverlayOpacity: number;

	// ── PBR texture variants (relative to /assets/textures/) ────
	/** 3 texture variants for visual variety. Each has color/normal/roughness. */
	readonly pbrVariants: readonly {
		readonly color: string;
		readonly normal: string;
		readonly roughness: string;
	}[];
	/** UV tiling multiplier — how many times the texture repeats per world unit. */
	readonly pbrTiling: number;
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

/**
 * Visual properties for each biome type.
 *
 * Colors reference: CivRev2, Spore, Planetary Annihilation.
 * Bright, saturated, instantly readable at strategic zoom.
 */
export const BIOME_VISUALS: Record<BiomeType, BiomeVisual> = {
	grassland: {
		color: [0.5, 0.8, 0.15], // BRIGHT lime green — pops against forest
		minimapColor: [0.4, 0.7, 0.15],
		isWater: false,
		typicalElevation: 0,
		scatterDensity: 0.3,
		scatterTypes: ["grass_tuft", "small_rock"],
		scatterModels: [
			"exploration/rocks_smallA.glb",
			"exploration/rocks_smallB.glb",
		],
		scatterRate: 0.08,
		roboformOverlayOpacity: 0.4,
		pbrVariants: [
			{
				color: "terrain/grassland_v1_color.jpg",
				normal: "terrain/grassland_v1_normal.jpg",
				roughness: "terrain/grassland_v1_roughness.jpg",
			},
			{
				color: "terrain/grassland_v2_color.jpg",
				normal: "terrain/grassland_v2_normal.jpg",
				roughness: "terrain/grassland_v2_roughness.jpg",
			},
			{
				color: "terrain/grassland_v3_color.jpg",
				normal: "terrain/grassland_v3_normal.jpg",
				roughness: "terrain/grassland_v3_roughness.jpg",
			},
		],
		pbrTiling: 8,
	},
	forest: {
		color: [0.05, 0.35, 0.08], // DARK forest green — clearly darker than grassland
		minimapColor: [0.06, 0.38, 0.08],
		isWater: false,
		typicalElevation: 0,
		scatterDensity: 2.0,
		scatterTypes: ["tree_conifer", "tree_deciduous", "bush"],
		scatterModels: [
			"exploration/rock_crystalsLargeA.glb",
			"exploration/rock_crystalsLargeB.glb",
			"exploration/rock_crystals.glb",
		],
		scatterRate: 0.12,
		roboformOverlayOpacity: 0.3,
		pbrVariants: [
			{
				color: "terrain/forest_v1_color.jpg",
				normal: "terrain/forest_v1_normal.jpg",
				roughness: "terrain/forest_v1_roughness.jpg",
			},
			{
				color: "terrain/forest_v2_color.jpg",
				normal: "terrain/forest_v2_normal.jpg",
				roughness: "terrain/forest_v2_roughness.jpg",
			},
			{
				color: "terrain/forest_v3_color.jpg",
				normal: "terrain/forest_v3_normal.jpg",
				roughness: "terrain/forest_v3_roughness.jpg",
			},
		],
		pbrTiling: 10,
	},
	mountain: {
		color: [0.62, 0.58, 0.52], // lighter grey-brown rock — visible at distance
		minimapColor: [0.6, 0.6, 0.6],
		isWater: false,
		typicalElevation: 2,
		scatterDensity: 0.5,
		scatterTypes: ["boulder", "snow_cap"],
		scatterModels: [
			"exploration/rocks_smallA.glb",
			"exploration/rocks_smallB.glb",
			"exploration/rock_crystals.glb",
		],
		scatterRate: 0.7,
		roboformOverlayOpacity: 0.2,
		pbrVariants: [
			{
				color: "terrain/mountain_v1_color.jpg",
				normal: "terrain/mountain_v1_normal.jpg",
				roughness: "terrain/mountain_v1_roughness.jpg",
			},
			{
				color: "terrain/mountain_v2_color.jpg",
				normal: "terrain/mountain_v2_normal.jpg",
				roughness: "terrain/mountain_v2_roughness.jpg",
			},
			{
				color: "terrain/mountain_v3_color.jpg",
				normal: "terrain/mountain_v3_normal.jpg",
				roughness: "terrain/mountain_v3_roughness.jpg",
			},
		],
		pbrTiling: 6,
	},
	water: {
		color: [0.08, 0.28, 0.62], // vivid ocean blue — lighter, more CivRev2
		minimapColor: [0.03, 0.15, 0.45],
		isWater: true,
		typicalElevation: -1,
		scatterDensity: 0,
		scatterTypes: [],
		scatterModels: [],
		scatterRate: 0,
		roboformOverlayOpacity: 0,
		pbrVariants: [
			{
				color: "terrain/water_v1_color.jpg",
				normal: "terrain/water_v1_normal.jpg",
				roughness: "terrain/water_v1_roughness.jpg",
			},
			{
				color: "terrain/water_v2_color.jpg",
				normal: "terrain/water_v2_normal.jpg",
				roughness: "terrain/water_v2_roughness.jpg",
			},
			{
				color: "terrain/water_v3_color.jpg",
				normal: "terrain/water_v3_normal.jpg",
				roughness: "terrain/water_v3_roughness.jpg",
			},
		],
		pbrTiling: 4,
	},
	desert: {
		color: [0.92, 0.75, 0.3], // BOLD golden sand — must POP against green
		minimapColor: [0.82, 0.65, 0.22],
		isWater: false,
		typicalElevation: 0,
		scatterDensity: 0.2,
		scatterTypes: ["cactus", "sand_dune"],
		scatterModels: [
			"exploration/crater.glb",
			"exploration/craterLarge.glb",
			"exploration/meteor_half.glb",
		],
		scatterRate: 0.08,
		roboformOverlayOpacity: 0.5,
		pbrVariants: [
			{
				color: "terrain/desert_v1_color.jpg",
				normal: "terrain/desert_v1_normal.jpg",
				roughness: "terrain/desert_v1_roughness.jpg",
			},
			{
				color: "terrain/desert_v2_color.jpg",
				normal: "terrain/desert_v2_normal.jpg",
				roughness: "terrain/desert_v2_roughness.jpg",
			},
			{
				color: "terrain/desert_v3_color.jpg",
				normal: "terrain/desert_v3_normal.jpg",
				roughness: "terrain/desert_v3_roughness.jpg",
			},
		],
		pbrTiling: 6,
	},
	hills: {
		color: [0.65, 0.48, 0.3], // warm brown — distinct from grassland green
		minimapColor: [0.6, 0.45, 0.28],
		isWater: false,
		typicalElevation: 1,
		scatterDensity: 0.4,
		scatterTypes: ["boulder", "scrub"],
		scatterModels: [
			"exploration/rocks_smallA.glb",
			"exploration/rock_crystalsLargeA.glb",
		],
		scatterRate: 0.15,
		roboformOverlayOpacity: 0.35,
		pbrVariants: [
			{
				color: "terrain/hills_v1_color.jpg",
				normal: "terrain/hills_v1_normal.jpg",
				roughness: "terrain/hills_v1_roughness.jpg",
			},
			{
				color: "terrain/hills_v2_color.jpg",
				normal: "terrain/hills_v2_normal.jpg",
				roughness: "terrain/hills_v2_roughness.jpg",
			},
			{
				color: "terrain/hills_v3_color.jpg",
				normal: "terrain/hills_v3_normal.jpg",
				roughness: "terrain/hills_v3_roughness.jpg",
			},
		],
		pbrTiling: 7,
	},
	wetland: {
		color: [0.05, 0.48, 0.42],
		minimapColor: [0.05, 0.45, 0.4],
		isWater: false,
		typicalElevation: 0,
		scatterDensity: 0.6,
		scatterTypes: ["reed", "lily_pad", "moss_rock"],
		scatterModels: ["exploration/bones.glb", "exploration/rocks_smallA.glb"],
		scatterRate: 0.08,
		roboformOverlayOpacity: 0.3,
		pbrVariants: [
			{
				color: "terrain/wetland_v1_color.jpg",
				normal: "terrain/wetland_v1_normal.jpg",
				roughness: "terrain/wetland_v1_roughness.jpg",
			},
			{
				color: "terrain/wetland_v2_color.jpg",
				normal: "terrain/wetland_v2_normal.jpg",
				roughness: "terrain/wetland_v2_roughness.jpg",
			},
			{
				color: "terrain/wetland_v3_color.jpg",
				normal: "terrain/wetland_v3_normal.jpg",
				roughness: "terrain/wetland_v3_roughness.jpg",
			},
		],
		pbrTiling: 8,
	},
	tundra: {
		color: [0.88, 0.9, 0.95], // BRIGHT white-blue snow — reads as ice/snow
		minimapColor: [0.85, 0.88, 0.92],
		isWater: false,
		typicalElevation: 0,
		scatterDensity: 0.1,
		scatterTypes: ["ice_shard", "dead_tree"],
		scatterModels: ["exploration/meteor_detailed.glb", "exploration/bones.glb"],
		scatterRate: 0.06,
		roboformOverlayOpacity: 0.45,
		pbrVariants: [
			{
				color: "terrain/tundra_v1_color.jpg",
				normal: "terrain/tundra_v1_normal.jpg",
				roughness: "terrain/tundra_v1_roughness.jpg",
			},
			{
				color: "terrain/tundra_v2_color.jpg",
				normal: "terrain/tundra_v2_normal.jpg",
				roughness: "terrain/tundra_v2_roughness.jpg",
			},
			{
				color: "terrain/tundra_v3_color.jpg",
				normal: "terrain/tundra_v3_normal.jpg",
				roughness: "terrain/tundra_v3_roughness.jpg",
			},
		],
		pbrTiling: 5,
	},
};

/**
 * Look up the terrain color for a biome. Returns [r, g, b] in 0-1 range.
 */
export function getBiomeColor(
	biome: BiomeType,
): readonly [number, number, number] {
	return BIOME_VISUALS[biome].color;
}

/**
 * Look up the minimap color for a biome. Returns [r, g, b] in 0-1 range.
 */
export function getBiomeMinimapColor(
	biome: BiomeType,
): readonly [number, number, number] {
	return BIOME_VISUALS[biome].minimapColor;
}
