/**
 * Instanced Building Renderer — chunk-partitioned instanced rendering
 * for player-placed and AI-faction buildings.
 *
 * Instead of one global InstancedMesh with all buildings (which degrades
 * with world size), this renderer creates one InstancedMesh per loaded
 * chunk. When a chunk loads, a new buffer is allocated; when it unloads,
 * the buffer is disposed (freeing GPU memory).
 *
 * Total draw calls are bounded by loaded chunk count, not total structure
 * count. Buildings are partitioned into chunk buckets by their world
 * position using worldToChunk().
 *
 * @dependencies chunkInstanceBuffers (pure partitioning logic)
 * @dependencies chunkLoader (chunk lifecycle callbacks)
 * @dependencies ecs/traits, ecs/world (building entity queries)
 * @dependencies frustumCulling (camera-aware culling)
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Building, Identity, WorldPosition } from "../ecs/traits";
import { buildings } from "../ecs/world";
import { isAABBInFrustum, updateFrustum } from "../systems/frustumCulling";
import {
	chunkKey,
	getLoadedChunks,
	setChunkCallbacks,
} from "../world/chunkLoader";
import type { ChunkCoord } from "../world/chunks";
import { worldToGrid } from "../world/sectorCoordinates";
import { getSectorCell } from "../world/structuralSpace";
import {
	type BuildingData,
	ChunkBufferManager,
	type ChunkBuildingBuffer,
	MAX_INSTANCES_PER_CHUNK,
} from "./chunkInstanceBuffers";

const REBUILD_INTERVAL = 30; // frames between entity list refreshes

const FACTION_COLORS: Record<string, THREE.Color> = {
	player: new THREE.Color(0x00cccc),
	rogue: new THREE.Color(0xffaa44),
	cultist: new THREE.Color(0xd987ff),
	feral: new THREE.Color(0x44cc44),
};

const TYPE_COLORS: Record<string, THREE.Color> = {
	lightning_rod: new THREE.Color(0xf6c56a),
	fabrication_unit: new THREE.Color(0x8be6ff),
	motor_pool: new THREE.Color(0x6ff3c8),
	relay_tower: new THREE.Color(0x88aaff),
	defense_turret: new THREE.Color(0xff6f6f),
	power_sink: new THREE.Color(0xf6c56a),
	storage_hub: new THREE.Color(0xaaaacc),
	habitat_module: new THREE.Color(0x77dd99),
};

const DEFAULT_TYPE_COLOR = new THREE.Color(0x667788);
const DEFAULT_FACTION_COLOR = new THREE.Color(0x8be6ff);

function isBuildingVisible(
	pos: { x: number; z: number },
	faction: string,
): boolean {
	if (faction === "player") return true;
	const grid = worldToGrid(pos.x, pos.z);
	const cell = getSectorCell(grid.q, grid.r);
	if (!cell) return false;
	return cell.discovery_state >= 1;
}

function collectBuildings(): BuildingData[] {
	const result: BuildingData[] = [];
	for (const bldg of buildings) {
		const identity = bldg.get(Identity);
		const pos = bldg.get(WorldPosition);
		const building = bldg.get(Building);
		if (!identity || !pos || !building) continue;
		if (!isBuildingVisible(pos, identity.faction)) continue;

		result.push({
			x: pos.x,
			y: pos.y,
			z: pos.z,
			faction: identity.faction,
			buildingType: building.type,
			operational: building.operational,
		});
	}
	return result;
}

// ---------------------------------------------------------------------------
// Per-chunk instanced mesh for building bodies
// ---------------------------------------------------------------------------

function ChunkBuildingBodies({
	buffer,
	geometry,
	material,
}: {
	buffer: ChunkBuildingBuffer;
	geometry: THREE.BoxGeometry;
	material: THREE.MeshStandardMaterial;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		// Skip entire chunk if its AABB is outside the frustum
		const { bounds } = buffer;
		if (!isAABBInFrustum(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ)) {
			if (mesh.count > 0) {
				mesh.count = 0;
				mesh.instanceMatrix.needsUpdate = true;
			}
			return;
		}

		let count = 0;
		for (const b of buffer.buildings) {
			if (count >= MAX_INSTANCES_PER_CHUNK) break;

			dummyMatrix.makeTranslation(b.x, b.y + 0.6, b.z);
			mesh.setMatrixAt(count, dummyMatrix);

			const typeColor = TYPE_COLORS[b.buildingType] ?? DEFAULT_TYPE_COLOR;
			tempColor.copy(typeColor);
			mesh.setColorAt(count, tempColor);

			count++;
		}

		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) {
			mesh.instanceColor.needsUpdate = true;
		}
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, MAX_INSTANCES_PER_CHUNK]}
			frustumCulled={false}
			castShadow
			receiveShadow
		/>
	);
}

// ---------------------------------------------------------------------------
// Per-chunk instanced mesh for beacon rings
// ---------------------------------------------------------------------------

function ChunkBeaconRings({
	buffer,
	geometry,
	material,
}: {
	buffer: ChunkBuildingBuffer;
	geometry: THREE.RingGeometry;
	material: THREE.MeshBasicMaterial;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);
	const rotationMatrix = useMemo(() => {
		const m = new THREE.Matrix4();
		m.makeRotationX(-Math.PI / 2);
		return m;
	}, []);

	useFrame(({ clock }) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		// Skip entire chunk if its AABB is outside the frustum
		const { bounds } = buffer;
		if (!isAABBInFrustum(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ)) {
			if (mesh.count > 0) {
				mesh.count = 0;
				mesh.instanceMatrix.needsUpdate = true;
			}
			return;
		}

		const opacity = 0.3 + 0.1 * Math.sin(clock.elapsedTime * 2);
		(mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

		let count = 0;
		for (const b of buffer.buildings) {
			if (count >= MAX_INSTANCES_PER_CHUNK) break;

			dummyMatrix.makeTranslation(b.x, b.y + 0.02, b.z);
			dummyMatrix.multiply(rotationMatrix);
			mesh.setMatrixAt(count, dummyMatrix);

			const factionColor = FACTION_COLORS[b.faction] ?? DEFAULT_FACTION_COLOR;
			tempColor.copy(factionColor);
			mesh.setColorAt(count, tempColor);

			count++;
		}

		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) {
			mesh.instanceColor.needsUpdate = true;
		}
	});

	return (
		<instancedMesh
			ref={meshRef}
			args={[geometry, material, MAX_INSTANCES_PER_CHUNK]}
			frustumCulled={false}
		/>
	);
}

// ---------------------------------------------------------------------------
// Main chunk-partitioned renderer
// ---------------------------------------------------------------------------

/**
 * InstancedBuildingRenderer — chunk-partitioned instanced meshes.
 *
 * One InstancedMesh per loaded chunk per visual layer (bodies + rings).
 * Draw calls scale with loaded chunk count, not total building count.
 * GPU memory is reclaimed when chunks unload.
 */
