/**
 * CubeRenderer -- renders MaterialCube entities from the Koota ECS.
 *
 * Each cube is a 0.5m box with PBR materials loaded via useCubeMaterial().
 * Supports three visual modes:
 *   - Normal: full PBR material at the cube's world position
 *   - Selected: emissive boost to highlight the cube
 *   - Ghost: transparent green/red tint for placement preview
 *
 * Cubes in the "held" state (HeldBy relation) are rendered in front of
 * the camera rather than at their world position.
 *
 * The renderer polls the Koota query each frame and reconciles the React
 * component tree when the entity set changes. Individual cube positions
 * are updated imperatively in useFrame for performance.
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
import {
	useCubeMaterial,
	usePreloadCubeMaterials,
} from "./materials/CubeMaterialProvider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cube geometry size -- 0.5m on each side */
const CUBE_SIZE = 0.5;

/** Emissive color and intensity for selected cubes */
const SELECT_EMISSIVE = new THREE.Color(0x00ff88);
const SELECT_EMISSIVE_INTENSITY = 0.3;

/** Ghost material colors */
const GHOST_VALID_COLOR = new THREE.Color(0x00ff66);
const GHOST_INVALID_COLOR = new THREE.Color(0xff3333);
const GHOST_OPACITY = 0.35;

/** Offset for held cubes relative to camera */
const HELD_OFFSET = new THREE.Vector3(0.3, -0.2, -0.6);

// ---------------------------------------------------------------------------
// Shared geometry (reused across all cube instances)
// ---------------------------------------------------------------------------

let sharedBoxGeometry: THREE.BoxGeometry | null = null;

function getBoxGeometry(): THREE.BoxGeometry {
	if (!sharedBoxGeometry) {
		sharedBoxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
	}
	return sharedBoxGeometry;
}

// ---------------------------------------------------------------------------
// Ghost material (shared, reused for placement previews)
// ---------------------------------------------------------------------------

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
// Entity reference store
//
// Since Koota entities are branded numbers, we store them in a Map keyed
// by the entity number so CubeMesh components can look up their entity
// to read position data in useFrame.
// ---------------------------------------------------------------------------

const entityStore = new Map<number, KootaEntity>();

// ---------------------------------------------------------------------------
// Individual cube mesh component
// ---------------------------------------------------------------------------

interface CubeMeshProps {
	/** Koota entity ID (branded number cast to plain number for React key) */
	entityKey: number;
	materialType: string;
	isSelected: boolean;
	isHeld: boolean;
}

function CubeMesh({
	entityKey,
	materialType,
	isSelected,
	isHeld,
}: CubeMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const baseMaterial = useCubeMaterial(materialType);
	const camera = useThree((state) => state.camera);

	// Create a per-instance clone so we can modify emissive independently
	const material = useMemo(() => {
		return baseMaterial.clone();
	}, [baseMaterial]);

	// Clean up cloned material on unmount
	useEffect(() => {
		return () => {
			material.dispose();
		};
	}, [material]);

	// Update emissive for selection state
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

	// Update position each frame from Koota entity data
	useFrame(() => {
		if (!meshRef.current) return;

		const entity = entityStore.get(entityKey);
		if (!entity) return;

		if (isHeld) {
			// Render in front of camera
			const offset = HELD_OFFSET.clone().applyQuaternion(camera.quaternion);
			meshRef.current.position.copy(camera.position).add(offset);
			meshRef.current.renderOrder = 1000;
		} else {
			const pos = entity.get(Position);
			if (pos) {
				meshRef.current.position.set(pos.x, pos.y, pos.z);
			}
			meshRef.current.renderOrder = 0;
		}
	});

	return (
		<mesh
			ref={meshRef}
			geometry={getBoxGeometry()}
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
	/** World-space position for the ghost cube */
	position: THREE.Vector3;
	/** Whether this is a valid placement location */
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
			geometry={getBoxGeometry()}
			material={ghostMat}
			renderOrder={999}
		/>
	);
}

// ---------------------------------------------------------------------------
// Snapshot type for React reconciliation
// ---------------------------------------------------------------------------

interface CubeSnapshot {
	entityKey: number;
	materialType: string;
	isSelected: boolean;
	isHeld: boolean;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Renders all MaterialCube entities from the Koota ECS world.
 *
 * Uses useFrame to poll the Koota query each frame and reconciles the
 * React component tree when the set of entities changes. Individual cube
 * positions are updated imperatively in useFrame for performance.
 */
export function CubeRenderer() {
	// Preload all PBR textures on mount
	usePreloadCubeMaterials();

	const [cubes, setCubes] = useState<CubeSnapshot[]>([]);
	const prevHashRef = useRef("");

	// Poll Koota entities and update React state when the set changes
	useFrame(() => {
		const entities = kootaWorld.query(allMaterialCubes);
		const snapshots: CubeSnapshot[] = [];

		// Clear and rebuild the entity store each frame
		entityStore.clear();

		for (const entity of entities) {
			const mc = entity.get(MaterialCube);
			if (!mc) continue;

			const key = entity as unknown as number;
			entityStore.set(key, entity);

			snapshots.push({
				entityKey: key,
				materialType: mc.material,
				isSelected: entity.has(IsSelected),
				isHeld: entity.has(HeldBy("*")),
			});
		}

		// Only trigger React re-render if the snapshot changed
		const hash = snapshots
			.map(
				(s) =>
					`${s.entityKey}:${s.materialType}:${s.isSelected ? 1 : 0}:${s.isHeld ? 1 : 0}`,
			)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setCubes(snapshots);
		}
	});

	// Clean up entity store and shared geometry on unmount
	useEffect(() => {
		return () => {
			entityStore.clear();
			if (sharedBoxGeometry) {
				sharedBoxGeometry.dispose();
				sharedBoxGeometry = null;
			}
			for (const mat of ghostMaterialCache.values()) {
				mat.dispose();
			}
			ghostMaterialCache.clear();
		};
	}, []);

	return (
		<>
			{cubes.map((cube) => (
				<CubeMesh
					key={cube.entityKey}
					entityKey={cube.entityKey}
					materialType={cube.materialType}
					isSelected={cube.isSelected}
					isHeld={cube.isHeld}
				/>
			))}
		</>
	);
}
