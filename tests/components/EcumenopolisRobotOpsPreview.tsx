import { Canvas, useThree } from "@react-three/fiber";
import { WorldProvider } from "koota/react";
import { Suspense, useEffect, useState } from "react";
import { aiSystem, issueMoveCommand, resetWorldAIService } from "../../src/ai";
import { resetGameState } from "../../src/ecs/gameState";
import { Identity, Unit, WorldPosition } from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { CityRenderer } from "../../src/rendering/CityRenderer";
import { NetworkLineRenderer } from "../../src/rendering/NetworkLineRenderer";
import { StructuralFloorRenderer } from "../../src/rendering/StructuralFloorRenderer";
import { UnitRenderer } from "../../src/rendering/UnitRenderer";
import {
	networkOverlaySystem,
	resetNetworkOverlay,
} from "../../src/systems/networkOverlay";
import { BriefingBubbleLayer } from "../../src/ui/BriefingBubbleLayer";
import { createNewGameConfig } from "../../src/world/config";
import {
	hydratePersistedWorldEntities,
	toWorldEntitySnapshots,
} from "../../src/world/entityPersistence";
import { generateWorldData } from "../../src/world/generation";
import {
	resetRuntimeState,
	setNearbyPoi,
	setRuntimeScene,
	setRuntimeTick,
} from "../../src/world/runtimeState";
import { gridToWorld } from "../../src/world/sectorCoordinates";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";
import type {
	WorldEntitySnapshot,
	WorldSessionSnapshot,
} from "../../src/world/snapshots";
import { createStartingRoster } from "../../src/bots/startingRoster";
import {
	loadStructuralFragment,
	resetStructuralSpace,
} from "../../src/world/structuralSpace";
import { AssetLoadBeacon } from "./AssetLoadBeacon";
import { getAnchorClusterFocus } from "./previewSceneFocus";

interface RosterMarker {
	id: string;
	unitType: string;
	position: readonly [number, number, number];
	color: number;
}

function PreviewCameraRig({
	target,
}: {
	target: readonly [number, number, number];
}) {
	const { camera } = useThree();

	useEffect(() => {
		camera.lookAt(target[0], target[1], target[2]);
		camera.updateProjectionMatrix();
	}, [camera, target]);

	return null;
}

type PreviewWorldSession = WorldSessionSnapshot & {
	entities: WorldEntitySnapshot[];
};

function createPreviewSession(seed: number): PreviewWorldSession {
	const config = createNewGameConfig(seed, {
		sectorScale: "standard",
		climateProfile: "temperate",
		stormProfile: "volatile",
	});
	const generated = generateWorldData(config);
	const startingEntities = createStartingRoster({
		spawnQ: Math.floor(generated.ecumenopolis.width / 2),
		spawnR: Math.floor(generated.ecumenopolis.height / 2),
	});
	const pointsOfInterest = generated.pointsOfInterest.map((poi, index) => ({
		id: index + 1,
		ecumenopolis_id: 1,
		type: poi.type,
		name: poi.name,
		q: poi.q,
		r: poi.r,
		discovered: 1,
	}));
	const cityInstances = generated.cityInstances.map((city, index) => {
		const poi = pointsOfInterest[index];
		const state =
			city.poiType === "home_base"
				? "founded"
				: city.poiType === "research_site"
					? "surveyed"
					: city.poiType === "coast_mines"
						? "founded"
						: city.state;
		return {
			id: index + 1,
			ecumenopolis_id: 1,
			poi_id: poi?.id ?? null,
			name: city.name,
			world_q: city.worldQ,
			world_r: city.worldR,
			layout_seed: city.layoutSeed,
			generation_status:
				state === "latent" ? city.generationStatus : "instanced",
			state,
		};
	});

	return {
		saveGame: {
			id: 1,
			name: "Robot Ops Preview",
			world_seed: seed,
			sector_scale: config.sectorScale,
			difficulty: config.difficulty,
			climate_profile: config.climateProfile,
			storm_profile: config.stormProfile,
			created_at: 0,
			last_played_at: 0,
			playtime_seconds: 0,
		},
		config,
		ecumenopolis: {
			id: 1,
			save_game_id: 1,
			width: generated.ecumenopolis.width,
			height: generated.ecumenopolis.height,
			sector_scale: config.sectorScale,
			climate_profile: config.climateProfile,
			storm_profile: config.stormProfile,
			spawn_sector_id: generated.ecumenopolis.spawnSectorId,
			spawn_anchor_key: generated.ecumenopolis.spawnAnchorKey,
			generated_at: 0,
		},
		sectorCells: generated.sectorCells.map((cell, index) => ({
			id: index + 1,
			ecumenopolis_id: 1,
			q: cell.q,
			r: cell.r,
			structural_zone: cell.structuralZone,
			floor_preset_id: cell.floorPresetId,
			discovery_state: cell.discoveryState,
			passable: cell.passable ? 1 : 0,
			sector_archetype: cell.sectorArchetype,
			storm_exposure: cell.stormExposure,
			impassable_class: cell.impassableClass,
			anchor_key: cell.anchorKey,
		})),
		sectorStructures: generated.sectorStructures.map((structure, index) => ({
			id: index + 1,
			ecumenopolis_id: 1,
			district_structure_id: structure.districtStructureId,
			anchor_key: structure.anchorKey,
			q: structure.q,
			r: structure.r,
			model_id: structure.modelId,
			placement_layer: structure.placementLayer,
			edge: structure.edge,
			rotation_quarter_turns: structure.rotationQuarterTurns,
			offset_x: structure.offsetX,
			offset_y: structure.offsetY,
			offset_z: structure.offsetZ,
			target_span: structure.targetSpan,
			sector_archetype: structure.sectorArchetype,
			source: structure.source,
			controller_faction: structure.controllerFaction,
		})),
		pointsOfInterest,
		cityInstances,
		campaignState: {
			id: 1,
			save_game_id: 1,
			active_scene: "world",
			active_city_instance_id: null,
			current_tick: 0,
			last_synced_at: 0,
		},
		resourceState: {
			id: 1,
			save_game_id: 1,
			scrap_metal: 18,
			e_waste: 9,
			intact_components: 3,
			last_synced_at: 0,
		},
		entities: toWorldEntitySnapshots(1, startingEntities),
	};
}

