import { Canvas, useThree } from "@react-three/fiber";
import { WorldProvider } from "koota/react";
import { Suspense, useEffect, useState } from "react";
import { resetGameState } from "../../src/ecs/gameState";
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
import { createInitialCampaignEntities } from "../../src/world/startingForces";
import {
	loadStructuralFragment,
	resetStructuralSpace,
} from "../../src/world/structuralSpace";
import { AssetLoadBeacon } from "./AssetLoadBeacon";
import { getAnchorClusterFocus } from "./previewSceneFocus";

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
	const startingEntities = createInitialCampaignEntities(generated);

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
				: city.poiType === "coast_mines"
					? "founded"
					: city.poiType === "research_site"
						? "surveyed"
						: city.poiType === "deep_sea_gateway"
							? "surveyed"
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
			name: "Ecumenopolis Preview",
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
			current_tick: 120,
			last_synced_at: 0,
		},
		resourceState: {
			id: 1,
			save_game_id: 1,
			scrap_metal: 14,
			e_waste: 6,
			intact_components: 2,
			last_synced_at: 0,
		},
		entities: toWorldEntitySnapshots(1, startingEntities),
	};
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

export function EcumenopolisWorldPreview({
	view,
}: {
	view:
		| "overview"
		| "anchor-cluster"
		| "starting-sector"
		| "player-substation"
		| "rival-cluster"
		| "cult-cluster";
}) {
	const [ready, setReady] = useState(false);
	const [sceneLoaded, setSceneLoaded] = useState(false);
	const [session, setSession] = useState<PreviewWorldSession | null>(null);
	const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([
		0, 0, 0,
	]);
	const [cameraPosition, setCameraPosition] = useState<
		[number, number, number]
	>([0, 18, 18]);

	useEffect(() => {
		setReady(false);
		setSceneLoaded(false);
		resetGameState();
		resetRuntimeState();
		resetStructuralSpace();
		resetNetworkOverlay();
		clearActiveWorldSession();
		for (const entity of [...world.entities]) {
			entity.destroy();
		}

		const session = createPreviewSession(view === "overview" ? 31415 : 42424);
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
		setRuntimeTick(120);

		const homeBase = session.pointsOfInterest.find(
			(poi) => poi.type === "home_base",
		)!;
		const archiveCampus =
			session.pointsOfInterest.find((poi) => poi.type === "research_site") ??
			homeBase;
		const homeBaseWorld = gridToWorld(homeBase.q, homeBase.r);
		const archiveWorld = gridToWorld(archiveCampus.q, archiveCampus.r);
		const cultWard =
			session.pointsOfInterest.find(
				(poi) => poi.type === "northern_cult_site",
			) ?? homeBase;
		const homeFocus = getAnchorClusterFocus(session, homeBase.q, homeBase.r);
		const archiveFocus = getAnchorClusterFocus(
			session,
			archiveCampus.q,
			archiveCampus.r,
		);
		const cultFocus = getAnchorClusterFocus(session, cultWard.q, cultWard.r);
		setCameraTarget(
			view === "overview"
				? [
						(homeBaseWorld.x + archiveWorld.x) / 2,
						0.2,
						(homeBaseWorld.z + archiveWorld.z) / 2,
					]
				: view === "anchor-cluster"
					? homeFocus.target
					: view === "rival-cluster"
						? archiveFocus.target
						: view === "cult-cluster"
							? cultFocus.target
							: homeFocus.target,
		);
		setCameraPosition(
			view === "overview"
				? [
						(homeBaseWorld.x + archiveWorld.x) / 2,
						18,
						(homeBaseWorld.z + archiveWorld.z) / 2 + 22,
					]
				: view === "anchor-cluster"
					? homeFocus.position
					: view === "rival-cluster"
						? archiveFocus.position
						: view === "cult-cluster"
							? cultFocus.position
							: homeFocus.position,
		);

		hydratePersistedWorldEntities(session.entities);

		networkOverlaySystem(120);

		setNearbyPoi({
			cityInstanceId:
				session.cityInstances.find((city) => city.poi_id === archiveCampus.id)
					?.id ?? null,
			discovered: true,
			distance: 1.4,
			name: archiveCampus.name,
			poiId: archiveCampus.id,
			poiType: archiveCampus.type,
		});
		setReady(true);

		return () => {
			clearActiveWorldSession();
			resetRuntimeState();
			resetStructuralSpace();
			resetNetworkOverlay();
			resetGameState();
			setSession(null);
		};
	}, [view]);

	return (
		<div
			style={{
				width: 1400,
				height: 900,
				position: "relative",
				background:
					"linear-gradient(180deg, #10202c 0%, #07111a 55%, #03070d 100%)",
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
							fov:
								view === "overview" ? 30 : view === "anchor-cluster" ? 34 : 38,
						}}
					>
						<color attach="background" args={["#03070d"]} />
						<PreviewCameraRig target={cameraTarget} />
						<AssetLoadBeacon onLoaded={() => setSceneLoaded(true)} />
						<ambientLight intensity={1.05} color={0x7c8ea8} />
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
						<StructuralFloorRenderer
							profile={view === "overview" ? "overview" : "default"}
							session={session}
						/>
						<NetworkLineRenderer />
						<Suspense fallback={null}>
							<CityRenderer
								profile={view === "overview" ? "overview" : "default"}
								session={session}
							/>
						</Suspense>
						<Suspense fallback={null}>
							<UnitRenderer />
						</Suspense>
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
					{session ? (
						<div
							style={{
								position: "absolute",
								right: 20,
								top: 20,
								width: 360,
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
								Ecumenopolis Validation
							</div>
							<div style={{ marginTop: 10, fontSize: 13, color: "#ffffff" }}>
								{view === "overview"
									? "Generated Campaign Overview"
									: view === "anchor-cluster"
										? "Command Arcology Anchor Cluster"
										: view === "player-substation"
											? "Player Substation Cluster"
											: view === "rival-cluster"
												? "Rival Research Cluster"
												: view === "cult-cluster"
													? "Cult Incursion Cluster"
													: "Starting Sector Inspection"}
							</div>
							<div
								style={{
									marginTop: 6,
									fontSize: 12,
									color: "rgba(216,246,255,0.72)",
								}}
							>
								Seed {session.config.worldSeed} · Sector scale{" "}
								{session.config.sectorScale}
							</div>
							<div
								style={{
									marginTop: 14,
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 8,
									fontSize: 12,
								}}
							>
								<div>Cells: {session.sectorCells.length}</div>
								<div>POIs: {session.pointsOfInterest.length}</div>
								<div>
									Founded:{" "}
									{
										session.cityInstances.filter(
											(city) => city.state === "founded",
										).length
									}
								</div>
								<div>
									Surveyed:{" "}
									{
										session.cityInstances.filter(
											(city) => city.state === "surveyed",
										).length
									}
								</div>
							</div>
							<div
								style={{
									marginTop: 14,
									fontSize: 11,
									letterSpacing: "0.18em",
									textTransform: "uppercase",
									color: "#6ff3c8",
								}}
							>
								Visible Anchors
							</div>
							<div
								style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}
							>
								{session.pointsOfInterest.map((poi) => {
									const city = session.cityInstances.find(
										(candidate) => candidate.poi_id === poi.id,
									);
									return (
										<div
											key={poi.id}
											style={{
												display: "flex",
												justifyContent: "space-between",
												gap: 12,
												color:
													poi.type === "northern_cult_site"
														? "#ff9cb5"
														: poi.type === "deep_sea_gateway"
															? "#9ecbff"
															: "#d8f6ff",
											}}
										>
											<span>{poi.name}</span>
											<span style={{ color: "rgba(216,246,255,0.68)" }}>
												{city?.state ?? "latent"}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}
