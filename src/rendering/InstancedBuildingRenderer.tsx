/**
 * Instanced Building Renderer — high-performance instanced rendering
 * for player-placed and AI-faction buildings.
 *
 * Instead of creating individual React components per building (N draw calls),
 * this renderer groups buildings by type and uses THREE.InstancedMesh to batch
 * all buildings of the same type into a single draw call.
 *
 * This replaces the original BuildingRenderer approach for the building bodies.
 * Beacon rings are rendered with a separate shared instanced mesh.
 *
 * Supports up to MAX_BUILDINGS_PER_TYPE instances per building type.
 * Includes frustum culling to skip offscreen buildings entirely.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Building, Identity, WorldPosition } from "../ecs/traits";
import { buildings } from "../ecs/world";
import { isInFrustum, updateFrustum } from "../systems/frustumCulling";
import { getSectorCell } from "../world/structuralSpace";
import { worldToGrid } from "../world/sectorCoordinates";

const MAX_BUILDINGS_PER_TYPE = 256;
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

interface BuildingData {
	x: number;
	y: number;
	z: number;
	faction: string;
	buildingType: string;
	operational: boolean;
}

function isBuildingVisible(pos: { x: number; z: number }, faction: string): boolean {
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

/**
 * Instanced mesh for building bodies — one box geometry shared
 * across all building types, colored per-instance.
 */
function BuildingBodies({ data }: { data: BuildingData[] }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);
	const tempScale = useMemo(() => new THREE.Vector3(), []);

	const { geometry, material } = useMemo(() => {
		const geo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
		const mat = new THREE.MeshStandardMaterial({
			roughness: 0.7,
			metalness: 0.4,
		});
		return { geometry: geo, material: mat };
	}, []);

	useFrame(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		let count = 0;
		for (let i = 0; i < data.length && count < MAX_BUILDINGS_PER_TYPE; i++) {
			const b = data[i];

			// Frustum cull
			if (!isInFrustum(b.x, b.z)) continue;

			// Position body 0.6 units above ground
			dummyMatrix.makeTranslation(b.x, b.y + 0.6, b.z);
			mesh.setMatrixAt(count, dummyMatrix);

			// Color by type
			const typeColor = TYPE_COLORS[b.buildingType] ?? DEFAULT_TYPE_COLOR;
			tempColor.copy(typeColor);
			mesh.setColorAt(count, tempColor);

			count++;
		}

		// Hide unused instances
		for (let i = count; i < mesh.count; i++) {
			dummyMatrix.makeScale(0, 0, 0);
			mesh.setMatrixAt(i, dummyMatrix);
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
			args={[geometry, material, MAX_BUILDINGS_PER_TYPE]}
			frustumCulled={false}
			castShadow
			receiveShadow
		/>
	);
}

/**
 * Instanced mesh for beacon rings — flat ring at each building base,
 * colored by faction ownership.
 */
function BeaconRings({ data }: { data: BuildingData[] }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
	const tempColor = useMemo(() => new THREE.Color(), []);
	const rotationMatrix = useMemo(() => {
		const m = new THREE.Matrix4();
		m.makeRotationX(-Math.PI / 2);
		return m;
	}, []);

	const { geometry, material } = useMemo(() => {
		const geo = new THREE.RingGeometry(0.5, 0.65, 24);
		const mat = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.35,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		return { geometry: geo, material: mat };
	}, []);

	useFrame(({ clock }) => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const opacity = 0.3 + 0.1 * Math.sin(clock.elapsedTime * 2);
		(mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

		let count = 0;
		for (let i = 0; i < data.length && count < MAX_BUILDINGS_PER_TYPE; i++) {
			const b = data[i];

			if (!isInFrustum(b.x, b.z)) continue;

			// Position ring at base, rotated to lie flat
			dummyMatrix.makeTranslation(b.x, b.y + 0.02, b.z);
			dummyMatrix.multiply(rotationMatrix);
			mesh.setMatrixAt(count, dummyMatrix);

			// Color by faction
			const factionColor = FACTION_COLORS[b.faction] ?? DEFAULT_FACTION_COLOR;
			tempColor.copy(factionColor);
			mesh.setColorAt(count, tempColor);

			count++;
		}

		for (let i = count; i < mesh.count; i++) {
			dummyMatrix.makeScale(0, 0, 0);
			mesh.setMatrixAt(i, dummyMatrix);
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
			args={[geometry, material, MAX_BUILDINGS_PER_TYPE]}
			frustumCulled={false}
		/>
	);
}

/**
 * InstancedBuildingRenderer — replaces BuildingRenderer with instanced
 * meshes for much better performance at high building counts.
 *
 * Renders building bodies as colored boxes and beacon rings as faction-colored
 * rings. Updates the frustum each frame for camera-aware culling.
 */
export function InstancedBuildingRenderer() {
	const frameCounter = useRef(0);
	const dataRef = useRef<BuildingData[]>(collectBuildings());
	const { camera } = useThree();

	useFrame(() => {
		// Update frustum bounds from camera position
		updateFrustum(
			camera.position.x,
			camera.position.z,
			camera.position.y,
			(camera as THREE.PerspectiveCamera).fov ?? 45,
			(camera as THREE.PerspectiveCamera).aspect ?? 16 / 9,
		);

		// Refresh building list periodically
		frameCounter.current++;
		if (frameCounter.current >= REBUILD_INTERVAL) {
			frameCounter.current = 0;
			dataRef.current = collectBuildings();
		}
	});

	return (
		<>
			<BuildingBodies data={dataRef.current} />
			<BeaconRings data={dataRef.current} />
		</>
	);
}
