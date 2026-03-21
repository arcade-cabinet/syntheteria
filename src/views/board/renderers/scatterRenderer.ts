/**
 * scatterRenderer — places natural feature models on biome tiles.
 *
 * Rocks on mountains/hills, craters in desert, bones on tundra.
 * Uses BIOME_SCATTER_MODELS from config/models.ts.
 * 10-20% chance per eligible tile. Uses seeded hash for determinism.
 * GLTFLoader for model loading; no instancing needed at this density.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GeneratedBoard } from "../../../board";
import { BIOME_SCATTER_MODELS } from "../../../config";
import { TILE_SIZE, tileToWorld } from "./terrainRenderer";

const MODEL_BASE = "/assets/models/";
const SCATTER_CHANCE = 0.15; // 15% of eligible tiles
const SCATTER_SCALE_MIN = 0.6;
const SCATTER_SCALE_MAX = 1.2;

const ELEVATION_Y: Record<number, number> = {
	[-1]: -1.2,
	0: 0.0,
	1: 1.5,
	2: 3.0,
};

const loader = new GLTFLoader();

function tileHash(x: number, z: number, layer: number): number {
	let h = 2166136261;
	h ^= x;
	h = Math.imul(h, 16777619);
	h ^= z;
	h = Math.imul(h, 16777619);
	h ^= layer;
	h = Math.imul(h, 16777619);
	return (h >>> 0) / 4294967296;
}

function enableShadows(object: THREE.Object3D): void {
	object.traverse((child) => {
		if ((child as THREE.Mesh).isMesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		}
	});
}

/**
 * Scan the board for biome-eligible tiles and place scatter models.
 * Call once in WorldScene.create().
 */
export function createScatterRenderer(
	scene: THREE.Scene,
	board: GeneratedBoard,
): void {
	const { width, height } = board.config;

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z]?.[x];
			if (!tile) continue;

			const modelPaths = BIOME_SCATTER_MODELS[tile.biomeType];
			if (!modelPaths || modelPaths.length === 0) continue;

			// Seeded chance — skip most tiles
			if (tileHash(x, z, 100) > SCATTER_CHANCE) continue;

			// Pick a model deterministically from the available list
			const modelIdx = Math.floor(tileHash(x, z, 101) * modelPaths.length);
			const modelPath = modelPaths[modelIdx];
			const url = MODEL_BASE + modelPath;

			const pos = tileToWorld(x, z);
			const elevY = ELEVATION_Y[tile.elevation] ?? 0;

			// Random offset within tile (stay within 40% of center)
			const offsetX = (tileHash(x, z, 102) - 0.5) * TILE_SIZE * 0.4;
			const offsetZ = (tileHash(x, z, 103) - 0.5) * TILE_SIZE * 0.4;
			const rotation = tileHash(x, z, 104) * Math.PI * 2;
			const scale =
				SCATTER_SCALE_MIN +
				tileHash(x, z, 105) * (SCATTER_SCALE_MAX - SCATTER_SCALE_MIN);

			loader.load(
				url,
				(gltf) => {
					const model = gltf.scene;
					model.position.set(pos.x + offsetX, elevY, pos.z + offsetZ);
					model.rotation.y = rotation;
					model.scale.setScalar(scale);
					enableShadows(model);
					scene.add(model);
				},
				undefined,
				(err) => {
					console.warn(`[scatterRenderer] Failed to load ${url}:`, err);
				},
			);
		}
	}
}
