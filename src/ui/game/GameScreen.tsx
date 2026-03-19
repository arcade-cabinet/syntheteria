/**
 * GameScreen — the entire in-game view.
 *
 * Owns the R3F Canvas. Receives BoardConfig, gameId, GeneratedBoard, and
 * the live ECS World from main after the new-game flow completes.
 *
 * Architecture:
 *   Canvas (R3F)
 *     IsometricCamera     — fixed-angle pan/zoom, CivRev2-style
 *     StormDome           — BackSide sky sphere with storm + wormhole GLSL
 *     fogExp2             — exponential fog for horizon depth (hides board edge)
 *     BoardRenderer       — procedural floor geometry + curvature shader
 *     HighlightRenderer   — emissive overlay on reachable/selected tiles
 *     UnitRenderer        — box meshes for all ECS units
 *     BoardInput          — click-to-select, click-to-move
 *
 * Lighting notes (CivRev2 reference):
 *   Bright artificial daylight — sealed dome with zenith illuminator.
 *   Hemisphere light provides warm sky/ground tint.
 *   drei Environment preset for image-based lighting on all GLB models.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useEffectEvent } from "react";
import type { BoardConfig, GeneratedBoard } from "../../board/types";
import { IsometricCamera } from "../../camera";
import { TILE_SIZE_M } from "../../config/gameDefaults";
import { resolveAttacks } from "../../ecs/systems/attackSystem";
import { BoardInput } from "../../input/BoardInput";
import { BiomeRenderer } from "../../rendering/BiomeRenderer";
import { BoardRenderer } from "../../rendering/BoardRenderer";
import { CombatEffectsRenderer } from "../../rendering/CombatEffectsRenderer";
import { CutawayClipPlane } from "../../rendering/CutawayClipPlane";
import { UnifiedTerrainRenderer } from "../../rendering/UnifiedTerrainRenderer";
import { FogOfWarRenderer } from "../../rendering/FogOfWarRenderer";
import { InfrastructureRenderer } from "../../rendering/InfrastructureRenderer";
import { StructureRenderer } from "../../rendering/StructureRenderer";
import { SalvageRenderer } from "../../rendering/SalvageRenderer";
import { BuildingRenderer } from "../../rendering/BuildingRenderer";
import { HighlightRenderer } from "../../rendering/HighlightRenderer";
import { ParticleRenderer } from "../../rendering/particles/ParticleRenderer";
import { TerritoryOverlayRenderer } from "../../rendering/TerritoryOverlayRenderer";
import { PathRenderer } from "../../rendering/PathRenderer";
import { StormDome } from "../../rendering/StormDome";
import { turnToChronometry } from "../../rendering/sky/chronometry";
import type { StormProfile } from "../../world/config";
import { UnitRenderer } from "../../rendering/UnitRenderer";
import { SpeechBubbleRenderer } from "../../rendering/SpeechBubbleRenderer";
import { UnitStatusBars } from "../../rendering/UnitStatusBars";
import { HoverTracker } from "./HoverTracker";
import { KeybindHints } from "./KeybindHints";
import { Minimap } from "./Minimap";
import { RadialMenu } from "./RadialMenu";
import { SystemToasts } from "./SystemToasts";
import { ToastStack } from "./ToastStack";
import { TurnLog } from "./TurnLog";
import { TurnPhaseOverlay } from "./TurnPhaseOverlay";
import { TutorialOverlay } from "./TutorialOverlay";
import { EntityTooltip } from "./EntityTooltip";
import { SelectedInfo } from "./SelectedInfo";

type GameScreenProps = {
	config: BoardConfig;
	gameId: string;
	board?: GeneratedBoard;
	world?: World;
	selectedUnitId?: number | null;
	onSelect?: (id: number | null) => void;
	onSceneReady: () => void;
	/** Current game turn — drives orbital illuminator position and seasonal sky. */
	turn?: number;
	/** Camera focus point in tile coordinates (defaults to board center). */
	focusTileX?: number;
	focusTileZ?: number;
	/** Storm profile — drives dome cloud speed, density, wormhole intensity. */
	stormProfile?: StormProfile;
};

function SceneLoop({ world }: { world: World }) {
	useFrame(() => {
		resolveAttacks(world);
	});
	return null;
}

function SceneReadySignal({ onReady }: { onReady: () => void }) {
	const notifyReady = useEffectEvent(onReady);
	useEffect(() => {
		notifyReady();
	}, []);
	return null;
}

