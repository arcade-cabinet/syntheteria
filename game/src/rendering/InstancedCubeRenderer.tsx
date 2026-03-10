/**
 * InstancedCubeRenderer — React Three Fiber component that renders all
 * MaterialCube entities using instanced draw calls.
 *
 * Replaces the per-entity CubeMesh approach in CubeRenderer.tsx with one
 * InstancedMesh per material type. Each frame:
 *
 *   1. Queries all MaterialCube entities from Koota ECS
 *   2. Groups them by material type
 *   3. Syncs instance transforms from entity positions
 *   4. Updates per-instance highlight colors for selected cubes
 *   5. Flushes dirty GPU buffers
 *
 * Held cubes (HeldBy relation) are rendered separately as single meshes
 * in front of the camera, since they need special camera-relative positioning.
 *
 * Performance target: 5000+ cubes at 60fps on mobile WebGL.
 */

import { useFrame, useThree } from "@react-three/fiber";
import type { Entity as KootaEntity } from "koota";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { allMaterialCubes } from "../ecs/koota/queries";
import {
	HeldBy,
	IsSelected,
	kootaWorld,
	MaterialCube,
	Position,
} from "../ecs/koota/world";
import type { CubeHandle } from "./InstancedCubeManager";
import { InstancedCubeManager } from "./InstancedCubeManager";
import {
	resolveCubeMaterial,
	usePreloadCubeMaterials,
} from "./materials/CubeMaterialProvider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Offset for held cubes rendered in front of the camera */
const HELD_OFFSET = new THREE.Vector3(0.3, -0.2, -0.6);

/** Cube geometry size (must match InstancedCubeManager) */
const CUBE_SIZE = 0.5;

/** Selection emissive for held cubes (rendered as individual meshes) */
const SELECT_EMISSIVE = new THREE.Color(0x00ff88);
const SELECT_EMISSIVE_INTENSITY = 0.3;

/** Ghost material colors */
const GHOST_VALID_COLOR = new THREE.Color(0x00ff66);
const GHOST_INVALID_COLOR = new THREE.Color(0xff3333);
const GHOST_OPACITY = 0.35;

// ---------------------------------------------------------------------------
// Shared resources for held/ghost cubes
// ---------------------------------------------------------------------------

let _heldBoxGeometry: THREE.BoxGeometry | null = null;

function getHeldBoxGeometry(): THREE.BoxGeometry {
	if (!_heldBoxGeometry) {
		_heldBoxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
	}
	return _heldBoxGeometry;
}

const ghostMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

function getGhostMaterial(valid: boolean): THREE.MeshBasicMaterial {
	const key = valid ? "valid" : "invalid";
	const cached = ghostMaterialCache.get(key);
	if (cached) return cached;

	const mat = new THREE.MeshBasicMaterial({
		color: valid ? GHOST_VALID_COLOR : GHOST_INVALID_COLOR,
		transparent: true,
		opacity: GHOST_OPACITY,
		depthWrite: false,
		side: THREE.FrontSide,
	});
	ghostMaterialCache.set(key, mat);
	return mat;
}

// ---------------------------------------------------------------------------
// Entity-to-handle mapping
// ---------------------------------------------------------------------------

/**
 * Tracks which Koota entity is mapped to which CubeHandle in the manager.
 * Keyed by entity number (Koota entities are branded numbers).
 */
type EntityHandleMap = Map<number, CubeHandle>;

// ---------------------------------------------------------------------------
// Held cube rendering (individual meshes, camera-relative)
// ---------------------------------------------------------------------------

interface HeldCubeSnapshot {
	entityKey: number;
	materialType: string;
	isSelected: boolean;
}

interface HeldCubeMeshProps {
	entityKey: number;
	materialType: string;
	isSelected: boolean;
	entityRef: Map<number, KootaEntity>;
}

function HeldCubeMesh({
	entityKey,
	materialType,
	isSelected,
	entityRef,
}: HeldCubeMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const baseMaterial = resolveCubeMaterial(materialType);
	const camera = useThree((state) => state.camera);

	const material = useMemo(() => baseMaterial.clone(), [baseMaterial]);

	useEffect(() => {
		return () => {
			material.dispose();
		};
	}, [material]);

	useEffect(() => {
		if (isSelected) {
			material.emissive.copy(SELECT_EMISSIVE);
			material.emissiveIntensity = SELECT_EMISSIVE_INTENSITY;
		} else {
			material.emissive.set(0x000000);
			material.emissiveIntensity = 0;
		}
		material.needsUpdate = true;
	}, [isSelected, material]);

	useFrame(() => {
		if (!meshRef.current) return;

		const entity = entityRef.get(entityKey);
		if (!entity) return;

		const offset = HELD_OFFSET.clone().applyQuaternion(camera.quaternion);
		meshRef.current.position.copy(camera.position).add(offset);
		meshRef.current.renderOrder = 1000;
	});

	return (
		<mesh
			ref={meshRef}
			geometry={getHeldBoxGeometry()}
			material={material}
			castShadow
			receiveShadow
		/>
	);
}

// ---------------------------------------------------------------------------
// Ghost cube component (for placement preview)
// ---------------------------------------------------------------------------

interface GhostCubeProps {
	position: THREE.Vector3;
	valid: boolean;
}

/**
 * Renders a transparent ghost cube at the given position for placement preview.
 * Green tint = valid placement, Red tint = invalid placement.
 */
