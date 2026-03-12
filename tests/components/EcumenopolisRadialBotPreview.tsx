import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AssetLoadBeacon } from "./AssetLoadBeacon";
import { getAnchorClusterFocus } from "./previewSceneFocus";
import {
	type BotUnitType,
	createBotUnitState,
	getBotCommandProfile,
} from "../../src/bots";
import { resetGameState } from "../../src/ecs/gameState";
import {
	Building,
	Identity,
	MapFragment,
	Unit,
	WorldPosition,
} from "../../src/ecs/traits";
import { world } from "../../src/ecs/world";
import { CityRenderer } from "../../src/rendering/CityRenderer";
import { StructuralFloorRenderer } from "../../src/rendering/StructuralFloorRenderer";
import {
	getRadialGeometry,
	getRadialMenuState,
	getResolvedActionsForCategory,
	openRadialMenu,
	resetRadialMenu,
	updateRadialHover,
} from "../../src/systems/radialMenu";
import "../../src/systems/radialProviders";
import { UnitRenderer } from "../../src/rendering/UnitRenderer";
import { setResources } from "../../src/systems/resources";
import { BriefingBubbleLayer } from "../../src/ui/BriefingBubbleLayer";
import { RadialMenu } from "../../src/ui/RadialMenu";
import { createNewGameConfig } from "../../src/world/config";
import { generateWorldData } from "../../src/world/generation";
import {
	resetRuntimeState,
	setNearbyPoi,
	setRuntimeScene,
} from "../../src/world/runtimeState";
import { gridToWorld } from "../../src/world/sectorCoordinates";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";
import type { WorldSessionSnapshot } from "../../src/world/snapshots";
import {
	loadStructuralFragment,
	resetStructuralSpace,
} from "../../src/world/structuralSpace";

