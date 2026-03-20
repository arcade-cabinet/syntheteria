/**
 * unitRenderer — loads and renders robot GLB models in the Phaser Scene3D.
 *
 * Pure Three.js, no React. Queries the Koota world for entities with
 * UnitPos + UnitVisual traits, loads their GLB models via GLTFLoader,
 * and applies procedural bob-and-weave animation per architecture mandate.
 */

import type { World } from "koota";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveRobotModelUrl } from "../../../rendering";
import { UnitMove, UnitPos, UnitVisual } from "../../../traits";
import { tileToWorld } from "./terrainRenderer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL_SCALE = 2.5;
const BOB_AMPLITUDE = 0.08;
const BOB_SPEED = 0.002;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Loaded meshes keyed by entity id. */
const meshes = new Map<number, THREE.Object3D>();

/** In-flight load promises to avoid duplicate loads. */
const loading = new Set<number>();

/** Per-entity phase offset for bob animation (deterministic from id). */
const phaseOffsets = new Map<number, number>();

/** Base Y position per entity (from tileToWorld). */
const baseYPositions = new Map<number, number>();

let loader: GLTFLoader | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the unit renderer — returns the loader instance (call once).
 * Units are added/removed reactively via `updateUnits`.
 */
export function createUnitRenderer(_scene: THREE.Scene, _world: World): void {
	loader = new GLTFLoader();
}

/**
 * Sync ECS unit entities with Three.js meshes and animate.
 *
 * Call every frame from the Phaser update loop.
 */
export function updateUnits(
	world: World,
	time: number,
	scene: THREE.Scene,
): void {
	if (!loader) return;

	// Collect current entity ids from the ECS query
	const alive = new Set<number>();

	for (const entity of world.query(UnitPos, UnitVisual)) {
		const id = entity.id();
		alive.add(id);

		const pos = entity.get(UnitPos);
		const visual = entity.get(UnitVisual);
		if (!pos || !visual) continue;

		// Already loaded — update position + animation
		const existing = meshes.get(id);
		if (existing) {
			// Check for movement animation via UnitMove trait
			const move = entity.has(UnitMove) ? entity.get(UnitMove) : null;

			let wpX: number;
			let wpY: number;
			let wpZ: number;

			if (move) {
				// Lerp between source and destination tile positions
				const from = tileToWorld(move.fromX, move.fromZ);
				const to = tileToWorld(move.toX, move.toZ);
				const t = Math.min(1.0, Math.max(0.0, move.progress));

				wpX = from.x + (to.x - from.x) * t;
				wpY = from.y + (to.y - from.y) * t;
				wpZ = from.z + (to.z - from.z) * t;

				// Face movement direction
				const dx = to.x - from.x;
				const dz = to.z - from.z;
				if (dx !== 0 || dz !== 0) {
					existing.rotation.y = Math.atan2(dx, dz);
				}
			} else {
				const wp = tileToWorld(pos.tileX, pos.tileZ);
				wpX = wp.x;
				wpY = wp.y;
				wpZ = wp.z;

				// Apply facing angle (only when stationary)
				existing.rotation.y = visual.facingAngle;
			}

			baseYPositions.set(id, wpY);
			existing.position.x = wpX;
			existing.position.z = wpZ;

			// Bob-and-weave procedural animation
			const phase = phaseOffsets.get(id) ?? 0;
			existing.position.y =
				wpY + Math.sin(time * BOB_SPEED + phase) * BOB_AMPLITUDE;

			continue;
		}

		// Not loaded and not currently loading — kick off load
		if (loading.has(id)) continue;
		loading.add(id);

		const url = resolveRobotModelUrl(visual.modelId);
		loader.load(
			url,
			(gltf) => {
				loading.delete(id);

				// Entity may have been destroyed while loading
				if (!alive.has(id)) {
					return;
				}

				const model = gltf.scene;
				model.scale.setScalar(MODEL_SCALE * visual.scale);

				// Enable shadows on all mesh children
				model.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});

				// Position on tile
				const wp = tileToWorld(pos.tileX, pos.tileZ);
				model.position.set(wp.x, wp.y, wp.z);
				model.rotation.y = visual.facingAngle;

				// Deterministic phase offset from entity id
				const phase = (id * 2654435761) % (Math.PI * 2);
				phaseOffsets.set(id, phase);
				baseYPositions.set(id, wp.y);

				meshes.set(id, model);
				scene.add(model);
			},
			undefined,
			(error) => {
				loading.delete(id);
				console.error(
					`[unitRenderer] Failed to load model for entity ${id}:`,
					error,
				);
			},
		);
	}

	// Remove meshes for destroyed entities
	for (const [id, mesh] of meshes) {
		if (!alive.has(id)) {
			scene.remove(mesh);
			meshes.delete(id);
			phaseOffsets.delete(id);
			baseYPositions.delete(id);
		}
	}
}
