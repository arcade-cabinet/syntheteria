/**
 * terrainRenderer — builds the vertex-colored flat-shaded terrain mesh.
 *
 * Takes a GeneratedBoard and creates a Three.js mesh with:
 * - Per-vertex colors from BiomeType -> color lookup
 * - Vertex-color edge interpolation for smooth terrain blending (CivRev2-style)
 * - Discrete elevation platforms with steep cliff transitions
 * - MeshStandardMaterial with vertexColors + flatShading (POC recipe)
 * - Deep water plane underneath
 *
 * Pattern from poc-roboforming.html buildTerrain().
 */

import * as THREE from "three";
import type { GeneratedBoard, TileData } from "../../../board";
import type { BiomeType } from "../../../terrain";

// ---------------------------------------------------------------------------
// BiomeType -> terrain color lookup
// ---------------------------------------------------------------------------

// Biome → terrain color lookup — CivRev2-style vibrant colors.
const FLOOR_COLORS: Record<BiomeType, THREE.Color> = {
	grassland: new THREE.Color(0x7cb342), // warm green
	forest: new THREE.Color(0x2e7d32), // dark green
	mountain: new THREE.Color(0x757575), // grey
	water: new THREE.Color(0x1565c0), // deep blue
	desert: new THREE.Color(0xd4a437), // sandy gold
	hills: new THREE.Color(0x8d6e63), // brown
	wetland: new THREE.Color(0x00695c), // teal
	tundra: new THREE.Color(0xb0bec5), // light grey-blue
};

const DEFAULT_COLOR = new THREE.Color(0x444455);

// ---------------------------------------------------------------------------
// Elevation -> discrete platform heights
// ---------------------------------------------------------------------------

/** Discrete Y height per elevation level. */
const ELEVATION_Y: Record<number, number> = {
	[-1]: -1.2, // deep pit — more dramatic drop
	0: 0.0, // ground level
	1: 1.5, // hills — clearly raised plateau
	2: 3.0, // mountains — prominent prominence
};

/** Cliff steepness factor: 0 = smooth linear, 1 = instant step. */
const CLIFF_STEEPNESS = 0.85;

/** How much to darken cliff-face vertices (0 = no shadow, 1 = full black). */
const CLIFF_SHADOW_STRENGTH = 0.35;

/** Amplitude of subtle surface noise — kept low so it doesn't override steps. */
const SURFACE_NOISE_AMP = 0.06;

const TILE_SIZE = 2; // world units per tile

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely read a tile from the board, clamping to bounds. */
function getTile(board: GeneratedBoard, gx: number, gz: number): TileData {
	const { width, height } = board.config;
	const cx = Math.max(0, Math.min(width - 1, gx));
	const cz = Math.max(0, Math.min(height - 1, gz));
	return (
		board.tiles[cz]?.[cx] ?? {
			x: cx,
			z: cz,
			elevation: 0 as const,
			passable: true,
			biomeType: "grassland" as BiomeType,
			resourceMaterial: null,
			resourceAmount: 0,
		}
	);
}

/**
 * Smoothstep-like cliff transition.
 * Remaps a linear t in [0,1] toward a steep step centered at 0.5.
 */
function cliffCurve(t: number): number {
	// Raise to a power that creates the "cliff" snap near the boundary
	// steepness=0 -> linear, steepness=1 -> nearly instant step
	const s = CLIFF_STEEPNESS;
	if (t < 0.5) {
		// Bias toward 0
		return 0.5 * Math.pow(2 * t, 1 / (1 - s + 0.01));
	}
	// Bias toward 1
	return 1 - 0.5 * Math.pow(2 * (1 - t), 1 / (1 - s + 0.01));
}

// ---------------------------------------------------------------------------
// Build terrain mesh
// ---------------------------------------------------------------------------

