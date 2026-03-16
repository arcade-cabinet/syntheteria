/**
 * Preview component for full generated world overview visual test.
 *
 * Generates a small world (sector scale "small" = 28x28) using TEST_SEED=42
 * and renders all discovered tiles + sector structures with an orthographic
 * top-down camera. Initializes the world session and structural space so that
 * the StructuralFloorRenderer and CityRenderer can read their data.
 */
import { Canvas, useThree } from "@react-three/fiber";
import { WorldProvider } from "koota/react";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { resetGameState } from "../../src/ecs/gameState";
import { world } from "../../src/ecs/world";
import { CityRenderer } from "../../src/rendering/CityRenderer";
import { StructuralFloorRenderer } from "../../src/rendering/StructuralFloorRenderer";
import { createNewGameConfig } from "../../src/world/config";
import { generateWorldData } from "../../src/world/generation";
import {
	resetRuntimeState,
	setRuntimeScene,
	setRuntimeTick,
} from "../../src/world/runtimeState";
import {
	SECTOR_LATTICE_SIZE,
	gridToWorld,
} from "../../src/world/sectorCoordinates";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "../../src/world/session";
import type { WorldSessionSnapshot } from "../../src/world/snapshots";
import {
	loadStructuralFragment,
	resetStructuralSpace,
} from "../../src/world/structuralSpace";
import { TEST_SEED } from "../testConstants";
import { AssetLoadBeacon } from "./AssetLoadBeacon";

function createOverviewSession(seed: number): WorldSessionSnapshot {
	const config = createNewGameConfig(seed, {
		sectorScale: "small",
		climateProfile: "temperate",
		stormProfile: "stable",
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
		generation_status: city.generationStatus,
		state: city.state,
	}));

	return {
		saveGame: {
			id: 1,
			name: "World Overview Test",
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
			scrap_metal: 0,
			e_waste: 0,
			intact_components: 0,
			last_synced_at: 0,
		},
	};
}

function CameraRig({
	target,
	position,
}: {
	target: [number, number, number];
	position: [number, number, number];
}) {
	const { camera } = useThree();

	useEffect(() => {
		camera.position.set(...position);
		camera.lookAt(...target);
		camera.updateProjectionMatrix();
	}, [camera, target, position]);

	return null;
}

export function WorldOverviewPreview() {
	const [ready, setReady] = useState(false);
	const [sceneLoaded, setSceneLoaded] = useState(false);
	const [session, setSession] = useState<WorldSessionSnapshot | null>(null);

	useEffect(() => {
		setReady(false);
		setSceneLoaded(false);
		resetGameState();
		resetRuntimeState();
		resetStructuralSpace();
		clearActiveWorldSession();
		for (const entity of [...world.entities]) {
			entity.destroy();
		}

		const session = createOverviewSession(TEST_SEED);
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
			"world_overview_test",
		);
		setRuntimeScene("world", null);
		setRuntimeTick(0);
		setReady(true);

		return () => {
			clearActiveWorldSession();
			resetRuntimeState();
			resetStructuralSpace();
			resetGameState();
		};
	}, []);

	// Camera centered over the world looking straight down
	const worldWidth = session?.ecumenopolis.width ?? 28;
	const worldHeight = session?.ecumenopolis.height ?? 28;
	const centerX = (worldWidth / 2) * SECTOR_LATTICE_SIZE;
	const centerZ = (worldHeight / 2) * SECTOR_LATTICE_SIZE;

	return (
		<div
			style={{
				width: 800,
				height: 600,
				position: "relative",
				background: "#03070d",
				overflow: "hidden",
			}}
		>
			{ready && session ? (
				<>
					<WorldProvider world={world}>
						<Canvas
						style={{ position: "absolute", inset: 0 }}
						camera={{
							position: [centerX, 50, centerZ + 35],
							fov: 26,
						}}
						gl={{ preserveDrawingBuffer: true }}
					>
						<color attach="background" args={["#03070d"]} />
						<CameraRig
							position={[centerX, 50, centerZ + 35]}
							target={[centerX, 0, centerZ]}
						/>
						<AssetLoadBeacon onLoaded={() => setSceneLoaded(true)} />
						<ambientLight intensity={1.05} color={0x7c8ea8} />
						<hemisphereLight args={[0x7fb9ff, 0x071119, 0.9]} />
						<directionalLight
							position={[8, 30, 10]}
							intensity={1.7}
							color={0x8be6ff}
						/>
						<StructuralFloorRenderer
							profile="overview"
							session={session}
						/>
						<Suspense fallback={null}>
							<CityRenderer profile="overview" session={session} />
						</Suspense>
						</Canvas>
					</WorldProvider>
					<div
						data-testid="canvas-status"
						style={{
							position: "absolute",
							left: 8,
							bottom: 8,
							padding: "4px 8px",
							background: "rgba(0,0,0,0.7)",
							color: sceneLoaded ? "#6ff3c8" : "#ff9cb5",
							fontSize: 11,
							fontFamily:
								"ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
							letterSpacing: "0.14em",
							textTransform: "uppercase",
							borderRadius: 6,
						}}
					>
						{sceneLoaded ? "Ready" : "Rendering"}
					</div>
					<div
						style={{
							position: "absolute",
							right: 12,
							top: 12,
							padding: "8px 12px",
							borderRadius: 10,
							border: "1px solid rgba(139,230,255,0.18)",
							background: "rgba(3,7,13,0.75)",
							color: "#d8f6ff",
							fontSize: 11,
							fontFamily:
								"ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
							letterSpacing: "0.14em",
							textTransform: "uppercase",
							pointerEvents: "none",
						}}
					>
						World Overview · Seed {TEST_SEED} · {worldWidth}x{worldHeight}
					</div>
				</>
			) : null}
		</div>
	);
}