export function InstancedBuildingRenderer() {
	const frameCounter = useRef(0);
	const { camera } = useThree();

	// Shared geometry + material (reused across all chunk meshes)
	const bodyGeo = useMemo(() => new THREE.BoxGeometry(0.8, 1.2, 0.8), []);
	const bodyMat = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				roughness: 0.7,
				metalness: 0.4,
			}),
		[],
	);
	const ringGeo = useMemo(() => new THREE.RingGeometry(0.5, 0.65, 24), []);
	const ringMat = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				transparent: true,
				opacity: 0.35,
				side: THREE.DoubleSide,
				depthWrite: false,
			}),
		[],
	);

	// Chunk buffer manager — stable across renders
	const managerRef = useRef<ChunkBufferManager | null>(null);
	if (!managerRef.current) {
		managerRef.current = new ChunkBufferManager();
	}
	const manager = managerRef.current;

	// Trigger re-renders when chunk set changes
	const [, setRevision] = useState(0);
	const bumpRevision = useCallback(() => setRevision((r) => r + 1), []);

	// Wire chunk callbacks on mount
	useEffect(() => {
		// Seed the manager with any already-loaded chunks
		for (const [, chunk] of getLoadedChunks()) {
			if (chunk.state === "ready" || chunk.state === "loading") {
				manager.handleChunkLoad({ chunkX: chunk.chunkX, chunkZ: chunk.chunkZ });
			}
		}

		manager.onBufferCreated = () => bumpRevision();
		manager.onBufferRemoved = () => bumpRevision();

		setChunkCallbacks(
			(coord: ChunkCoord) => {
				manager.handleChunkLoad(coord);
			},
			(coord: ChunkCoord) => {
				manager.handleChunkUnload(coord);
			},
		);

		return () => {
			setChunkCallbacks(null, null);
			manager.reset();
		};
	}, [manager, bumpRevision]);

	// Per-frame: update frustum + periodically refresh buildings
	useFrame(() => {
		updateFrustum(
			camera.position.x,
			camera.position.z,
			camera.position.y,
			(camera as THREE.PerspectiveCamera).fov ?? 45,
			(camera as THREE.PerspectiveCamera).aspect ?? 16 / 9,
		);

		frameCounter.current++;
		if (frameCounter.current >= REBUILD_INTERVAL) {
			frameCounter.current = 0;
			const allBuildings = collectBuildings();
			manager.updateBuildings(allBuildings);
		}
	});

	// Render one instanced mesh pair per loaded chunk
	const entries = Array.from(manager.getBuffers().entries());

	return (
		<>
			{entries.map(([key, buffer]) => (
				<group key={key}>
					<ChunkBuildingBodies
						buffer={buffer}
						geometry={bodyGeo}
						material={bodyMat}
					/>
					<ChunkBeaconRings
						buffer={buffer}
						geometry={ringGeo}
						material={ringMat}
					/>
				</group>
			))}
		</>
	);
}