export function GhostCube({ position, valid }: GhostCubeProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const ghostMat = useMemo(() => getGhostMaterial(valid), [valid]);

	useFrame(() => {
		if (meshRef.current) {
			meshRef.current.position.copy(position);
		}
	});

	return (
		<mesh
			ref={meshRef}
			geometry={getHeldBoxGeometry()}
			material={ghostMat}
			renderOrder={999}
		/>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface InstancedCubeRendererProps {
	/** Maximum number of instances per material type (default: 10000) */
	maxInstances?: number;
}

/**
 * Renders all MaterialCube entities from the Koota ECS world using instanced
 * draw calls. One InstancedMesh per material type, with swap-and-pop instance
 * management for efficient add/remove.
 *
 * Held cubes are excluded from instancing and rendered as individual meshes
 * in front of the camera.
 */
export function InstancedCubeRenderer({
	maxInstances = 10_000,
}: InstancedCubeRendererProps) {
	usePreloadCubeMaterials();

	// Stable manager instance, recreated only if maxInstances changes
	const manager = useMemo(
		() => new InstancedCubeManager(maxInstances),
		[maxInstances],
	);

	// Entity-to-handle mapping (survives across frames)
	const entityHandleMap = useRef<EntityHandleMap>(new Map());

	// Entity store for held cube components
	const heldEntityRef = useRef<Map<number, KootaEntity>>(new Map());

	// Held cubes rendered as individual meshes
	const [heldCubes, setHeldCubes] = useState<HeldCubeSnapshot[]>([]);
	const prevHeldHash = useRef("");

	// Attach the manager's group to the R3F scene via a ref on a <primitive>
	const groupRef = useRef<THREE.Group>(null);

	// Dispose on unmount
	useEffect(() => {
		return () => {
			manager.dispose();
			InstancedCubeManager.disposeSharedResources();
			entityHandleMap.current.clear();
			heldEntityRef.current.clear();

			if (_heldBoxGeometry) {
				_heldBoxGeometry.dispose();
				_heldBoxGeometry = null;
			}
			for (const mat of ghostMaterialCache.values()) {
				mat.dispose();
			}
			ghostMaterialCache.clear();
		};
	}, [manager]);

	// Per-frame sync: query ECS, reconcile instanced meshes
	useFrame(() => {
		const entities = kootaWorld.query(allMaterialCubes);
		const handleMap = entityHandleMap.current;

		// Track which entities we've seen this frame for cleanup
		const seenEntityKeys = new Set<number>();
		const heldSnapshots: HeldCubeSnapshot[] = [];

		heldEntityRef.current.clear();

		for (const entity of entities) {
			const mc = entity.get(MaterialCube);
			if (!mc) continue;

			const entityKey = entity as unknown as number;
			seenEntityKeys.add(entityKey);

			const isHeld = entity.has(HeldBy("*"));
			const isSelected = entity.has(IsSelected);
			const pos = entity.get(Position);

			if (isHeld) {
				// Held cubes are rendered individually, not instanced
				heldEntityRef.current.set(entityKey, entity);
				heldSnapshots.push({
					entityKey,
					materialType: mc.material,
					isSelected,
				});

				// If this entity was previously instanced, remove it
				const existingHandle = handleMap.get(entityKey);
				if (existingHandle) {
					manager.removeCube(existingHandle);
					handleMap.delete(entityKey);
				}
				continue;
			}

			if (!pos) continue;

			const existingHandle = handleMap.get(entityKey);

			if (existingHandle) {
				// Entity already instanced — update position and highlight
				if (existingHandle.materialType !== mc.material) {
					// Material changed — remove and re-add
					manager.removeCube(existingHandle);
					const material = resolveCubeMaterial(mc.material);
					const newHandle = manager.addCube(
						mc.material,
						pos,
						{ x: 0, y: 0, z: 0 },
						material,
					);
					handleMap.set(entityKey, newHandle);

					if (isSelected) {
						manager.setHighlight(newHandle, true);
					}
				} else {
					// Same material — just update position
					manager.updateCubePosition(existingHandle, pos);

					// Update highlight state
					const currentlyHighlighted = manager.isHighlighted(existingHandle);
					if (isSelected !== currentlyHighlighted) {
						manager.setHighlight(existingHandle, isSelected);
					}
				}
			} else {
				// New entity — add to instanced rendering
				const material = resolveCubeMaterial(mc.material);
				const handle = manager.addCube(
					mc.material,
					pos,
					{ x: 0, y: 0, z: 0 },
					material,
				);
				handleMap.set(entityKey, handle);

				if (isSelected) {
					manager.setHighlight(handle, true);
				}
			}
		}

		// Remove instanced cubes for entities that no longer exist
		for (const [entityKey, handle] of handleMap) {
			if (!seenEntityKeys.has(entityKey)) {
				manager.removeCube(handle);
				handleMap.delete(entityKey);
			}
		}

		// Flush dirty buffers to GPU
		manager.flush();

		// Update held cubes React state only when the set changes
		const heldHash = heldSnapshots
			.map((s) => `${s.entityKey}:${s.materialType}:${s.isSelected ? 1 : 0}`)
			.join("|");

		if (heldHash !== prevHeldHash.current) {
			prevHeldHash.current = heldHash;
			setHeldCubes(heldSnapshots);
		}
	});

	return (
		<>
			{/* InstancedMesh group — contains one InstancedMesh per material */}
			<primitive ref={groupRef} object={manager.group} />

			{/* Held cubes — rendered individually in front of camera */}
			{heldCubes.map((cube) => (
				<HeldCubeMesh
					key={cube.entityKey}
					entityKey={cube.entityKey}
					materialType={cube.materialType}
					isSelected={cube.isSelected}
					entityRef={heldEntityRef.current}
				/>
			))}
		</>
	);
}
