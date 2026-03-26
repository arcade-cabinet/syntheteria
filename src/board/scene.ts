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

const FLOOR_COLORS: Record<string, Color3> = {
	transit_deck: new Color3(0.35, 0.38, 0.42),
	durasteel_span: new Color3(0.45, 0.5, 0.55),
	collapsed_zone: new Color3(0.35, 0.35, 0.35),
	dust_district: new Color3(0.25, 0.25, 0.25),
	bio_district: new Color3(0.2, 0.35, 0.2),
	aerostructure: new Color3(0.3, 0.4, 0.5),
	abyssal_platform: new Color3(0.08, 0.12, 0.18),
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
): PBRMaterial {
	const key = `floor-${floorType}-v${variant}`;
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

	mat = new PBRMaterial(key, scene);
	mat.roughness = VARIANT_ROUGHNESS[variant] ?? 0.85;
	mat.metallic = def.metalness ? 0.6 : 0.1;
	mat.albedoColor = new Color3(
		Math.max(0, Math.min(1, baseColor.r + tint)),
		Math.max(0, Math.min(1, baseColor.g + tint)),
		Math.max(0, Math.min(1, baseColor.b + tint)),
	);
	mat.albedoTexture = new Texture(`/assets/textures/pbr/${def.color}`, scene);
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
		? new Color3(0, 0.3, 0.35)
		: new Color3(0.11, 0.16, 0.2);
	if (isAlloy) mat.emissiveColor = new Color3(0, 0.15, 0.15);
	mat.albedoTexture = new Texture(
		`/assets/textures/pbr/${FLOOR_MATERIALS.structural_mass.color}`,
		scene,
	);
	mat.freeze();

	materialCache.set(key, mat);
	return mat;
}

// ─── Mesh creation ──────────────────────────────────────────────────────────

function wallHeight(tile: TileData): number {
	const h = ((tile.x * 7 + tile.z * 13) % 17) / 17;
	return 2 + h * 4;
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
				const mesh = MeshBuilder.CreateBox(
					`f-${tile.x}-${tile.z}`,
					{ width: TILE_SIZE_M, height: FLOOR_HEIGHT, depth: TILE_SIZE_M },
					scene,
				);
				mesh.position = new Vector3(wx, elev, wz);
				mesh.receiveShadows = true;
				mesh.isPickable = false;
				mesh.material = getFloorMaterial(
					tile.floorType,
					tileVariant(tile.x, tile.z),
					scene,
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
