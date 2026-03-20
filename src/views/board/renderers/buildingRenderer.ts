/**
 * buildingRenderer — loads and positions faction buildings and cult structures
 * as GLB models in the Scene3D Three.js scene.
 *
 * NO React — pure Three.js. Models are loaded via GLTFLoader and placed at
 * tile-world positions. Fog-gated: only explored tiles show buildings.
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveBuildingModelUrl } from "../../../config";
import { buildExploredSet } from "../../../lib/fog";
import { Building, CultStructure } from "../../../traits";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const loader = new GLTFLoader();

/** Currently placed building models, keyed by `${tileX},${tileZ}`. */
let placedModels: Map<string, THREE.Object3D> = new Map();

/** Scene reference stored at init time. */
let sceneRef: THREE.Scene | null = null;

/** Pending loads — prevents duplicate load requests for the same tile. */
const pendingLoads = new Set<string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function enableShadows(object: THREE.Object3D): void {
	object.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
		}
	});
}

function tileKey(tileX: number, tileZ: number): string {
	return `${tileX},${tileZ}`;
}

/**
 * Load a GLB model and place it at the given tile position.
 * Skips if already placed or currently loading.
 */
function loadAndPlace(
	scene: THREE.Scene,
	url: string,
	tileX: number,
	tileZ: number,
): void {
	const key = tileKey(tileX, tileZ);
	if (placedModels.has(key) || pendingLoads.has(key)) return;

	pendingLoads.add(key);

	loader.load(
		url,
		(gltf) => {
			pendingLoads.delete(key);
			// Guard: may have been placed by a concurrent load or removed
			if (placedModels.has(key)) {
				return;
			}

			const model = gltf.scene;
			const pos = tileToWorld(tileX, tileZ);
			model.position.set(pos.x, pos.y, pos.z);
			enableShadows(model);

			scene.add(model);
			placedModels.set(key, model);
		},
		undefined,
		(err) => {
			pendingLoads.delete(key);
			console.warn(
				`[buildingRenderer] Failed to load GLB for tile ${key}:`,
				err,
			);
		},
	);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the building renderer. Call once when the scene is created.
 * Performs the first scan of the ECS world and begins loading visible models.
 */
export function createBuildingRenderer(scene: THREE.Scene, world: World): void {
	sceneRef = scene;
	placedModels = new Map();
	pendingLoads.clear();

	updateBuildings(world);
}

/**
 * Synchronise placed models with the current ECS world state.
 *
 * - Adds models for new buildings / cult structures on explored tiles.
 * - Removes models whose entities no longer exist.
 *
 * Call this each frame or after state changes (turn advance, fog reveal, etc).
 */
export function updateBuildings(world: World): void {
	const scene = sceneRef;
	if (!scene) return;

	const explored = buildExploredSet(world);

	// Track which keys should currently exist so we can cull stale entries.
	const activeKeys = new Set<string>();

	// --- Faction buildings ---
	for (const entity of world.query(Building)) {
		const b = entity.get(Building);
		if (!b) continue;

		const key = tileKey(b.tileX, b.tileZ);

		// Fog gate — skip unexplored tiles
		if (!explored.has(key)) continue;

		activeKeys.add(key);

		if (placedModels.has(key)) continue;

		const url = resolveBuildingModelUrl(b.modelId);
		if (!url) continue;

		loadAndPlace(scene, url, b.tileX, b.tileZ);
	}

	// --- Cult structures ---
	for (const entity of world.query(CultStructure)) {
		const cs = entity.get(CultStructure);
		if (!cs) continue;

		const key = tileKey(cs.tileX, cs.tileZ);

		if (!explored.has(key)) continue;

		activeKeys.add(key);

		if (placedModels.has(key)) continue;

		// resolveBuildingModelUrl handles both building and cult model IDs
		const url = resolveBuildingModelUrl(cs.modelId);
		if (!url) continue;

		loadAndPlace(scene, url, cs.tileX, cs.tileZ);
	}

	// --- Remove stale models (entity destroyed, tile un-explored, etc.) ---
	for (const [key, model] of placedModels) {
		if (!activeKeys.has(key)) {
			scene.remove(model);
			placedModels.delete(key);
		}
	}
}
