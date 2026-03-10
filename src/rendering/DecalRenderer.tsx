/**
 * DecalRenderer — R3F component that manages decal lifecycle and rendering.
 *
 * Renders active decals as thin mesh overlays on cubes and buildings.
 * Integrates with the Koota ECS to:
 *   - Auto-apply damage decals when cube HP drops below 50%
 *   - Auto-apply rust decals to cubes placed for extended periods
 *
 * Decal meshes are added to a Three.js Group which is mounted into the
 * R3F scene graph. The DecalSystem module handles geometry/material
 * creation and disposal; this component handles the frame loop and
 * ECS-driven auto-application.
 *
 * Materials use alpha blending with polygonOffset to avoid z-fighting
 * against the surfaces they project onto.
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { allMaterialCubes, placedCubes } from "../ecs/koota/queries";
import {
	kootaWorld,
	MaterialCube,
	PlacedAt,
	Position,
} from "../ecs/koota/world";
import {
	addDecal,
	disposeAllDecals,
	getActiveDecalIds,
	getDecalMesh,
	updateDecals,
} from "./DecalSystem";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HP threshold below which damage decals are applied (fraction of maxHp). */
const DAMAGE_THRESHOLD = 0.5;

/** Minimum seconds between auto-decal checks to avoid per-frame overhead. */
const CHECK_INTERVAL = 2.0;

/** Size of damage crack decals. */
const CRACK_SIZE = new THREE.Vector3(0.3, 0.3, 0.15);

/** Size of rust decals. */
const RUST_SIZE = new THREE.Vector3(0.35, 0.35, 0.15);

/**
 * Simulated age (seconds) after which a placed cube starts developing rust.
 * In a full implementation this would be tracked per-entity; here we use
 * a deterministic hash of grid position to vary the timing.
 */
const RUST_AGE_THRESHOLD = 60;

// ---------------------------------------------------------------------------
// Tracking maps — prevent duplicate decals on the same entity
// ---------------------------------------------------------------------------

/**
 * Entity key -> decal ID for damage decals already applied.
 * Prevents re-applying crack decals every check interval.
 */
const damageDecalMap = new Map<number, number>();

/**
 * Entity key -> decal ID for rust decals already applied.
 */
const rustDecalMap = new Map<number, number>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple hash for deterministic variation from grid coords. */
function gridHash(x: number, z: number): number {
	const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
	return h - Math.floor(h);
}

/**
 * Create a stand-in box mesh at a given position for decal projection.
 * DecalGeometry needs a mesh to project onto; for cubes we construct a
 * temporary 0.5m box at the cube's world position.
 */
function createCubeProxyMesh(pos: {
	x: number;
	y: number;
	z: number;
}): THREE.Mesh {
	const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
	const material = new THREE.MeshBasicMaterial(); // throwaway
	const mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(pos.x, pos.y, pos.z);
	mesh.updateMatrixWorld(true);
	return mesh;
}

/**
 * Dispose the temporary proxy mesh created for decal projection.
 */
function disposeProxyMesh(mesh: THREE.Mesh): void {
	mesh.geometry.dispose();
	if (mesh.material instanceof THREE.Material) {
		mesh.material.dispose();
	}
}

/**
 * Pick a random face normal for a cube (one of the 6 axis-aligned directions).
 * Uses a seed value for deterministic results.
 */
