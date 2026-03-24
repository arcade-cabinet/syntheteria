/**
 * Terrain types and floor assignment functions.
 *
 * Ported from feature branch src/terrain/ — provides FloorType taxonomy,
 * FLOOR_DEFS, and the floorTypeForTile noise function used by the labyrinth
 * generator for zone floor assignment.
 */

// ---------------------------------------------------------------------------
// Floor types — ecumenopolis substrate taxonomy
// ---------------------------------------------------------------------------

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

export const FLOOR_INDEX_MAP: Record<FloorType, number> = {
	structural_mass: 0,
	durasteel_span: 1,
	transit_deck: 2,
	collapsed_zone: 3,
	dust_district: 4,
	bio_district: 5,
	aerostructure: 6,
	abyssal_platform: 7,
	void_pit: 8,
};

export function isPassableFloor(t: FloorType): boolean {
	return t !== "void_pit" && t !== "structural_mass";
}

// ---------------------------------------------------------------------------
// Noise functions — JS port of GLSL cluster/geography noise
// ---------------------------------------------------------------------------

const TILE_SIZE_M = 2.0;

export function seedToFloat(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return (hash >>> 0) / 0xffffffff;
}

function fract(x: number): number {
	return x - Math.floor(x);
}

function hash21(px: number, py: number): number {
	let x = fract(px * 234.34);
	let y = fract(py * 435.345);
	const d = x * x + 34.23 * x + y * y + 34.23 * y;
	x = x + d;
	y = y + d;
	return fract(x * y);
}

function valueNoise(px: number, py: number): number {
	const ix = Math.floor(px);
	const iy = Math.floor(py);
	const fx = px - ix;
	const fy = py - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash21(ix, iy);
	const b = hash21(ix + 1, iy);
	const c = hash21(ix, iy + 1);
	const d = hash21(ix + 1, iy + 1);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function clusterValue(
	worldX: number,
	worldZ: number,
	seedFloat: number,
): number {
	const s1x = seedFloat * 17.3;
	const s1z = seedFloat * 11.7;
	const s2x = seedFloat * 5.1;
	const s2z = seedFloat * 8.3;
	return (
		valueNoise((worldX + s1x) * 0.1, (worldZ + s1z) * 0.1) * 0.65 +
		valueNoise((worldX + s2x) * 0.055, (worldZ + s2z) * 0.055) * 0.35
	);
}

export function geographyValue(
	worldX: number,
	worldZ: number,
	seedFloat: number,
): number {
	const s1x = seedFloat * 73.1;
	const s1z = seedFloat * 31.9;
	const s2x = seedFloat * 17.7;
	const s2z = seedFloat * 43.3;
	return (
		valueNoise((worldX + s1x) * 0.05, (worldZ + s1z) * 0.05) * 0.6 +
		valueNoise((worldX + s2x) * 0.02, (worldZ + s2z) * 0.02) * 0.4
	);
}

type Elevation = -1 | 0 | 1 | 2;

export function floorTypeForTile(
	tileX: number,
	tileZ: number,
	elevation: Elevation,
	seed: string,
	waterLevel = 0.35,
): FloorType {
	if (elevation === -1) return "void_pit";

	const sf = seedToFloat(seed);
	const worldX = tileX * TILE_SIZE_M;
	const worldZ = tileZ * TILE_SIZE_M;
	const geo = geographyValue(worldX, worldZ, sf);

	const abyssalThreshold = 1.0 - waterLevel * 0.5;
	const structuralThreshold = abyssalThreshold - 0.22;

	if (geo > abyssalThreshold) return "abyssal_platform";
	if (geo > structuralThreshold) return "structural_mass";

	const cluster = clusterValue(worldX, worldZ, sf);
	if (cluster < 0.22) return "durasteel_span";
	if (cluster < 0.4) return "transit_deck";
	if (cluster < 0.57) return "collapsed_zone";
	if (cluster < 0.72) return "dust_district";
	if (cluster < 0.88) return "bio_district";
	return "aerostructure";
}
