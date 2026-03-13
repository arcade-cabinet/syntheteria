/**
 * Building Renderer — renders player-placed & AI-faction building entities.
 *
 * Draws a simple geometric representation for each building entity in the
 * ECS `buildings` query (buildings with the Building + WorldPosition traits).
 * Each building gets a faction-colored emissive beacon ring at its base and
 * a simple box mesh colored by building type.
 *
 * This is separate from CityRenderer (which renders pre-placed world structures)
 * and ConstructionRenderer (which renders in-progress construction overlays).
 */

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { Building, Identity, WorldPosition } from "../ecs/traits";
import { buildings } from "../ecs/world";
import {
	getSectorCell,
} from "../world/structuralSpace";
import { worldToGrid } from "../world/sectorCoordinates";

const FACTION_BUILDING_COLORS: Record<string, number> = {
	player: 0x00cccc, // Cyan
	rogue: 0xffaa44, // Amber — Reclaimers
	cultist: 0xd987ff, // Purple — Signal Choir / Iron Creed
	feral: 0x44cc44, // Green — Volt Collective
};

const BUILDING_TYPE_COLORS: Record<string, number> = {
	lightning_rod: 0xf6c56a,
	fabrication_unit: 0x8be6ff,
	motor_pool: 0x6ff3c8,
	relay_tower: 0x88aaff,
	defense_turret: 0xff6f6f,
	power_sink: 0xf6c56a,
	storage_hub: 0xaaaacc,
	habitat_module: 0x77dd99,
};

const BEACON_Y = 0.02;
const REBUILD_INTERVAL = 30;

interface BuildingVisual {
	entityId: string;
	faction: string;
	buildingType: string;
	x: number;
	y: number;
	z: number;
	operational: boolean;
}

function isBuildingVisibleToPlayer(pos: { x: number; z: number }, faction: string): boolean {
	if (faction === "player") return true;
	const grid = worldToGrid(pos.x, pos.z);
	const cell = getSectorCell(grid.q, grid.r);
	if (!cell) return false;
	return cell.discovery_state >= 1;
}

function collectBuildingVisuals(): BuildingVisual[] {
	const visuals: BuildingVisual[] = [];
	for (const bldg of buildings) {
		const identity = bldg.get(Identity);
		const pos = bldg.get(WorldPosition);
		const building = bldg.get(Building);
		if (!identity || !pos || !building) continue;

		if (!isBuildingVisibleToPlayer(pos, identity.faction)) continue;

		visuals.push({
			entityId: identity.id,
			faction: identity.faction,
			buildingType: building.type,
			x: pos.x,
			y: pos.y,
			z: pos.z,
			operational: building.operational,
		});
	}
	return visuals;
}

function BuildingMesh({ visual }: { visual: BuildingVisual }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	const factionColor = FACTION_BUILDING_COLORS[visual.faction] ?? 0x8be6ff;
	const typeColor = BUILDING_TYPE_COLORS[visual.buildingType] ?? 0x667788;

	useFrame(({ clock }) => {
		if (ringRef.current) {
			const mat = ringRef.current.material as THREE.MeshBasicMaterial;
			mat.opacity = 0.3 + 0.1 * Math.sin(clock.elapsedTime * 2);
		}
	});

	return (
		<group position={[visual.x, visual.y, visual.z]}>
			{/* Building body */}
			<mesh ref={meshRef} position={[0, 0.6, 0]}>
				<boxGeometry args={[0.8, 1.2, 0.8]} />
				<meshStandardMaterial
					color={typeColor}
					emissive={visual.operational ? factionColor : 0x111111}
					emissiveIntensity={visual.operational ? 0.3 : 0.05}
					roughness={0.7}
					metalness={0.4}
				/>
			</mesh>

			{/* Faction beacon ring at base */}
			<mesh
				ref={ringRef}
				position={[0, BEACON_Y, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
			>
				<ringGeometry args={[0.5, 0.65, 24]} />
				<meshBasicMaterial
					color={factionColor}
					transparent
					opacity={0.35}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

/**
 * Renders faction-owned building entities with colored beacons.
 * Rebuilds the building list every 30 frames.
 */
export function BuildingRenderer() {
	const [visuals, setVisuals] = useState<BuildingVisual[]>(() =>
		collectBuildingVisuals(),
	);
	const frameCounter = useRef(0);

	useFrame(() => {
		frameCounter.current++;
		if (frameCounter.current >= REBUILD_INTERVAL) {
			frameCounter.current = 0;
			setVisuals(collectBuildingVisuals());
		}
	});

	if (visuals.length === 0) return null;

	return (
		<>
			{visuals.map((visual) => (
				<BuildingMesh
					key={visual.entityId}
					visual={visual}
				/>
			))}
		</>
	);
}