function randomFaceNormal(seed: number): THREE.Vector3 {
	const normals = [
		new THREE.Vector3(1, 0, 0),
		new THREE.Vector3(-1, 0, 0),
		new THREE.Vector3(0, 1, 0),
		new THREE.Vector3(0, -1, 0),
		new THREE.Vector3(0, 0, 1),
		new THREE.Vector3(0, 0, -1),
	];
	const index = Math.floor(Math.abs(seed * 6)) % 6;
	return normals[index];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Mounts a Three.js Group into the scene and manages decal lifecycle.
 *
 * Place this component inside the R3F Canvas alongside other renderers:
 * ```tsx
 * <Canvas>
 *   <CubeRenderer />
 *   <DecalRenderer />
 * </Canvas>
 * ```
 */
export function DecalRenderer() {
	const groupRef = useRef<THREE.Group>(null);
	const checkTimer = useRef(0);
	/** Monotonic time accumulator for rust age simulation. */
	const totalTime = useRef(0);

	// Dispose everything on unmount
	useEffect(() => {
		return () => {
			damageDecalMap.clear();
			rustDecalMap.clear();
			disposeAllDecals();
		};
	}, []);

	useFrame((_, delta) => {
		const group = groupRef.current;
		if (!group) return;

		totalTime.current += delta;

		// 1. Update decal ages and fading
		const removedIds = updateDecals(delta);

		// Clean tracking maps when decals are removed by the system
		for (const id of removedIds) {
			for (const [entityKey, decalId] of damageDecalMap) {
				if (decalId === id) {
					damageDecalMap.delete(entityKey);
					break;
				}
			}
			for (const [entityKey, decalId] of rustDecalMap) {
				if (decalId === id) {
					rustDecalMap.delete(entityKey);
					break;
				}
			}
		}

		// 2. Sync decal meshes into the group
		// Ensure all active decals are children of our group
		const activeIds = getActiveDecalIds();
		for (const id of activeIds) {
			const mesh = getDecalMesh(id);
			if (mesh && !mesh.parent) {
				group.add(mesh);
			}
		}

		// 3. Periodically check ECS for new damage/rust candidates
		checkTimer.current += delta;
		if (checkTimer.current < CHECK_INTERVAL) return;
		checkTimer.current = 0;

		// --- Damage decals on cubes with HP < 50% ---
		const cubeEntities = kootaWorld.query(allMaterialCubes);
		for (const entity of cubeEntities) {
			const mc = entity.get(MaterialCube);
			const pos = entity.get(Position);
			if (!mc || !pos) continue;

			const entityKey = entity as unknown as number;
			const hpFraction = mc.maxHp > 0 ? mc.hp / mc.maxHp : 1;

			if (hpFraction < DAMAGE_THRESHOLD && !damageDecalMap.has(entityKey)) {
				// Create a proxy mesh for decal projection
				const proxy = createCubeProxyMesh(pos);
				const normal = randomFaceNormal(entityKey * 0.1337);
				const hitPoint = new THREE.Vector3(pos.x, pos.y, pos.z).add(
					normal.clone().multiplyScalar(0.25),
				);

				const decalId = addDecal(proxy, "crack", hitPoint, normal, CRACK_SIZE);
				disposeProxyMesh(proxy);

				if (decalId >= 0) {
					damageDecalMap.set(entityKey, decalId);
					const mesh = getDecalMesh(decalId);
					if (mesh) group.add(mesh);
				}
			}
		}

		// --- Rust decals on placed cubes that have been down long enough ---
		const placedEntities = kootaWorld.query(placedCubes);
		for (const entity of placedEntities) {
			const pos = entity.get(Position);
			const placed = entity.get(PlacedAt);
			if (!pos || !placed) continue;

			const entityKey = entity as unknown as number;
			if (rustDecalMap.has(entityKey)) continue;

			// Use grid position hash to stagger rust appearance
			const hash = gridHash(placed.gridX, placed.gridZ);
			const rustTime = RUST_AGE_THRESHOLD + hash * 60; // 60-120s range

			if (totalTime.current > rustTime) {
				const proxy = createCubeProxyMesh(pos);
				const normal = randomFaceNormal(hash);
				const hitPoint = new THREE.Vector3(pos.x, pos.y, pos.z).add(
					normal.clone().multiplyScalar(0.25),
				);

				const decalId = addDecal(proxy, "rust", hitPoint, normal, RUST_SIZE);
				disposeProxyMesh(proxy);

				if (decalId >= 0) {
					rustDecalMap.set(entityKey, decalId);
					const mesh = getDecalMesh(decalId);
					if (mesh) group.add(mesh);
				}
			}
		}
	});

	return <group ref={groupRef} />;
}