export function EcumenopolisRobotOpsPreview({
	mode,
}: {
	mode: "placement" | "movement";
}) {
	const [session, setSession] = useState<PreviewWorldSession | null>(null);
	const [ready, setReady] = useState(false);
	const [sceneLoaded, setSceneLoaded] = useState(false);
	const [legend, setLegend] = useState<string[]>([]);
	const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([
		0, 0, 0,
	]);
	const [cameraPosition, setCameraPosition] = useState<
		[number, number, number]
	>([0.6, 10.8, 15.6]);
	const [rosterMarkers, setRosterMarkers] = useState<RosterMarker[]>([]);

	useEffect(() => {
		setReady(false);
		setSceneLoaded(false);
		resetGameState();
		resetRuntimeState();
		resetStructuralSpace();
		resetNetworkOverlay();
		resetWorldAIService();
		clearActiveWorldSession();
		for (const entity of [...world.entities]) {
			entity.destroy();
		}

		const session = createPreviewSession(mode === "placement" ? 51515 : 62626);
		setSession(session);
		setActiveWorldSession(session);
		loadStructuralFragment(
			session.sectorCells.map((cell) => ({
				q: cell.q,
				r: cell.r,
				structuralZone: cell.structural_zone,
				floorPresetId: cell.floor_preset_id,
				discoveryState: cell.discovery_state as 0 | 1 | 2,
				passable: Boolean(cell.passable),
			})),
			session.ecumenopolis,
			"world_primary",
		);
		setRuntimeScene("world", null);
		setRuntimeTick(0);

		const homeBase = session.pointsOfInterest.find(
			(poi) => poi.type === "home_base",
		)!;
		const archiveCampus =
			session.pointsOfInterest.find((poi) => poi.type === "research_site") ??
			homeBase;
		const home = gridToWorld(homeBase.q, homeBase.r);

		hydratePersistedWorldEntities(
			session.entities.filter(
				(entity) =>
					entity.faction === "player" && entity.scene_location === "world",
			),
		);

		const roster = Array.from(world.query(Identity, Unit, WorldPosition)).map(
			(entity) => {
				const unit = entity.get(Unit)!;
				const position = entity.get(WorldPosition)!;
				return {
					id: entity.get(Identity)!.id,
					unitType: unit.type,
					position: [position.x, position.y, position.z] as const,
					selected: unit.selected,
				};
			},
		);
		setRosterMarkers(
			roster.map((member, index) => ({
				id: member.id,
				unitType: member.unitType,
				position: [
					member.position[0],
					member.position[1],
					member.position[2],
				] as const,
				color: member.selected
					? 0xffd166
					: member.unitType === "utility_drone"
						? 0x8be6ff
						: member.unitType === "fabrication_unit"
							? 0xf6c56a
							: member.unitType === "mecha_golem"
								? 0x6ff3c8
								: 0xff8f8f,
			})),
		);

		setNearbyPoi({
			cityInstanceId:
				session.cityInstances.find((city) => city.poi_id === archiveCampus.id)
					?.id ?? null,
			discovered: true,
			distance: mode === "movement" ? 3.6 : 2.1,
			name: archiveCampus.name,
			poiId: archiveCampus.id,
			poiType: archiveCampus.type,
		});

		if (mode === "movement") {
			issueMoveCommand("tech", { x: home.x + 2.8, y: 0, z: home.z - 1.6 });
			for (let tick = 1; tick <= 45; tick++) {
				aiSystem(1 / 30, tick);
				setRuntimeTick(tick);
			}
		}

		const homeFocus = getAnchorClusterFocus(session, homeBase.q, homeBase.r);
		setCameraTarget(homeFocus.target);
		setCameraPosition(
			mode === "placement"
				? homeFocus.position
				: [
						homeFocus.position[0] - 1.6,
						Math.max(5.8, homeFocus.position[1] - 0.8),
						homeFocus.position[2] - 1.4,
					],
		);

		networkOverlaySystem(mode === "movement" ? 45 : 0);

		setLegend(
			mode === "placement"
				? [
						"Placement audit",
						"Five starting chassis staged at the Command Arcology",
						"Selected unit bubble should remain readable without obscuring the playfield",
					]
				: [
						"Movement audit",
						"Field Technician issued AI-owned move command toward Archive Campus",
						"Selected unit should remain legible while in transit",
					],
		);
		setReady(true);

		return () => {
			clearActiveWorldSession();
			resetRuntimeState();
			resetStructuralSpace();
			resetNetworkOverlay();
			resetWorldAIService();
			resetGameState();
			setRosterMarkers([]);
			setSession(null);
		};
	}, [mode]);

	return (
		<div
			style={{
				width: 1400,
				height: 900,
				position: "relative",
				background:
					"linear-gradient(180deg, #0f1d29 0%, #061019 58%, #03070d 100%)",
				overflow: "hidden",
			}}
		>
			{ready ? (
				<>
					<WorldProvider world={world}>
					<Canvas
						style={{ position: "absolute", inset: 0 }}
						camera={{
							position: [...cameraPosition],
							fov: mode === "placement" ? 34 : 38,
						}}
					>
						<color attach="background" args={["#03070d"]} />
						<PreviewCameraRig target={cameraTarget} />
						<AssetLoadBeacon onLoaded={() => setSceneLoaded(true)} />
						<ambientLight intensity={1.0} color={0x8394aa} />
						<hemisphereLight args={[0x7fb9ff, 0x071119, 0.9]} />
						<directionalLight
							position={[8, 16, 10]}
							intensity={1.7}
							color={0x8be6ff}
						/>
						<directionalLight
							position={[-8, 10, -6]}
							intensity={0.85}
							color={0xf6c56a}
						/>
						<StructuralFloorRenderer profile="ops" session={session} />
						<NetworkLineRenderer />
						<Suspense fallback={null}>
							<CityRenderer profile="ops" session={session} />
						</Suspense>
						<Suspense fallback={null}>
							<UnitRenderer />
						</Suspense>
						{mode === "placement"
							? rosterMarkers.map((marker) => (
									<group
										key={marker.id}
										position={[
											marker.position[0],
											marker.position[1] + 0.1,
											marker.position[2],
										]}
									>
										<mesh position={[0, 1.15, 0]}>
											<cylinderGeometry args={[0.04, 0.04, 2.3, 10]} />
											<meshBasicMaterial
												color={marker.color}
												transparent
												opacity={0.4}
											/>
										</mesh>
										<mesh position={[0, 2.35, 0]}>
											<sphereGeometry args={[0.1, 12, 12]} />
											<meshBasicMaterial
												color={marker.color}
												transparent
												opacity={0.95}
											/>
										</mesh>
									</group>
								))
							: null}
					</Canvas>
					</WorldProvider>
					<BriefingBubbleLayer />
					<div
						style={{
							position: "absolute",
							left: 20,
							bottom: 20,
							padding: "8px 12px",
							borderRadius: 12,
							border: "1px solid rgba(139,230,255,0.18)",
							background: "rgba(3,7,13,0.72)",
							color: sceneLoaded ? "#6ff3c8" : "rgba(216,246,255,0.72)",
							fontSize: 11,
							fontFamily:
								"ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
							letterSpacing: "0.16em",
							textTransform: "uppercase",
						}}
					>
						{sceneLoaded ? "Scene Loaded" : "Scene Loading"}
					</div>
					<div
						style={{
							position: "absolute",
							right: 20,
							bottom: 20,
							width: 380,
							padding: 16,
							borderRadius: 18,
							border: "1px solid rgba(139, 230, 255, 0.22)",
							background:
								"linear-gradient(180deg, rgba(7,17,26,0.88) 0%, rgba(3,7,13,0.92) 100%)",
							boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
							color: "#d8f6ff",
							fontFamily:
								"ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
							pointerEvents: "none",
						}}
					>
						<div
							style={{
								fontSize: 11,
								letterSpacing: "0.22em",
								textTransform: "uppercase",
								color: "#8be6ff",
							}}
						>
							Robot Ops Validation
						</div>
						<div style={{ marginTop: 10, fontSize: 13, color: "#ffffff" }}>
							{legend[0]}
						</div>
						<div
							style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}
						>
							{legend.slice(1).map((line) => (
								<div key={line} style={{ color: "rgba(216,246,255,0.72)" }}>
									{line}
								</div>
							))}
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