export function buildTerrainMesh(board: GeneratedBoard): THREE.Group {
	const { width, height } = board.config;
	const group = new THREE.Group();

	// Main terrain — 2 subdivisions per tile for adequate blending resolution
	const segments = width * 2;
	const segmentsZ = height * 2;
	const geo = new THREE.PlaneGeometry(
		width * TILE_SIZE,
		height * TILE_SIZE,
		segments,
		segmentsZ,
	);
	geo.rotateX(-Math.PI / 2);
	geo.translate((width * TILE_SIZE) / 2, 0, (height * TILE_SIZE) / 2);

	const posAttr = geo.attributes.position;
	const colors: number[] = [];

	// Reusable Color object to avoid allocations in the loop
	const blendedColor = new THREE.Color();

	for (let i = 0; i < posAttr.count; i++) {
		const vx = posAttr.getX(i);
		const vz = posAttr.getZ(i);

		// Continuous tile coordinates (fractional)
		const tileXf = vx / TILE_SIZE;
		const tileZf = vz / TILE_SIZE;

		// Integer tile coordinates for the 4 surrounding tiles
		const tx0 = Math.floor(tileXf);
		const tz0 = Math.floor(tileZf);
		const tx1 = tx0 + 1;
		const tz1 = tz0 + 1;

		// Fractional position within the tile cell [0,1)
		const fx = tileXf - tx0;
		const fz = tileZf - tz0;

		// Sample 4 surrounding tiles
		const t00 = getTile(board, tx0, tz0);
		const t10 = getTile(board, tx1, tz0);
		const t01 = getTile(board, tx0, tz1);
		const t11 = getTile(board, tx1, tz1);

		// ------------------------------------------------------------------
		// FEATURE 1: Terrain Blending — vertex color edge interpolation
		// ------------------------------------------------------------------
		// Bilinear interpolation of floor colors from 4 surrounding tiles.
		// Tile centers stay pure; boundaries get smooth gradients.

		const c00 = FLOOR_COLORS[t00.biomeType] ?? DEFAULT_COLOR;
		const c10 = FLOOR_COLORS[t10.biomeType] ?? DEFAULT_COLOR;
		const c01 = FLOOR_COLORS[t01.biomeType] ?? DEFAULT_COLOR;
		const c11 = FLOOR_COLORS[t11.biomeType] ?? DEFAULT_COLOR;

		// Bilinear blend
		blendedColor.set(0);
		const w00 = (1 - fx) * (1 - fz);
		const w10 = fx * (1 - fz);
		const w01 = (1 - fx) * fz;
		const w11 = fx * fz;

		blendedColor.r = c00.r * w00 + c10.r * w10 + c01.r * w01 + c11.r * w11;
		blendedColor.g = c00.g * w00 + c10.g * w10 + c01.g * w01 + c11.g * w11;
		blendedColor.b = c00.b * w00 + c10.b * w10 + c01.b * w01 + c11.b * w11;

		// Subtle per-vertex noise variation on color
		const colorNoise =
			(Math.sin(vx * 0.4) + Math.cos(vz * 0.4)) * SURFACE_NOISE_AMP;
		blendedColor.multiplyScalar(1 - colorNoise * 0.15);

		// ------------------------------------------------------------------
		// FEATURE 2: Elevation Drama — discrete platforms with cliff faces
		// ------------------------------------------------------------------
		// Bilinear interpolation of elevation, then apply cliff curve to
		// create steep transitions at tile boundaries between different levels.

		const e00 = ELEVATION_Y[t00.elevation] ?? 0;
		const e10 = ELEVATION_Y[t10.elevation] ?? 0;
		const e01 = ELEVATION_Y[t01.elevation] ?? 0;
		const e11 = ELEVATION_Y[t11.elevation] ?? 0;

		let elevY: number;

		// Check if all 4 surrounding tiles share the same elevation
		const sameElev =
			t00.elevation === t10.elevation &&
			t00.elevation === t01.elevation &&
			t00.elevation === t11.elevation;

		if (sameElev) {
			// Interior vertex — flat platform with very subtle noise
			elevY = e00;
			if (t00.elevation >= 0) {
				elevY += colorNoise * 0.5; // reuse the noise, very subtle
			}
		} else {
			// Boundary vertex — apply cliff curve for steep transitions
			const cfx = cliffCurve(fx);
			const cfz = cliffCurve(fz);

			elevY =
				e00 * (1 - cfx) * (1 - cfz) +
				e10 * cfx * (1 - cfz) +
				e01 * (1 - cfx) * cfz +
				e11 * cfx * cfz;

			// Cliff face darkening: steeper slope = darker color.
			// Approximate slope from elevation differences between neighbors.
			const dEdx = Math.abs((e10 - e00) * (1 - fz) + (e11 - e01) * fz);
			const dEdz = Math.abs((e01 - e00) * (1 - fx) + (e11 - e10) * fx);
			const slopeMag = Math.min(1, (dEdx + dEdz) / 3.0);
			const shadow = 1 - slopeMag * CLIFF_SHADOW_STRENGTH;
			blendedColor.multiplyScalar(shadow);
		}

		posAttr.setY(i, elevY);

		colors.push(blendedColor.r, blendedColor.g, blendedColor.b);
	}

	geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geo.computeVertexNormals();

	const mat = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.9,
		flatShading: true,
	});

	const terrainMesh = new THREE.Mesh(geo, mat);
	terrainMesh.receiveShadow = true;
	group.add(terrainMesh);

	// Deep water plane (below terrain)
	const waterGeo = new THREE.PlaneGeometry(
		width * TILE_SIZE * 2,
		height * TILE_SIZE * 2,
	);
	waterGeo.rotateX(-Math.PI / 2);
	const waterMat = new THREE.MeshStandardMaterial({
		color: 0x001122,
		emissive: 0x000511,
		roughness: 0.1,
		transparent: true,
		opacity: 0.8,
	});
	const water = new THREE.Mesh(waterGeo, waterMat);
	water.position.set(
		(width * TILE_SIZE) / 2,
		-1.8, // lower to accommodate deeper pits
		(height * TILE_SIZE) / 2,
	);
	group.add(water);

	return group;
}

/**
 * Tile grid coordinates -> world position.
 */
export function tileToWorld(
	tileX: number,
	tileZ: number,
): { x: number; y: number; z: number } {
	return {
		x: tileX * TILE_SIZE + TILE_SIZE / 2,
		y: 0,
		z: tileZ * TILE_SIZE + TILE_SIZE / 2,
	};
}

/**
 * World position -> tile grid coordinates.
 */
export function worldToTile(
	worldX: number,
	worldZ: number,
): { x: number; z: number } {
	return {
		x: Math.floor(worldX / TILE_SIZE),
		z: Math.floor(worldZ / TILE_SIZE),
	};
}

export { TILE_SIZE };
