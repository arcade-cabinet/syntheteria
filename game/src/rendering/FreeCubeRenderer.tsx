/**
 * FreeCubeRenderer — renders cubes from the grabber registry.
 *
 * These are physical material cubes that exist in the world but are NOT
 * placed on the grid (those are handled by PlacedCubeRenderer). Includes:
 *   - Cubes ejected from compression (on the ground, "Grabbable" trait)
 *   - The currently held cube (rendered in front of camera, "HeldBy" trait)
 *   - Cubes output from furnace smelting
 *
 * Reads from grabber.getAllCubes() each frame and renders each cube as a
 * 0.5m box with PBR material colored by ore type.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { getAllCubes, getHeldCube } from "../systems/grabber";
import { ORE_TYPE_CONFIGS } from "../systems/oreSpawner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CUBE_SIZE = 0.5;
const HELD_FORWARD = 1.2;
const HELD_DOWN = 0.3;

// ---------------------------------------------------------------------------
// Material cache
// ---------------------------------------------------------------------------

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

function getMaterialForType(materialType: string): THREE.MeshStandardMaterial {
	const cached = materialCache.get(materialType);
	if (cached) return cached;

	const config = ORE_TYPE_CONFIGS[materialType];
	const color = config?.color ?? "#808080";

	const mat = new THREE.MeshStandardMaterial({
		color,
		roughness: 0.5,
		metalness: 0.6,
	});

	materialCache.set(materialType, mat);
	return mat;
}

// ---------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------

let sharedGeometry: THREE.BoxGeometry | null = null;

function getBoxGeometry(): THREE.BoxGeometry {
	if (!sharedGeometry) {
		sharedGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
	}
	return sharedGeometry;
}

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

interface CubeSnapshot {
	id: string;
	material: string;
	x: number;
	y: number;
	z: number;
	isHeld: boolean;
}

// ---------------------------------------------------------------------------
// Temp vectors for held cube positioning
// ---------------------------------------------------------------------------

const _camPos = new THREE.Vector3();
const _camDir = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FreeCubeRenderer() {
	const [cubes, setCubes] = useState<CubeSnapshot[]>([]);
	const prevHashRef = useRef("");
	const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
	const { camera } = useThree();

	useFrame(() => {
		const registry = getAllCubes();
		const heldId = getHeldCube();
		const snapshots: CubeSnapshot[] = [];

		for (const [id, cube] of registry) {
			snapshots.push({
				id,
				material: cube.material,
				x: cube.position.x,
				y: cube.position.y,
				z: cube.position.z,
				isHeld: id === heldId,
			});
		}

		// Hash check for change detection (React reconciliation)
		const hash = snapshots
			.map((s) => `${s.id}:${s.material}:${s.isHeld ? 1 : 0}`)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setCubes(snapshots);
		}

		// Imperatively update positions each frame for performance
		camera.getWorldPosition(_camPos);
		camera.getWorldDirection(_camDir);

		for (const snap of snapshots) {
			const mesh = meshRefs.current.get(snap.id);
			if (!mesh) continue;

			if (snap.isHeld) {
				// Render in front of camera
				mesh.position.set(
					_camPos.x + _camDir.x * HELD_FORWARD,
					_camPos.y - HELD_DOWN,
					_camPos.z + _camDir.z * HELD_FORWARD,
				);
			} else {
				mesh.position.set(snap.x, snap.y, snap.z);
			}
		}
	});

	const geometry = getBoxGeometry();

	return (
		<>
			{cubes.map((cube) => (
				<mesh
					key={cube.id}
					ref={(ref) => {
						if (ref) {
							meshRefs.current.set(cube.id, ref);
						} else {
							meshRefs.current.delete(cube.id);
						}
					}}
					geometry={geometry}
					material={getMaterialForType(cube.material)}
					position={[cube.x, cube.y, cube.z]}
					castShadow
					receiveShadow
					userData={{
						entityId: cube.id,
						entityType: "materialCube",
					}}
				/>
			))}
		</>
	);
}
