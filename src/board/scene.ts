/**
 * Populates a BabylonJS Scene with meshes from chunk tile data.
 *
 * This is the board package's rendering layer — it knows about BabylonJS
 * directly so the POC (or game) doesn't need to manually create meshes.
 *
 * Creates:
 *   - Floor thin-boxes for passable tiles (PBR materials from FLOOR_MATERIALS)
 *   - Wall boxes for structural_mass tiles (height varies for visual interest)
 *   - Ocean ground plane beneath chunks
 *
 * Zone-aware rendering (Tier 3/5): Floor colors vary by zone profile,
 * and POI rooms (cult shrines, observatories, labs, mines) get distinct
 * emissive materials for visual distinction.
 */

import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { FLOOR_MATERIALS } from "../config/floorMaterials";
import type { Chunk } from "./chunks";
import { CHUNK_SIZE } from "./chunks";
import { ELEVATION_STEP_M, TILE_SIZE_M } from "./coords";
import type { FloorType, TileData } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChunkMeshes {
	chunkX: number;
	chunkZ: number;
	meshes: Mesh[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FLOOR_HEIGHT = 0.15;
/** Slight inset from tile edge creates visible grooves between tiles. */
const TILE_INSET = 0.06;

const FLOOR_COLORS: Record<string, Color3> = {
	transit_deck: new Color3(0.22, 0.28, 0.36), // blue-grey steel corridors
	durasteel_span: new Color3(0.32, 0.38, 0.48), // lighter steel platforms
	collapsed_zone: new Color3(0.22, 0.16, 0.1), // dark rust-brown rubble
	dust_district: new Color3(0.35, 0.28, 0.15), // warm dusty amber — distinct
	bio_district: new Color3(0.08, 0.28, 0.12), // visible green — overgrown
	aerostructure: new Color3(0.18, 0.32, 0.5), // clear blue-steel
	abyssal_platform: new Color3(0.03, 0.08, 0.18), // deep dark blue void
};

/** Per-floor-type emissive multipliers — stronger for more characterful types. */
const FLOOR_EMISSIVE_MULT: Record<string, [number, number, number]> = {
	transit_deck: [0.08, 0.1, 0.18],
	durasteel_span: [0.1, 0.12, 0.2],
	collapsed_zone: [0.12, 0.06, 0.03],
	dust_district: [0.15, 0.1, 0.04],
	bio_district: [0.03, 0.15, 0.06],
	aerostructure: [0.06, 0.12, 0.22],
	abyssal_platform: [0.02, 0.05, 0.14],
};

/** Zone-specific tint applied to floor colors for geographic variety. */
const ZONE_TINTS: Record<string, Color3> = {
	city: new Color3(0, 0, 0), // no tint — neutral industrial
	coast: new Color3(0.04, 0.08, 0.12), // blue tint — coastal
	campus: new Color3(0.04, 0.08, 0.02), // green tint — organic
	enemy: new Color3(0.08, 0.02, 0.02), // red tint — hostile territory
};

// ─── Variant selection ──────────────────────────────────────────────────────
// Uses tile position hash to pick one of 3 visual variants per floor type.
// Creates subtle visual variation (roughness, color tint) across the terrain.

const VARIANT_COUNT = 3;

/** Deterministic hash from tile coords → variant index (0..VARIANT_COUNT-1). */
function tileVariant(tileX: number, tileZ: number): number {
	// Simple hash: multiply by primes, XOR, modulo. Deterministic per position.
	const h = ((tileX * 73856093) ^ (tileZ * 19349663)) >>> 0;
	return h % VARIANT_COUNT;
}

// Per-variant roughness and color tint offsets for visual variety
const VARIANT_ROUGHNESS = [0.82, 0.87, 0.9] as const;
const VARIANT_TINT = [0.0, -0.015, 0.015] as const;

// ─── Material cache ─────────────────────────────────────────────────────────

const materialCache = new Map<string, PBRMaterial | StandardMaterial>();

function getFloorMaterial(
	floorType: FloorType,
	variant: number,
	scene: Scene,
	zone?: string,
): PBRMaterial {
	const zoneKey = zone ?? "city";
	const key = `floor-${floorType}-v${variant}-${zoneKey}`;
	let mat = materialCache.get(key) as PBRMaterial | undefined;
	if (mat) return mat;

	const def = FLOOR_MATERIALS[floorType];
	if (!def) {
		console.error(
			`[scene] Unknown floorType: "${floorType}" — using fallback material`,
		);
		mat = new PBRMaterial(key, scene);
		mat.roughness = 0.85;
		mat.albedoColor = new Color3(0.3, 0.3, 0.3);
		mat.freeze();
		materialCache.set(key, mat);
		return mat;
	}
	const baseColor = FLOOR_COLORS[floorType] ?? new Color3(0.3, 0.3, 0.3);
	const tint = VARIANT_TINT[variant] ?? 0;
	const zoneTint = ZONE_TINTS[zoneKey] ?? new Color3(0, 0, 0);

	mat = new PBRMaterial(key, scene);
	mat.roughness = VARIANT_ROUGHNESS[variant] ?? 0.85;
	mat.metallic = def.metalness ? 0.6 : 0.1;
	const finalColor = new Color3(
		Math.max(0, Math.min(1, baseColor.r + tint + zoneTint.r)),
		Math.max(0, Math.min(1, baseColor.g + tint + zoneTint.g)),
		Math.max(0, Math.min(1, baseColor.b + tint + zoneTint.b)),
	);
	mat.albedoColor = finalColor;
	// Per-type emissive glow — different floor types glow different colors
	const emMult = FLOOR_EMISSIVE_MULT[floorType] ?? [0.08, 0.1, 0.15];
	mat.emissiveColor = new Color3(emMult[0], emMult[1], emMult[2]);

	// Albedo texture with tiling
	const albedoTex = new Texture(`/assets/textures/pbr/${def.color}`, scene);
	albedoTex.uScale = def.tiling;
	albedoTex.vScale = def.tiling;
	mat.albedoTexture = albedoTex;

	// Normal map for surface detail (grooves, panel lines, cracks)
	const normalTex = new Texture(`/assets/textures/pbr/${def.normal}`, scene);
	normalTex.uScale = def.tiling;
	normalTex.vScale = def.tiling;
	mat.bumpTexture = normalTex;
	mat.invertNormalMapX = true;
	mat.invertNormalMapY = true;

	// Roughness map for micro-surface variation
	const roughTex = new Texture(`/assets/textures/pbr/${def.roughness}`, scene);
	roughTex.uScale = def.tiling;
	roughTex.vScale = def.tiling;
	mat.metallicTexture = roughTex;
	mat.useRoughnessFromMetallicTextureGreen = true;
	mat.useMetallnessFromMetallicTextureBlue = false;

	// AO map if available
	if (def.ao) {
		const aoTex = new Texture(`/assets/textures/pbr/${def.ao}`, scene);
		aoTex.uScale = def.tiling;
		aoTex.vScale = def.tiling;
		mat.ambientTexture = aoTex;
	}

	mat.freeze(); // won't change — optimize

	materialCache.set(key, mat);
	return mat;
}

function getWallMaterial(isAlloy: boolean, scene: Scene): PBRMaterial {
	const key = isAlloy ? "wall-alloy" : "wall-durasteel";
	let mat = materialCache.get(key) as PBRMaterial | undefined;
	if (mat) return mat;

	mat = new PBRMaterial(key, scene);
	mat.roughness = isAlloy ? 0.2 : 0.5;
	mat.metallic = isAlloy ? 0.8 : 0.6;
	mat.albedoColor = isAlloy
		? new Color3(0.02, 0.18, 0.22) // dark cyan-tinted alloy
		: new Color3(0.08, 0.1, 0.14); // very dark steel — walls read as shadows
	// Alloy walls glow faintly — internal circuitry visible through cracks
	mat.emissiveColor = isAlloy
		? new Color3(0.0, 0.12, 0.14)
		: new Color3(0.02, 0.03, 0.05);

	const wallDef = FLOOR_MATERIALS.structural_mass;
	const wallAlbedo = new Texture(
		`/assets/textures/pbr/${wallDef.color}`,
		scene,
	);
	mat.albedoTexture = wallAlbedo;

	// Normal map gives walls surface detail — rivets, panel seams
	const wallNormal = new Texture(
		`/assets/textures/pbr/${wallDef.normal}`,
		scene,
	);
	mat.bumpTexture = wallNormal;
	mat.invertNormalMapX = true;
	mat.invertNormalMapY = true;

	mat.freeze();

	materialCache.set(key, mat);
	return mat;
}

// ─── Mesh creation ──────────────────────────────────────────────────────────

function wallHeight(tile: TileData): number {
	const h = ((tile.x * 7 + tile.z * 13) % 17) / 17;
	return 1.0 + h * 1.5; // 1.0-2.5 units — visible 3D buildings
}

/**
 * Create BabylonJS meshes for all tiles in a chunk.
 *
 * Returns a ChunkMeshes object containing all created meshes.
 * Call disposeChunkMeshes() to remove them from the scene.
 */
export function populateChunkScene(chunk: Chunk, scene: Scene): ChunkMeshes {
	const meshes: Mesh[] = [];

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < chunk.tiles[0]!.length; lx++) {
			const tile = chunk.tiles[lz]![lx]!;
			if (tile.floorType === "void_pit") continue;

			const wx = tile.x * TILE_SIZE_M;
			const wz = tile.z * TILE_SIZE_M;

			if (tile.passable || tile.floorType === "abyssal_platform") {
				const elev = tile.elevation * ELEVATION_STEP_M;
				const tileW = TILE_SIZE_M - TILE_INSET;
				const mesh = MeshBuilder.CreateBox(
					`f-${tile.x}-${tile.z}`,
					{ width: tileW, height: FLOOR_HEIGHT, depth: tileW },
					scene,
				);
				mesh.position = new Vector3(wx, elev, wz);
				mesh.receiveShadows = true;
				mesh.isPickable = false;
				// Zone-aware floor material for geographic variety
				mesh.material = getFloorMaterial(
					tile.floorType,
					tileVariant(tile.x, tile.z),
					scene,
					tile.zone,
				);
				meshes.push(mesh);
			} else {
				const h = wallHeight(tile);
				const isAlloy = (tile.x * 3 + tile.z * 7) % 13 === 0;
				const mesh = MeshBuilder.CreateBox(
					`w-${tile.x}-${tile.z}`,
					{ width: TILE_SIZE_M, height: h, depth: TILE_SIZE_M },
					scene,
				);
				mesh.position = new Vector3(wx, h / 2, wz);
				mesh.receiveShadows = true;
				mesh.isPickable = false;
				mesh.material = getWallMaterial(isAlloy, scene);
				meshes.push(mesh);
			}
		}
	}

	return { chunkX: chunk.chunkX, chunkZ: chunk.chunkZ, meshes };
}

/**
 * Remove all meshes for a chunk from the scene.
 */
export function disposeChunkMeshes(cm: ChunkMeshes): void {
	for (const mesh of cm.meshes) {
		mesh.dispose();
	}
	cm.meshes.length = 0;
}
