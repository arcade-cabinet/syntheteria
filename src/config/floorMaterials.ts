/**
 * FloorType → PBR texture mapping for the industrial city labyrinth.
 *
 * Each floor type gets a curated PBR texture from our ambientCG library.
 * Different textures create visual depth — no two corridor types look the same.
 * Walls use metal/steel textures. Floors use concrete variants.
 *
 * The texture paths are relative to /assets/textures/pbr/.
 * Each material has Color, NormalGL, and Roughness maps at minimum.
 *
 * This is the SINGLE SOURCE OF TRUTH for labyrinth material assignments.
 * The renderer reads from this config — never hardcodes colors.
 */

import type { FloorType } from "../board/types";

export interface PbrMaterialDef {
	/** Display name for debugging. */
	readonly label: string;
	/** Color/albedo texture path (relative to /assets/textures/pbr/). */
	readonly color: string;
	/** Normal map path. */
	readonly normal: string;
	/** Roughness map path. */
	readonly roughness: string;
	/** Optional metalness map path (for metal surfaces). */
	readonly metalness?: string;
	/** Optional AO map path. */
	readonly ao?: string;
	/** UV tiling — how many times the texture repeats per tile. */
	readonly tiling: number;
	/** Whether this is a wall (impassable) or floor (passable) material. */
	readonly isWall: boolean;
}

/**
 * PBR material assignments per FloorType.
 *
 * Passable floors get concrete textures (industrial floor feel).
 * Impassable walls get metal/corrugated steel (heavy structural feel).
 * Different variants within each category create visual variety.
 */
export const FLOOR_MATERIALS: Record<FloorType, PbrMaterialDef> = {
	// ── Passable floors (corridors, rooms) ──

	transit_deck: {
		label: "Transit Deck — clean industrial corridor",
		color: "concrete/Concrete002_1K-JPG_Color.jpg",
		normal: "concrete/Concrete002_1K-JPG_NormalGL.jpg",
		roughness: "concrete/Concrete002_1K-JPG_Roughness.jpg",
		tiling: 2,
		isWall: false,
	},
	durasteel_span: {
		label: "Durasteel Span — reinforced metal walkway",
		color: "metal/Metal005_1K-JPG_Color.jpg",
		normal: "metal/Metal005_1K-JPG_NormalGL.jpg",
		roughness: "metal/Metal005_1K-JPG_Roughness.jpg",
		metalness: "metal/Metal005_1K-JPG_Metalness.jpg",
		tiling: 2,
		isWall: false,
	},
	collapsed_zone: {
		label: "Collapsed Zone — damaged concrete rubble",
		color: "concrete/Concrete020_1K-JPG_Color.jpg",
		normal: "concrete/Concrete020_1K-JPG_NormalGL.jpg",
		roughness: "concrete/Concrete020_1K-JPG_Roughness.jpg",
		tiling: 1.5,
		isWall: false,
	},
	dust_district: {
		label: "Dust District — weathered abandoned concrete",
		color: "concrete/Concrete010_1K-JPG_Color.jpg",
		normal: "concrete/Concrete010_1K-JPG_NormalGL.jpg",
		roughness: "concrete/Concrete010_1K-JPG_Roughness.jpg",
		tiling: 2,
		isWall: false,
	},
	bio_district: {
		label: "Bio District — stained organic-growth concrete",
		color: "concrete/Concrete003_1K-JPG_Color.jpg",
		normal: "concrete/Concrete003_1K-JPG_NormalGL.jpg",
		roughness: "concrete/Concrete003_1K-JPG_Roughness.jpg",
		ao: "concrete/Concrete003_1K-JPG_AmbientOcclusion.jpg",
		tiling: 2,
		isWall: false,
	},
	aerostructure: {
		label: "Aerostructure — elevated industrial metal platform",
		color: "metal/Metal012_1K-JPG_Color.jpg",
		normal: "metal/Metal012_1K-JPG_NormalGL.jpg",
		roughness: "metal/Metal012_1K-JPG_Roughness.jpg",
		metalness: "metal/Metal012_1K-JPG_Metalness.jpg",
		tiling: 2,
		isWall: false,
	},
	abyssal_platform: {
		label: "Abyssal Platform — deep-level corrugated steel",
		color: "corrugated_steel/CorrugatedSteel003_1K-JPG_Color.jpg",
		normal: "corrugated_steel/CorrugatedSteel003_1K-JPG_NormalGL.jpg",
		roughness: "corrugated_steel/CorrugatedSteel003_1K-JPG_Roughness.jpg",
		metalness: "corrugated_steel/CorrugatedSteel003_1K-JPG_Metalness.jpg",
		tiling: 3,
		isWall: false,
	},

	// ── Impassable walls ──

	structural_mass: {
		label: "Structural Mass — solid wall (dark industrial metal)",
		color: "metal/Metal020_1K-JPG_Color.jpg",
		normal: "metal/Metal020_1K-JPG_NormalGL.jpg",
		roughness: "metal/Metal020_1K-JPG_Roughness.jpg",
		metalness: "metal/Metal020_1K-JPG_Metalness.jpg",
		tiling: 1,
		isWall: true,
	},

	// ── Void — no geometry, just black emptiness ──

	void_pit: {
		label: "Void Pit — bottomless darkness",
		color: "concrete/Concrete020_1K-JPG_Color.jpg", // not rendered, but needed for type completeness
		normal: "concrete/Concrete020_1K-JPG_NormalGL.jpg",
		roughness: "concrete/Concrete020_1K-JPG_Roughness.jpg",
		tiling: 1,
		isWall: true,
	},
};

/**
 * Get the PBR material definition for a floor type.
 */
export function getFloorMaterial(floorType: FloorType): PbrMaterialDef {
	return FLOOR_MATERIALS[floorType];
}
