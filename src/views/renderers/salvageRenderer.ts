/**
 * salvageRenderer — renders salvage props as GLB models in a pure Three.js scene.
 *
 * NO React. Uses GLTFLoader directly. Fog-gated via buildExploredSet.
 * Models are cached per URL and cloned per tile position.
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildExploredSet, resolveSalvageModelUrl } from "../../rendering";
import { SalvageProp } from "../../traits";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const gltfLoader = new GLTFLoader();

/** Cached loaded GLTF scenes keyed by URL. */
const modelCache = new Map<string, THREE.Group>();

/** Placed salvage meshes keyed by "tileX,tileZ". */
const placedModels = new Map<string, THREE.Object3D>();

/** Reference to the parent scene so updateSalvage can add/remove. */
let parentScene: THREE.Scene | null = null;

/** Container group for all salvage props. */
let salvageGroup: THREE.Group | null = null;

// ---------------------------------------------------------------------------
// GLB loading helper
// ---------------------------------------------------------------------------

function loadModel(url: string): Promise<THREE.Group> {
	const cached = modelCache.get(url);
	if (cached) return Promise.resolve(cached);

	return new Promise<THREE.Group>((resolve, reject) => {
		gltfLoader.load(
			url,
			(gltf) => {
				modelCache.set(url, gltf.scene);
				resolve(gltf.scene);
			},
			undefined,
			reject,
		);
	});
}

// ---------------------------------------------------------------------------
// Clone + shadow helper
// ---------------------------------------------------------------------------

function cloneWithShadows(source: THREE.Group): THREE.Group {
	const clone = source.clone(true);
	clone.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			child.castShadow = true;
		}
	});
	return clone;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the salvage renderer — call once when the scene is set up.
 * Performs an initial scan of the ECS world and loads visible salvage models.
 */
export function createSalvageRenderer(scene: THREE.Scene, world: World): void {
	parentScene = scene;
	salvageGroup = new THREE.Group();
	salvageGroup.name = "salvage";
	scene.add(salvageGroup);

	// Kick off initial placement
	updateSalvage(world);
}

/**
 * Synchronise placed salvage models with the current ECS state.
 *
 * - Adds models for newly-explored / newly-spawned salvage
 * - Removes models for consumed salvage or tiles that lost visibility
 */
export function updateSalvage(world: World): void {
	if (!salvageGroup || !parentScene) return;

	const explored = buildExploredSet(world);

	// Collect desired set of salvage tile keys
	const desired = new Map<
		string,
		{ url: string; tileX: number; tileZ: number }
	>();

	for (const entity of world.query(SalvageProp)) {
		const prop = entity.get(SalvageProp);
		if (!prop || prop.consumed) continue;

		const key = `${prop.tileX},${prop.tileZ}`;
		if (!explored.has(key)) continue;

		const url = resolveSalvageModelUrl(prop.modelId);
		if (!url) continue;

		desired.set(key, { url, tileX: prop.tileX, tileZ: prop.tileZ });
	}

	// Remove stale entries
	for (const [key, obj] of placedModels) {
		if (!desired.has(key)) {
			salvageGroup.remove(obj);
			placedModels.delete(key);
		}
	}

	// Add missing entries
	for (const [key, info] of desired) {
		if (placedModels.has(key)) continue;

		// Fire-and-forget load — model appears once asset is ready
		void loadModel(info.url).then((source) => {
			// Guard: may have been removed between load start and finish
			if (!salvageGroup || placedModels.has(key)) return;

			const clone = cloneWithShadows(source);
			const pos = tileToWorld(info.tileX, info.tileZ);
			clone.position.set(pos.x, pos.y, pos.z);

			salvageGroup.add(clone);
			placedModels.set(key, clone);
		});
	}
}
