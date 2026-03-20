/**
 * JS-side cluster math — mirrors the GLSL in floorShader.ts exactly.
 *
 * Used by the board generator and initWorldFromBoard to assign BiomeType
 * values that match what the shader renders. Same seed → same boundaries
 * on both CPU and GPU.
 *
 * Two noise layers:
 *   clusterValue   — high-frequency local terrain variation (biome clusters)
 *   geographyValue — low-frequency large-scale geography (water/mountains)
 */

import type { Elevation } from "../board";
import { TILE_SIZE_M } from "../config";
import type { BiomeType } from "./types";
import { BIOME_DEFS } from "./types";

// ---------------------------------------------------------------------------
// Seed → float (FNV-1a) — same as GLSL uSeed uniform
// ---------------------------------------------------------------------------

export function seedToFloat(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return (hash >>> 0) / 0xffffffff;
}

// ---------------------------------------------------------------------------
// Hash / noise — JS port of GLSL hash21 + valueNoise
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Cluster selection — high-frequency local terrain (mirrors GLSL main())
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Geography selection — low-frequency large-scale geography (mirrors GLSL)
// ---------------------------------------------------------------------------

/**
 * Returns a [0,1] geography value for a world position.
 * High values (> threshold) become water (former ocean).
 * Medium-high values (> lower threshold) become mountain.
 * Uses low frequency noise for continent-scale geography patches.
 * Exactly mirrored in the GLSL fragment shader.
 */
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

/**
 * Returns the BiomeType for a tile at (tileX, tileZ) with the given elevation
 * and board seed. Matches the GLSL cluster and geography selection in floorShader.ts.
 *
 * @param waterLevel ClimateProfile.waterLevel (0–1). Higher = more water tiles.
 *                   Defaults to 0.35 (temperate).
 */
export function biomeTypeForTile(
	tileX: number,
	tileZ: number,
	elevation: Elevation,
	seed: string,
	waterLevel = 0.35,
): BiomeType {
	if (elevation === -1) return "water";

	const seedFloat = seedToFloat(seed);
	const worldX = tileX * TILE_SIZE_M;
	const worldZ = tileZ * TILE_SIZE_M;
	const geo = geographyValue(worldX, worldZ, seedFloat);

	const waterThreshold = 1.0 - waterLevel * 0.5;
	const mountainThreshold = waterThreshold - 0.22;

	if (geo > waterThreshold) return "water";
	if (geo > mountainThreshold) return "mountain";

	// Cluster-driven passable biome types
	const cluster = clusterValue(worldX, worldZ, seedFloat);
	if (cluster < 0.15) return "grassland";
	if (cluster < 0.3) return "forest";
	if (cluster < 0.45) return "desert";
	if (cluster < 0.6) return "hills";
	if (cluster < 0.75) return "wetland";
	return "tundra";
}

/**
 * Returns a fully populated TileBiome trait value for the given biome type,
 * with a deterministic resource amount roll from the tile position.
 */
export function tileBiomeProps(
	biomeType: BiomeType,
	tileX: number,
	tileZ: number,
) {
	const def = BIOME_DEFS[biomeType];
	const [min, max] = def.resourceAmount;
	const roll =
		min === max
			? min
			: min + (Math.abs(hash21(tileX, tileZ) * (max - min + 1)) | 0);
	return {
		biomeType,
		mineable: def.mineable,
		hardness: def.hardness,
		resourceMaterial: def.resourceMaterial,
		resourceAmount: roll,
	};
}
