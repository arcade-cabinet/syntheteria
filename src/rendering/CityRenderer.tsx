import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { getCityModelById } from "../city/catalog/cityCatalog";
import { CityModelMesh } from "../city/runtime/CityModelMesh";
import { getSnapshot, subscribe } from "../ecs/gameState";
import { Identity, Scene, Unit, WorldPosition } from "../ecs/traits";
import { world } from "../ecs/world";
import { isStructureConsumed } from "../systems/harvestSystem";
import {
	buildOverworldCityOverlayState,
	type OverlayUnitPresence,
} from "../world/overworldCityOverlay";
import { gridToWorld } from "../world/sectorCoordinates";
import { getActiveWorldSession } from "../world/session";
import type { WorldSessionSnapshot } from "../world/snapshots";

function edgeOffset(edge: string | null) {
	switch (edge) {
		case "north":
			return { x: 0, z: -1.02 };
		case "east":
			return { x: 1.02, z: 0 };
		case "south":
			return { x: 0, z: 1.02 };
		case "west":
			return { x: -1.02, z: 0 };
		default:
			return { x: 0, z: 0 };
	}
}

function SectorStructureInstances({
	profile,
	session: providedSession,
}: {
	profile: "default" | "overview" | "ops";
	session?: WorldSessionSnapshot | null;
}) {
	useSyncExternalStore(subscribe, getSnapshot);
	const session = providedSession ?? getActiveWorldSession();

	// Fog of war: build a set of discovered cell keys so structures only
	// render in areas the player has actually explored.
	const discoveredCells = useMemo(() => {
		if (!session) return new Set<string>();
		const set = new Set<string>();
		for (const cell of session.sectorCells) {
			if (cell.discovery_state >= 1) {
				set.add(`${cell.q},${cell.r}`);
			}
		}
		return set;
	}, [session?.sectorCells, session]);

	if (!session) {
		return null;
	}

	return (
		<>
			{session.sectorStructures.map((structure) => {
				// Only render structures in discovered cells
				if (!discoveredCells.has(`${structure.q},${structure.r}`)) {
					return null;
				}
				// Skip structures that have been harvested
				if (isStructureConsumed(structure.id)) {
					return null;
				}
				const model = getCityModelById(structure.model_id);
				if (!model) {
					return null;
				}
				const worldPosition = gridToWorld(structure.q, structure.r);
				const edge = edgeOffset(structure.edge);
				const yBase =
					structure.placement_layer === "roof"
						? 1.85
						: structure.placement_layer === "detail"
							? 0.4
							: structure.placement_layer === "prop"
								? 0.08
								: 0;
				return (
					<group
						key={`${structure.id}:${structure.model_id}`}
						position={[
							worldPosition.x + structure.offset_x + edge.x,
							yBase + structure.offset_y,
							worldPosition.z + structure.offset_z + edge.z,
						]}
						rotation={[0, (Math.PI / 2) * structure.rotation_quarter_turns, 0]}
					>
						<CityModelMesh model={model} targetSpan={structure.target_span} />
					</group>
				);
			})}
		</>
	);
}

function CityOverlayMarkers({
	profile,
	session: providedSession,
}: {
	profile: "default" | "overview" | "ops";
	session?: WorldSessionSnapshot | null;
}) {
	useSyncExternalStore(subscribe, getSnapshot);
	const session = providedSession ?? getActiveWorldSession();

	if (profile === "ops") {
		return null;
	}
	const units: OverlayUnitPresence[] = Array.from(
		world.query(Identity, Unit, WorldPosition),
	).map((entity) => ({
		entityId: entity.get(Identity)!.id,
		sceneLocation: entity.get(Scene)?.location ?? "world",
		position: { ...entity.get(WorldPosition)! },
		faction: entity.get(Identity)!.faction,
	}));
	const overlay = buildOverworldCityOverlayState({ session, units });
	const ringOpacity = 0.26;
	const substationOpacity = 0.26;
	const beaconScale = profile === "overview" ? 1 : 0.9;

	return (
		<>
			{overlay.fortifications.map((marker) => (
				<group
					key={marker.id}
					position={[marker.position.x, marker.position.y, marker.position.z]}
				>
					<mesh rotation={[-Math.PI / 2, 0, 0]}>
						<ringGeometry args={[marker.radius, marker.radius + 0.07, 24]} />
						<meshBasicMaterial
							color={0x6ff3c8}
							transparent
							opacity={ringOpacity}
							side={THREE.DoubleSide}
						/>
					</mesh>
					<mesh position={[0, marker.height, 0]}>
						<cylinderGeometry
							args={[
								marker.radius * 0.9,
								marker.radius * 0.96,
								0.08,
								18,
								1,
								true,
							]}
						/>
						<meshStandardMaterial
							color={0x20343a}
							emissive={0x6ff3c8}
							emissiveIntensity={0.18}
							roughness={0.85}
							metalness={0.12}
						/>
					</mesh>
				</group>
			))}
			{overlay.substations.map((marker) => (
				<group
					key={marker.id}
					position={[marker.position.x, marker.position.y, marker.position.z]}
					scale={[beaconScale, beaconScale, beaconScale]}
				>
					{Array.from({ length: marker.ringCount }).map((_, index) => {
						const inner = marker.radius + index * 0.16;
						const outer = inner + 0.05;
						return (
							<mesh
								key={`${marker.id}:ring:${index}`}
								rotation={[-Math.PI / 2, 0, 0]}
							>
								<ringGeometry args={[inner, outer, 28]} />
								<meshBasicMaterial
									color={marker.emissive}
									transparent
									opacity={substationOpacity - index * 0.04}
									side={THREE.DoubleSide}
								/>
							</mesh>
						);
					})}
					<mesh position={[0, marker.height / 2, 0]}>
						<cylinderGeometry args={[0.07, 0.12, marker.height, 14]} />
						<meshStandardMaterial
							color={marker.color}
							emissive={marker.emissive}
							emissiveIntensity={0.42}
							roughness={0.52}
							metalness={0.22}
						/>
					</mesh>
					<mesh position={[0, marker.height + 0.08, 0]}>
						<sphereGeometry args={[0.08, 14, 14]} />
						<meshStandardMaterial
							color={marker.emissive}
							emissive={marker.emissive}
							emissiveIntensity={0.65}
							roughness={0.2}
							metalness={0.1}
						/>
					</mesh>
				</group>
			))}
		</>
	);
}

export function CityRenderer({
	profile = "default",
	session,
}: {
	profile?: "default" | "overview" | "ops";
	session?: WorldSessionSnapshot | null;
}) {
	return (
		<>
			<SectorStructureInstances profile={profile} session={session} />
			<CityOverlayMarkers profile={profile} session={session} />
		</>
	);
}