function createPreviewSession(seed: number): WorldSessionSnapshot {
	const config = createNewGameConfig(seed, {
		sectorScale: "standard",
		climateProfile: "temperate",
		stormProfile: "volatile",
	});
	const generated = generateWorldData(config);
	const pointsOfInterest = generated.pointsOfInterest.map((poi, index) => ({
		id: index + 1,
		ecumenopolis_id: 1,
		type: poi.type,
		name: poi.name,
		q: poi.q,
		r: poi.r,
		discovered: 1,
	}));
	const cityInstances = generated.cityInstances.map((city, index) => ({
		id: index + 1,
		ecumenopolis_id: 1,
		poi_id: pointsOfInterest[index]?.id ?? null,
		name: city.name,
		world_q: city.worldQ,
		world_r: city.worldR,
		layout_seed: city.layoutSeed,
		generation_status: "instanced" as const,
		state: (city.poiType === "home_base" ? "founded" : "surveyed") as
			| "founded"
			| "surveyed",
	}));

	return {
		saveGame: {
			id: 1,
			name: "Radial Bot Preview",
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
			scrap_metal: 30,
			e_waste: 20,
			intact_components: 8,
			last_synced_at: 0,
		},
	};
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
	const radians = (angleDeg * Math.PI) / 180;
	return {
		x: cx + Math.cos(radians) * radius,
		y: cy + Math.sin(radians) * radius,
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

export function EcumenopolisRadialBotPreview({
	unitType,
}: {
	unitType: BotUnitType;
}) {
	const [session, setSession] = useState<WorldSessionSnapshot | null>(null);
	const [ready, setReady] = useState(false);
	const [sceneLoaded, setSceneLoaded] = useState(false);
	const [renderVersion, setRenderVersion] = useState(0);
	const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
	const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([
		6, 8.5, 9,
	]);
	const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
	const [visibleActions, setVisibleActions] = useState<string[]>([]);
	const [districtActions, setDistrictActions] = useState<string[]>([]);
	const commandProfile = useMemo(
		() => getBotCommandProfile(unitType),
		[unitType],
	);

	useEffect(() => {
		setReady(false);
		setSceneLoaded(false);
		resetGameState();
		resetRuntimeState();
		resetStructuralSpace();
		resetRadialMenu();
		clearActiveWorldSession();
		for (const entity of [...world.entities]) {
			entity.destroy();
		}

		const session = createPreviewSession(71717);
		setSession(session);
		setActiveWorldSession(session);
		setResources({
			scrapMetal: 30,
			eWaste: 20,
			intactComponents: 8,
		});
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

		const homeBase = session.pointsOfInterest.find(
			(poi) => poi.type === "home_base",
		)!;
		const home = gridToWorld(homeBase.q, homeBase.r);
		const homeFocus = getAnchorClusterFocus(session, homeBase.q, homeBase.r);
		setCameraTarget(homeFocus.target);
		setCameraPosition(homeFocus.position);

		const entity = world.spawn(
			Identity,
			MapFragment,
			Unit,
			WorldPosition,
			...(unitType === "fabrication_unit" ? [Building] : []),
		);
		entity.set(Identity, { id: "radial_preview_bot", faction: "player" });
		entity.set(MapFragment, { fragmentId: "world_primary" });
		entity.set(
			Unit,
			createBotUnitState({
				unitType,
				selected: true,
				components: [],
			}),
		);
		entity.set(WorldPosition, { x: home.x, y: 0, z: home.z });
		if (unitType === "fabrication_unit") {
			entity.set(Building, {
				type: "fabrication_unit",
				powered: true,
				operational: true,
				selected: false,
				components: [],
			});
		}

		setNearbyPoi({
			cityInstanceId: session.cityInstances[0]?.id ?? null,
			discovered: true,
			distance: 1.2,
			name: session.pointsOfInterest[0]?.name ?? "Command Arcology",
			poiId: session.pointsOfInterest[0]?.id ?? 1,
			poiType: session.pointsOfInterest[0]?.type ?? "home_base",
		});

		const centerX = 980;
		const centerY = 430;
		openRadialMenu(centerX, centerY, {
			selectionType: "unit",
			targetEntityId: "radial_preview_bot",
			targetSector: { q: homeBase.q, r: homeBase.r },
			targetFaction: "player",
		});
		const state = getRadialMenuState();
		const targetPetal = state.innerPetals.find(
			(petal) => petal.id === commandProfile.preferredPreviewCategory,
		);
		if (targetPetal) {
			const { innerRingInner, innerRingOuter } = getRadialGeometry();
			const midAngle = (targetPetal.startAngle + targetPetal.endAngle) / 2;
			const hoverRadius = (innerRingInner + innerRingOuter) / 2;
			const point = polarPoint(centerX, centerY, hoverRadius, midAngle);
			updateRadialHover(point.x, point.y);
		}
		const resolvedState = getRadialMenuState();
		setVisibleCategories(resolvedState.innerPetals.map((petal) => petal.label));
		setVisibleActions(
			getResolvedActionsForCategory(
				commandProfile.preferredPreviewCategory,
			).map((action) => action.label),
		);
		setDistrictActions(
			getResolvedActionsForCategory("district").map((action) => action.label),
		);

		setRenderVersion((value) => value + 1);
		setReady(true);

		return () => {
			entity.destroy();
			resetRadialMenu();
			clearActiveWorldSession();
			resetRuntimeState();
			resetStructuralSpace();
			resetGameState();
			setSession(null);
		};
	}, [commandProfile.preferredPreviewCategory, unitType]);

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
					<Canvas
						key={renderVersion}
						style={{ position: "absolute", inset: 0 }}
						camera={{ position: [...cameraPosition], fov: 34 }}
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
						<StructuralFloorRenderer profile="ops" session={session} />
						<Suspense fallback={null}>
							<CityRenderer profile="ops" session={session} />
						</Suspense>
						<Suspense fallback={null}>
							<UnitRenderer />
						</Suspense>
					</Canvas>
					<BriefingBubbleLayer />
					<RadialMenu key={`radial-${renderVersion}`} />
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
							fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
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
							Radial Ownership Validation
						</div>
						<div style={{ marginTop: 10, fontSize: 13, color: "#ffffff" }}>
							{createBotUnitState({ unitType, components: [] }).displayName}
						</div>
						<div
							style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}
						>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Preferred category: {commandProfile.preferredPreviewCategory}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Allowed categories:{" "}
								{commandProfile.allowedCategories.join(", ")}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Highlights: {commandProfile.actionHighlights.join(", ")}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Visible categories: {visibleCategories.join(", ")}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								District actions: {districtActions.join(", ")}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Expanded actions: {visibleActions.join(", ")}
							</div>
							<div style={{ color: "rgba(216,246,255,0.72)" }}>
								Role brief: {commandProfile.roleBrief}
							</div>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
