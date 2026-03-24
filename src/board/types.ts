/**
 * Board types — self-contained definitions for the labyrinth generator.
 *
 * Inlined from the former src/terrain/types.ts and src/world/config.ts
 * to keep the board package dependency-free.
 */

// ─── Floor Types ─────────────────────────────────────────────────────────────

export type FloorType =
	| "void_pit"
	| "structural_mass"
	| "abyssal_platform"
	| "transit_deck"
	| "durasteel_span"
	| "collapsed_zone"
	| "dust_district"
	| "bio_district"
	| "aerostructure";

// ─── Resource Materials ──────────────────────────────────────────────────────

export type ResourceMaterial =
	| "ferrous_scrap"
	| "alloy_stock"
	| "polymer_salvage"
	| "conductor_wire"
	| "electrolyte"
	| "silicon_wafer"
	| "storm_charge"
	| "el_crystal"
	| "scrap_metal"
	| "e_waste"
	| "intact_components"
	| "thermal_fluid"
	| "depth_salvage";

// ─── Floor Definitions ───────────────────────────────────────────────────────

export interface FloorDef {
	label: string;
	mineable: boolean;
	hardness: number;
	resourceMaterial: ResourceMaterial | null;
	resourceAmount: [number, number];
}

export const FLOOR_DEFS: Record<FloorType, FloorDef> = {
	void_pit: {
		label: "Void Pit",
		mineable: false,
		hardness: 0,
		resourceMaterial: null,
		resourceAmount: [0, 0],
	},
	structural_mass: {
		label: "Structural Mass",
		mineable: true,
		hardness: 5,
		resourceMaterial: "intact_components",
		resourceAmount: [3, 7],
	},
	abyssal_platform: {
		label: "Abyssal Platform",
		mineable: true,
		hardness: 3,
		resourceMaterial: "thermal_fluid",
		resourceAmount: [2, 5],
	},
	transit_deck: {
		label: "Transit Deck",
		mineable: true,
		hardness: 2,
		resourceMaterial: "ferrous_scrap",
		resourceAmount: [1, 3],
	},
	durasteel_span: {
		label: "Durasteel Span",
		mineable: true,
		hardness: 4,
		resourceMaterial: "ferrous_scrap",
		resourceAmount: [2, 4],
	},
	collapsed_zone: {
		label: "Collapsed Zone",
		mineable: true,
		hardness: 1,
		resourceMaterial: "scrap_metal",
		resourceAmount: [1, 3],
	},
	dust_district: {
		label: "Dust District",
		mineable: true,
		hardness: 1,
		resourceMaterial: "e_waste",
		resourceAmount: [1, 3],
	},
	bio_district: {
		label: "Bio District",
		mineable: true,
		hardness: 2,
		resourceMaterial: "polymer_salvage",
		resourceAmount: [1, 3],
	},
	aerostructure: {
		label: "Aerostructure",
		mineable: true,
		hardness: 3,
		resourceMaterial: "scrap_metal",
		resourceAmount: [1, 2],
	},
};

export function isPassableFloor(t: FloorType): boolean {
	return t !== "void_pit" && t !== "structural_mass";
}

// ─── Climate ─────────────────────────────────────────────────────────────────

export type ClimateProfile = "temperate" | "wet" | "arid" | "frozen";

export interface ClimateProfileSpec {
	label: string;
	description: string;
	waterLevel: number;
	sandLevel: number;
	mountainLevel: number;
	grassMoistureLevel: number;
	elevationBias: number;
	moistureBias: number;
}

export const CLIMATE_PROFILE_SPECS: Record<ClimateProfile, ClimateProfileSpec> =
	{
		temperate: {
			label: "Coastal",
			description:
				"Shoreline sector. Ecumenopolis meets ocean zones along one margin.",
			waterLevel: 0.35,
			sandLevel: 0.45,
			mountainLevel: 0.7,
			grassMoistureLevel: 0.5,
			elevationBias: 0,
			moistureBias: 0,
		},
		wet: {
			label: "Archipelago",
			description:
				"Island megastructures scattered across abyssal platform grating.",
			waterLevel: 0.55,
			sandLevel: 0.5,
			mountainLevel: 0.74,
			grassMoistureLevel: 0.42,
			elevationBias: -0.1,
			moistureBias: 0.15,
		},
		arid: {
			label: "Mesa",
			description: "High plateau, deep canyons, minimal abyssal zones.",
			waterLevel: 0.15,
			sandLevel: 0.55,
			mountainLevel: 0.65,
			grassMoistureLevel: 0.62,
			elevationBias: 0.12,
			moistureBias: -0.2,
		},
		frozen: {
			label: "Permafrost",
			description:
				"Frozen industrial wasteland — ice-locked platforms and frozen voids.",
			waterLevel: 0.28,
			sandLevel: 0.4,
			mountainLevel: 0.72,
			grassMoistureLevel: 0.55,
			elevationBias: 0.05,
			moistureBias: -0.1,
		},
	};

// ─── Tile & Board ────────────────────────────────────────────────────────────

export type Elevation = -1 | 0 | 1 | 2;
export type WeightClass = "light" | "medium" | "heavy";

export interface TileData {
	x: number;
	z: number;
	elevation: Elevation;
	passable: boolean;
	floorType: FloorType;
	resourceMaterial: ResourceMaterial | null;
	resourceAmount: number;
}

export interface BoardConfig {
	width: number;
	height: number;
	seed: string;
	difficulty: "easy" | "normal" | "hard";
	climateProfile?: ClimateProfile;
}

export interface GeneratedBoard {
	config: BoardConfig;
	tiles: TileData[][]; // row-major: tiles[z][x]
}
