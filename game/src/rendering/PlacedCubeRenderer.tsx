/**
 * PlacedCubeRenderer — renders cubes placed on the grid via cubePlacement.
 *
 * Reads from cubePlacement.getOccupiedSlots() and getCubeAt() each frame.
 * Renders each placed cube at its grid world position using individual
 * meshes with PBR materials colored by ore type.
 *
 * Uses change-detection hashing to avoid unnecessary React re-renders.
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import {
	getCubeAt,
	getOccupiedSlots,
} from "../systems/cubePlacement";
import { GRID_SIZE, gridToWorld } from "../systems/gridSnap";
import { ORE_TYPE_CONFIGS } from "../systems/oreSpawner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CUBE_SIZE = GRID_SIZE; // 0.5m

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
		roughness: 0.6,
		metalness: 0.5,
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

interface PlacedCubeSnapshot {
	key: string;
	entityId: string;
	material: string;
	worldX: number;
	worldY: number;
	worldZ: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlacedCubeRenderer() {
	const [cubes, setCubes] = useState<PlacedCubeSnapshot[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const occupied = getOccupiedSlots();
		const snapshots: PlacedCubeSnapshot[] = [];

		for (const key of occupied) {
			const parts = key.split(",");
			const coord = {
				x: Number(parts[0]),
				y: Number(parts[1]),
				z: Number(parts[2]),
			};
			const cubeData = getCubeAt(coord);
			if (!cubeData) continue;

			const worldPos = gridToWorld(coord);
			snapshots.push({
				key,
				entityId: cubeData.entityId,
				material: cubeData.material,
				worldX: worldPos.x,
				worldY: worldPos.y + CUBE_SIZE * 0.5, // center cube above grid
				worldZ: worldPos.z,
			});
		}

		// Hash check for change detection
		const hash = snapshots.map((s) => `${s.key}:${s.material}`).join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setCubes(snapshots);
		}
	});

	const geometry = getBoxGeometry();

	return (
		<>
			{cubes.map((cube) => (
				<mesh
					key={cube.key}
					geometry={geometry}
					material={getMaterialForType(cube.material)}
					position={[cube.worldX, cube.worldY, cube.worldZ]}
					castShadow
					receiveShadow
					userData={{
						entityId: cube.entityId,
						entityType: "placedCube",
					}}
				/>
			))}
		</>
	);
}
