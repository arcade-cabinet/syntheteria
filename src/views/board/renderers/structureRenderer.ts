/**
 * structureRenderer — renders walls, columns, and infrastructure GLBs.
 *
 * Uses existing rendering/structureHelpers.ts for geometry calculations
 * and rendering/modelPaths.ts for GLB URL resolution.
 *
 * Fog-gated: only renders structures on explored tiles.
 * NO React — pure Three.js.
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GeneratedBoard } from "../../../board";
import {
	buildExploredSet,
	getStructuralEdges,
	resolveStructureModelUrl,
	STRUCTURE_COLUMN_MODELS,
	STRUCTURE_WALL_MODELS,
} from "../../../rendering";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const loader = new GLTFLoader();
const loadedModels = new Map<string, THREE.Object3D>();
const placedStructures = new Map<string, THREE.Object3D>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createStructureRenderer(
	scene: THREE.Scene,
	world: World,
	board: GeneratedBoard,
): void {
	const explored = buildExploredSet(world);
	const edges = getStructuralEdges(board);

	// Edge rotation: N=0, E=π/2, S=π, W=3π/2
	const edgeRotation: Record<string, number> = {
		N: 0,
		E: Math.PI / 2,
		S: Math.PI,
		W: (3 * Math.PI) / 2,
	};

	for (const edge of edges) {
		const key = `${edge.x},${edge.z},${edge.edge}`;

		// Skip unexplored
		if (!explored.has(`${edge.x},${edge.z}`)) continue;

		// Pick wall model
		const modelId =
			STRUCTURE_WALL_MODELS[
				Math.abs(edge.x + edge.z) % STRUCTURE_WALL_MODELS.length
			];
		if (!modelId) continue;

		const url = resolveStructureModelUrl(modelId);
		if (!url) continue;

		const rot = edgeRotation[edge.edge] ?? 0;
		loadAndPlace(scene, url, key, edge.x, edge.z, rot);
	}
}

export function updateStructures(world: World, board: GeneratedBoard): void {
	// Structures are static after placement — only need to update
	// if fog of war reveals new tiles. For now, no-op.
	// TODO: rebuild when explored set changes
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function loadAndPlace(
	scene: THREE.Scene,
	url: string,
	key: string,
	tileX: number,
	tileZ: number,
	rotationY: number,
): void {
	if (placedStructures.has(key)) return;

	const cached = loadedModels.get(url);
	if (cached) {
		placeModel(scene, cached.clone(), key, tileX, tileZ, rotationY);
		return;
	}

	loader.load(
		url,
		(gltf) => {
			loadedModels.set(url, gltf.scene);
			placeModel(scene, gltf.scene.clone(), key, tileX, tileZ, rotationY);
		},
		undefined,
		(err) => {
			console.warn(`[structureRenderer] Failed to load ${url}:`, err);
		},
	);
}

function placeModel(
	scene: THREE.Scene,
	model: THREE.Object3D,
	key: string,
	tileX: number,
	tileZ: number,
	rotationY: number,
): void {
	const pos = tileToWorld(tileX, tileZ);
	model.position.set(pos.x, pos.y, pos.z);
	model.rotation.y = rotationY;

	model.traverse((child) => {
		if ((child as THREE.Mesh).isMesh) {
			(child as THREE.Mesh).castShadow = true;
			(child as THREE.Mesh).receiveShadow = true;
		}
	});

	scene.add(model);
	placedStructures.set(key, model);
}
