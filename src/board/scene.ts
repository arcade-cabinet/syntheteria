/**
 * Populates a BabylonJS Scene with meshes from chunk tile data.
 *
 * Architecture:
 *   - ONE ground plane per chunk with a DynamicTexture for seamless biome colors
 *   - Wall boxes only for impassable tiles (3D buildings rising from the ground)
 *   - No individual floor tile meshes — ground texture handles floor variation
 *
 * This creates a seamless terrain look (like classic RTS games) instead of
 * a grid of individual tile boxes with visible gaps.
 */

import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { FLOOR_MATERIALS } from "../config/floorMaterials";
import type { Chunk } from "./chunks";
import { CHUNK_SIZE } from "./chunks";
import { TILE_SIZE_M } from "./coords";
import type { TileData } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChunkMeshes {
	chunkX: number;
	chunkZ: number;
	meshes: Mesh[];
}

// ─── Floor color palette ────────────────────────────────────────────────────

/** CSS-style hex colors for the DynamicTexture canvas. */
const FLOOR_CSS: Record<string, string> = {
	transit_deck: "#384860", // blue-grey steel
	durasteel_span: "#52607a", // lighter steel
	collapsed_zone: "#382818", // rust-brown rubble
	dust_district: "#594828", // warm dusty amber
	bio_district: "#1a4820", // green overgrown
	aerostructure: "#385280", // blue-steel
	abyssal_platform: "#0a1830", // deep dark blue
	structural_mass: "#141820", // dark wall (painted on ground under walls)
	void_pit: "#030710", // black void
};

/** Zone tint CSS adjustments */
const ZONE_CSS_TINT: Record<string, [number, number, number]> = {
	city: [0, 0, 0],
	coast: [0, 10, 20],
	campus: [5, 10, 0],
	enemy: [15, 0, 0],
};

// ─── Wall materials ─────────────────────────────────────────────────────────

const materialCache = new Map<string, PBRMaterial | StandardMaterial>();

function getWallMaterial(isAlloy: boolean, scene: Scene): PBRMaterial {
	const key = isAlloy ? "wall-alloy" : "wall-durasteel";
	let mat = materialCache.get(key) as PBRMaterial | undefined;
	if (mat) return mat;

	mat = new PBRMaterial(key, scene);
	mat.roughness = isAlloy ? 0.2 : 0.5;
	mat.metallic = isAlloy ? 0.8 : 0.6;
	mat.albedoColor = isAlloy
		? new Color3(0.02, 0.18, 0.22)
		: new Color3(0.08, 0.1, 0.14);
	mat.emissiveColor = isAlloy
		? new Color3(0.0, 0.12, 0.14)
		: new Color3(0.02, 0.03, 0.05);

	const wallDef = FLOOR_MATERIALS.structural_mass;
	const wallAlbedo = new Texture(
		`/assets/textures/pbr/${wallDef.color}`,
		scene,
	);
	mat.albedoTexture = wallAlbedo;

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

// ─── DynamicTexture ground plane ────────────────────────────────────────────

/** Pixels per tile in the chunk ground texture. Higher = sharper biome edges. */
const PX_PER_TILE = 4;
const TEX_SIZE = CHUNK_SIZE * PX_PER_TILE; // 32 * 4 = 128px

/**
 * Paint chunk biome colors onto a DynamicTexture canvas.
 * Each tile gets a solid color block based on its floorType + zone tint.
 * This creates seamless terrain without per-tile mesh gaps.
 */
function paintChunkTexture(chunk: Chunk, tex: DynamicTexture): void {
	const ctx = tex.getContext();
	(ctx as unknown as CanvasRenderingContext2D).imageSmoothingEnabled = false;

	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const tile = chunk.tiles[lz]![lx]!;
			const baseColor = FLOOR_CSS[tile.floorType] ?? FLOOR_CSS.transit_deck;

			// Parse hex color
			const r = Number.parseInt(baseColor.slice(1, 3), 16);
			const g = Number.parseInt(baseColor.slice(3, 5), 16);
			const b = Number.parseInt(baseColor.slice(5, 7), 16);

			// Apply zone tint
			const zoneTint = ZONE_CSS_TINT[tile.zone ?? "city"] ?? [0, 0, 0];

			// Add slight per-tile variation from position hash
			const hash = ((lx * 73856093) ^ (lz * 19349663)) >>> 0;
			const variation = (hash % 21) - 10; // -10 to +10

			const fr = Math.max(0, Math.min(255, r + zoneTint[0] + variation));
			const fg = Math.max(0, Math.min(255, g + zoneTint[1] + variation));
			const fb = Math.max(0, Math.min(255, b + zoneTint[2] + variation));

			ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
			ctx.fillRect(
				lx * PX_PER_TILE,
				lz * PX_PER_TILE,
				PX_PER_TILE,
				PX_PER_TILE,
			);
		}
	}

	tex.update();
}