export function GameScreen({
	config: _config,
	gameId: _gameId,
	board,
	world,
	selectedUnitId,
	onSelect,
	onSceneReady,
	turn = 1,
	focusTileX,
	focusTileZ,
	stormProfile = "stable",
}: GameScreenProps) {
	const { dayAngle, season } = turnToChronometry(turn);

	// Camera focus: use provided focus tile, or fall back to board center
	const cameraFocusX = board
		? (focusTileX ?? Math.floor(board.config.width / 2)) * TILE_SIZE_M
		: 0;
	const cameraFocusZ = board
		? (focusTileZ ?? Math.floor(board.config.height / 2)) * TILE_SIZE_M
		: 0;

	return (
		<>
		<Canvas
			style={{ position: "absolute", inset: 0, background: "#2a2535" }}
			gl={{ alpha: false }}
			shadows={{ type: THREE.PCFShadowMap }}
		>
			{/* Exponential fog — the ONLY atmospheric effect. Applied automatically
			    to MeshStandardMaterial; ShaderMaterials need fog:true in their config. */}
			<fogExp2 attach="fog" args={["#2a2535", 0.006]} />

			<Suspense fallback={null}>
				<SceneReadySignal onReady={onSceneReady} />

				{/* Lighting — INDUSTRIAL DOME LIGHT.
				    Warm-white overhead light — sealed dome, zenith illuminator.
				    Reduced from 2.5/1.6/5.0 to prevent washed-out GLB models. */}
				<ambientLight intensity={1.2} color={0xf0e8e0} />
				<hemisphereLight
					intensity={0.8}
					color={0xfff4e8}
					groundColor={0x504840}
				/>
				<directionalLight
					position={[0, 100, 0]}
					intensity={3.0}
					color={0xfff8f0}
					castShadow
					shadow-mapSize={[2048, 2048]}
					shadow-camera-near={0.5}
					shadow-camera-far={400}
					shadow-camera-left={-80}
					shadow-camera-right={80}
					shadow-camera-top={80}
					shadow-camera-bottom={-80}
				/>

				{/* Storm sky HDRI — AmbientCG EveningSkyHDRI030A (heavy overcast storm clouds).
				    background=true fills the sky. Also provides IBL for all GLB models. */}
				<Environment files="/assets/textures/storm_sky.exr" background />

				{/* Storm sky dome — visible in the background above the board horizon */}
				<StormDome
					centerX={board ? Math.floor(board.config.width / 2) * TILE_SIZE_M : 0}
					centerZ={
						board ? Math.floor(board.config.height / 2) * TILE_SIZE_M : 0
					}
					dayAngle={dayAngle}
					season={season}
					stormProfile={stormProfile}
				/>

				{/* Camera — centred on board, toroidal wrap at edges */}
				<IsometricCamera
					initialX={cameraFocusX}
					initialZ={cameraFocusZ}
					boardWidth={board ? board.config.width * TILE_SIZE_M : undefined}
					boardHeight={board ? board.config.height * TILE_SIZE_M : undefined}
				/>
				<CutawayClipPlane />

				{/* Floor — Layer 1 (height) then Layer 2 (biome textures) */}
				{board && (
					<BoardRenderer board={board} dayAngle={dayAngle} season={season} />
				)}
				{board && (
					<BiomeRenderer board={board} dayAngle={dayAngle} season={season} />
				)}

				{/* Unified terrain: bridges, columns, voids, abyssal, ramps, mined pits */}
				{board && <UnifiedTerrainRenderer board={board} world={world ?? undefined} turn={turn} />}

				{/* Layer 3 — GLB wall, column, and staircase models at structural_mass clusters */}
				{board && <StructureRenderer board={board} world={world ?? undefined} />}

				{/* Layer 3b — infrastructure scatter (pipes, lamps, supports, antennas) */}
				{board && <InfrastructureRenderer board={board} world={world ?? undefined} />}

				{/* Layer 4 — salvage props (instanced GLB models) */}
				{world && <SalvageRenderer world={world} />}

				{/* Layer 4b — faction buildings and cult structures (GLB models) */}
			{world && <BuildingRenderer world={world} />}

			{/* Layer 4c — territory faction tint overlay */}
			{world && board && <TerritoryOverlayRenderer board={board} world={world} />}

		{/* Layer 5 — fog of war over unexplored terrain */}
				{world && board && <FogOfWarRenderer world={world} board={board} />}

				{/* ECS overlays and input — only when world is available */}
				{world && <SceneLoop world={world} />}
				{world && <HighlightRenderer world={world} />}
				<PathRenderer />
				{world && <UnitRenderer world={world} />}
				{world && board && onSelect && (
					<BoardInput
						world={world}
						board={board}
						selectedId={selectedUnitId}
						onSelect={onSelect}
					/>
				)}
				{world && board && <HoverTracker world={world} board={board} />}
				{world && <CombatEffectsRenderer world={world} />}
				{world && <UnitStatusBars world={world} selectedUnitId={selectedUnitId} />}
				{world && <SpeechBubbleRenderer world={world} />}
				<ParticleRenderer />
			</Suspense>
		</Canvas>
		<TurnLog />
		{world && board && <Minimap world={world} board={board} />}
		<RadialMenu />
		<KeybindHints />
		<SystemToasts />
		<ToastStack />
		<TurnPhaseOverlay />
		<TutorialOverlay turn={turn} />
		<EntityTooltip />
		{world && <SelectedInfo world={world} selectedUnitId={selectedUnitId ?? null} />}
		</>
	);
}
