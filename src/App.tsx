/**
 * Syntheteria — Phase 1 Prototype
 * Opening narration → continuous terrain with navmesh-based free 3D navigation.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
	disposeAudio,
	startAmbience,
	startMusic,
	stopAmbience,
	stopMusic,
} from "./audio";
import { INTRO_SEQUENCE } from "./config/narrativeDefs";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "./ecs/factory";
import { getGameSpeed, simulationTick } from "./ecs/gameState";
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

// --- World initialization ---

function initializeWorld() {
	// Initialize city layout (must happen before navmesh so buildings block paths)
	getCityBuildings();
	buildNavGraph();

	// Bot 1: Has a working camera but broken arms.
	// Spawns in a clear area within the city streets.
	const bot1 = spawnUnit({
		x: 8,
		z: 12,
		displayName: "Bot Alpha",
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Bot 2: Has working arms but broken camera.
	// Nearby but separated by buildings — must navigate streets.
	spawnUnit({
		x: 18,
		z: 16,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		displayName: "Bot Beta",
		components: [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Fabrication unit: Stationary building, no power.
	// Located in a street between the two bots.
	spawnFabricationUnit({
		x: 13,
		z: 14,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		powered: false,
		components: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
	});

	// Lightning rod: Provides power and protection in the starting area.
	spawnLightningRod({
		x: 10,
		z: 13,
		fragmentId: bot1.get(Fragment)!.fragmentId,
	});

	// Initial exploration tick so terrain is visible
	simulationTick();
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

	useEffect(() => {
		if (phase === "playing" && !worldInitialized) {
			worldInitialized = true;
			initializeWorld();
			// Start ambience and music when gameplay begins
			startAmbience();
			startMusic(1); // Epoch 1: Emergence
		}
	}, [phase]);

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
				onStartGame={(_config: NewGameConfig) => {
					// Config (seed, difficulty) will be used when world gen is wired
					setPhase("narration");
				}}
			/>
		);
	}

	if (phase === "narration") {
		return (
			<NarrativeOverlay
				sequence={INTRO_SEQUENCE}
				onComplete={() => setPhase("playing")}
			/>
		);
	}

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
					camera={{ position: [8, 30, 26], fov: 45, near: 0.1, far: 500 }}
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

					<TopDownCamera />
					<UnitInput />
					<GameLoop />
				</Canvas>

				<GameUI />
				<DebugOverlay />
			</div>
		</ErrorBoundary>
	);
}