// ─── Wall height ────────────────────────────────────────────────────────────

function wallHeight(tile: TileData): number {
	const h = ((tile.x * 7 + tile.z * 13) % 17) / 17;
	return 1.0 + h * 1.5;
}

// ─── Mesh creation ──────────────────────────────────────────────────────────

/**
 * Create BabylonJS meshes for a chunk.
 *
 * Creates ONE ground plane with a DynamicTexture for seamless biome rendering,
 * plus individual wall boxes for impassable tiles.
 */
export function populateChunkScene(chunk: Chunk, scene: Scene): ChunkMeshes {
	const meshes: Mesh[] = [];

	// World-space origin of this chunk
	const chunkWX = chunk.chunkX * CHUNK_SIZE * TILE_SIZE_M;
	const chunkWZ = chunk.chunkZ * CHUNK_SIZE * TILE_SIZE_M;
	const chunkWorldSize = CHUNK_SIZE * TILE_SIZE_M; // 64 units

	// 1. Ground plane — single mesh with DynamicTexture for biome colors
	const groundName = `ground-${chunk.chunkX}-${chunk.chunkZ}`;
	const ground = MeshBuilder.CreateGround(
		groundName,
		{ width: chunkWorldSize, height: chunkWorldSize, subdivisions: 1 },
		scene,
	);
	// Position at chunk center
	ground.position = new Vector3(
		chunkWX + chunkWorldSize / 2 - TILE_SIZE_M / 2,
		0,
		chunkWZ + chunkWorldSize / 2 - TILE_SIZE_M / 2,
	);
	ground.receiveShadows = true;
	ground.isPickable = true; // clickable for move-to-ground

	// Create and paint the biome texture
	const tex = new DynamicTexture(
		`tex-${chunk.chunkX}-${chunk.chunkZ}`,
		TEX_SIZE,
		scene,
		false, // no mipmaps for pixel-art look
	);
	tex.wrapU = Texture.CLAMP_ADDRESSMODE;
	tex.wrapV = Texture.CLAMP_ADDRESSMODE;
	paintChunkTexture(chunk, tex);

	const groundMat = new PBRMaterial(
		`gmat-${chunk.chunkX}-${chunk.chunkZ}`,
		scene,
	);
	groundMat.albedoTexture = tex;
	groundMat.roughness = 0.85;
	groundMat.metallic = 0.1;
	// Subtle emissive to make the ground readable in darkness
	groundMat.emissiveColor = new Color3(0.04, 0.06, 0.1);
	groundMat.freeze();
	ground.material = groundMat;
	meshes.push(ground);

	// 2. Wall boxes — only for impassable tiles
	for (let lz = 0; lz < CHUNK_SIZE; lz++) {
		for (let lx = 0; lx < CHUNK_SIZE; lx++) {
			const tile = chunk.tiles[lz]![lx]!;
			if (tile.passable || tile.floorType === "void_pit") continue;
			if (tile.floorType === "abyssal_platform") continue;

			const wx = tile.x * TILE_SIZE_M;
			const wz = tile.z * TILE_SIZE_M;
			const h = wallHeight(tile);
			const isAlloy = (tile.x * 3 + tile.z * 7) % 13 === 0;

			const wall = MeshBuilder.CreateBox(
				`w-${tile.x}-${tile.z}`,
				{ width: TILE_SIZE_M, height: h, depth: TILE_SIZE_M },
				scene,
			);
			wall.position = new Vector3(wx, h / 2, wz);
			wall.receiveShadows = true;
			wall.isPickable = false;
			wall.material = getWallMaterial(isAlloy, scene);
			meshes.push(wall);
		}
	}

	return { chunkX: chunk.chunkX, chunkZ: chunk.chunkZ, meshes };
}

/**
 * Remove all meshes for a chunk from the scene.
 */
export function disposeChunkMeshes(cm: ChunkMeshes): void {
	for (const mesh of cm.meshes) {
		// Dispose material if it's a per-chunk ground material
		if (mesh.material?.name.startsWith("gmat-")) {
			mesh.material.dispose(true); // also dispose textures
		}
		mesh.dispose();
	}
	cm.meshes.length = 0;
}
