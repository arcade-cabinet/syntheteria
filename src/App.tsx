/**
 * Syntheteria — Phase 1 Prototype
 * Opening narration → continuous terrain with navmesh-based free 3D navigation.
 * In-game phase transitions trigger narrative overlays during gameplay.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
	disposeAudio,
	startAmbience,
	startMusic,
	stopAmbience,
	stopMusic,
} from "./audio";
import type { DialogueSequence } from "./config/narrativeDefs";
import {
	EXPANSION_SEQUENCE,
	INTRO_SEQUENCE,
	WAR_SEQUENCE,
} from "./config/narrativeDefs";
import type { GamePhaseId } from "./config/phaseDefs";
import { getRooms, initCityLayout } from "./ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "./ecs/factory";
import {
	getGameSpeed,
	getSnapshot,
	isPaused,
	simulationTick,
	subscribe,
	togglePause,
} from "./ecs/gameState";
import { Fragment } from "./ecs/traits";
import { logError } from "./errors";
import { TopDownCamera } from "./input/TopDownCamera";
import { UnitInput } from "./input/UnitInput";
import { CityRenderer } from "./rendering/CityRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { StormSky } from "./rendering/StormSky";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { movementSystem } from "./systems/movement";
import { buildNavGraph } from "./systems/navmesh";
import { GameUI } from "./ui/GameUI";
import { DebugOverlay } from "./ui/game/DebugOverlay";
import { ErrorBoundary } from "./ui/game/ErrorBoundary";
import { NarrativeOverlay } from "./ui/game/NarrativeOverlay";
import { LandingScreen, type NewGameConfig } from "./ui/landing/LandingScreen";

// --- Phase → Narrative sequence mapping ---

const PHASE_NARRATIVE: Partial<Record<GamePhaseId, DialogueSequence>> = {
	expansion: EXPANSION_SEQUENCE,
	war: WAR_SEQUENCE,
};

// --- World initialization ---

function initializeWorld(
	seed = "default",
	difficulty: "easy" | "normal" | "hard" = "normal",
): { startX: number; startZ: number } {
	// Generate labyrinth board (must happen before navmesh so walls block paths)
	initCityLayout({ width: 48, height: 48, seed, difficulty });
	buildNavGraph();

	// Find the player start room to spawn units there
	const rooms = getRooms();
	const playerRoom = rooms.find((r) => r.tag === "player");
	const TILE_SIZE = 2.0;
	const startX = playerRoom
		? (playerRoom.x + playerRoom.w / 2) * TILE_SIZE
		: 48;
	const startZ = playerRoom
		? (playerRoom.z + playerRoom.h / 2) * TILE_SIZE
		: 62;

	// Bot 1: Has a working camera but broken arms.
	const bot1 = spawnUnit({
		x: startX - 2,
		z: startZ,
		displayName: "Bot Alpha",
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Bot 2: Has working arms but broken camera.
	spawnUnit({
		x: startX + 2,
		z: startZ,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		displayName: "Bot Beta",
		components: [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Fabrication unit in the player start room.
	spawnFabricationUnit({
		x: startX,
		z: startZ + 2,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		powered: false,
		components: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
	});

	// Lightning rod in the player start room.
	spawnLightningRod({
		x: startX - 3,
		z: startZ + 2,
		fragmentId: bot1.get(Fragment)!.fragmentId,
	});

	// Initial exploration tick so terrain is visible
	simulationTick();

	return { startX, startZ };
}

// --- Game loop ---

function GameLoop() {
	const simAccumulator = useRef(0);
	const SIM_INTERVAL = 1.0;

	useFrame((_, delta) => {
		const speed = getGameSpeed();
		if (speed <= 0) return;

		movementSystem(delta, speed);

		simAccumulator.current += delta * speed;
		while (simAccumulator.current >= SIM_INTERVAL) {
			simAccumulator.current -= SIM_INTERVAL;
			simulationTick();
		}
	});

	return null;
}

// --- Main App ---

let worldInitialized = false;

export default function App() {
	const [phase, setPhase] = useState<"title" | "narration" | "playing">(
		"title",
	);
	const [phaseNarrative, setPhaseNarrative] = useState<DialogueSequence | null>(
		null,
	);
	const gameConfigRef = useRef<NewGameConfig>({
		seed: "default",
		difficulty: "normal",
	});
	const wasPausedRef = useRef(false);
	const [startPos, setStartPos] = useState<{ x: number; z: number } | null>(
		null,
	);

	// Watch game snapshot for phase transitions during gameplay
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	// Detect in-game phase transitions and show narrative overlay
	useEffect(() => {
		if (phase !== "playing") return;
		if (phaseNarrative) return; // already showing a narrative

		const transitionId = snap.phaseTransitionId;
		if (!transitionId) return;

		const sequence = PHASE_NARRATIVE[transitionId];
		if (!sequence) return;

		// Pause the game and show the narrative overlay
		wasPausedRef.current = isPaused();
		if (!isPaused()) {
			togglePause();
		}
		setPhaseNarrative(sequence);
	}, [phase, snap.phaseTransitionId, phaseNarrative]);

	// Cleanup audio on unmount
	useEffect(() => {
		return () => {
			stopAmbience();
			stopMusic();
			disposeAudio();
		};
	}, []);

	// Global handler for uncaught errors and unhandled rejections
	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			logError(event.error ?? event.message);
		};
		const onRejection = (event: PromiseRejectionEvent) => {
			logError(event.reason);
		};
		window.addEventListener("error", onError);
		window.addEventListener("unhandledrejection", onRejection);
		return () => {
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onRejection);
		};
	}, []);

	if (phase === "title") {
		return (
			<LandingScreen
				onStartGame={(config: NewGameConfig) => {
					gameConfigRef.current = config;
					setPhase("narration");
				}}
			/>
		);
	}

	if (phase === "narration") {
		return (
			<NarrativeOverlay
				sequence={INTRO_SEQUENCE}
				onComplete={() => {
					if (!worldInitialized) {
						worldInitialized = true;
						const cfg = gameConfigRef.current;
						const { startX, startZ } = initializeWorld(
							cfg.seed,
							cfg.difficulty,
						);
						setStartPos({ x: startX, z: startZ });
						startAmbience();
						startMusic(1); // Epoch 1: Emergence
					}
					setPhase("playing");
				}}
			/>
		);
	}

	// Wait for world initialization before rendering the Canvas
	if (!startPos) return null;

	return (
		<ErrorBoundary>
			<div
				style={{
					width: "100vw",
					height: "100vh",
					background: "#000",
					touchAction: "none",
				}}
			>
				<Canvas
					camera={{
						position: [startPos.x, 40, startPos.z + 40 * 0.6],
						fov: 45,
						near: 0.1,
						far: 500,
					}}
					style={{ width: "100%", height: "100%" }}
				>
					<StormSky />
					<ambientLight intensity={0.4} />
					<directionalLight
						position={[10, 20, 10]}
						intensity={0.6}
						color="#aabbff"
					/>

					<TerrainRenderer />
					<LandscapeProps />
					<CityRenderer />
					<UnitRenderer />

					<TopDownCamera initialTarget={startPos} initialZoom={40} />
					<UnitInput />
					<GameLoop />
				</Canvas>

				<GameUI />
				<DebugOverlay />

				{/* In-game phase transition narrative overlay */}
				{phaseNarrative && (
					<NarrativeOverlay
						sequence={phaseNarrative}
						onComplete={() => {
							setPhaseNarrative(null);
							// Resume game if it wasn't paused before the transition
							if (!wasPausedRef.current && isPaused()) {
								togglePause();
							}
						}}
					/>
				)}
			</div>
		</ErrorBoundary>
	);
}
