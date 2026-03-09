/**
 * Syntheteria — FPS Factory Planet
 *
 * You wake up as a broken robot on the surface of a machine planet.
 * No narration walls. No click-through text. You just... wake up.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { getCityBuildings, resetCityLayout } from "./ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnOtter,
	spawnUnit,
} from "./ecs/factory";
import { getGameSpeed, simulationTick } from "./ecs/gameState";
import { setWorldSeed } from "./ecs/seed";
import { initTerrainFromSeed } from "./ecs/terrain";
import { FPSCamera } from "./input/FPSCamera";
import { FPSInput } from "./input/FPSInput";
import { CityRenderer } from "./rendering/CityRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { OtterRenderer } from "./rendering/OtterRenderer";
import { StormSky } from "./rendering/StormSky";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { movementSystem } from "./systems/movement";
import { buildNavGraph } from "./systems/navmesh";
import { resetScavengePoints } from "./systems/resources";
import { FPSHUD } from "./ui/FPSHUD";
import { TitleScreen } from "./ui/TitleScreen";

// --- World initialization ---

function initializeWorld(seed: number) {
	setWorldSeed(seed);
	initTerrainFromSeed(seed);
	resetCityLayout();
	resetScavengePoints();

	getCityBuildings();
	buildNavGraph();

	// Bot 1 (YOU): Has a working camera but broken arms.
	// This is the bot you wake up as. First person. You can see but can't interact.
	const bot1 = spawnUnit({
		x: 8,
		z: 12,
		displayName: "Bot Alpha",
		playerControlled: true,
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Bot 2: Has working arms but broken camera.
	// Nearby — you can see it from where you start. Walk to it. Press Q to switch.
	spawnUnit({
		x: 18,
		z: 16,
		fragmentId: bot1.mapFragment.fragmentId,
		displayName: "Bot Beta",
		playerControlled: false,
		components: [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Fabrication unit: needs power to work.
	spawnFabricationUnit({
		x: 13,
		z: 14,
		fragmentId: bot1.mapFragment.fragmentId,
		powered: false,
	});

	// Lightning rod: provides power in the starting area.
	spawnLightningRod({
		x: 10,
		z: 13,
		fragmentId: bot1.mapFragment.fragmentId,
	});

	// Initial exploration tick so terrain is visible
	simulationTick();

	// ── Otters ────────────────────────────────────────────────────────
	// Pip is near the start — walk up to her and the story begins organically.
	spawnOtter({
		x: 14,
		z: 18,
		stationary: true,
		lines: [
			"Oh. You're awake. I wasn't sure you would be.",
			"I'm Pip. I've been keeping those two bots of yours running while you were... away.",
			"Walk over to Bot Beta — the one nearby. Press Q to switch into it.",
			"Get both bots close to the lightning rod. Power flows when they're in range.",
			"Once the fabrication unit has power, you can start building. That's where it gets interesting.",
			"We've been waiting a long time for this. Don't let it go to waste.",
		],
	});

	spawnOtter({
		x: -18,
		z: 8,
		lines: [
			"The feral machines don't sleep. Keep moving.",
			"They used to be like yours. Something went wrong with them a long time ago.",
		],
	});
	spawnOtter({
		x: 24,
		z: -12,
		lines: [
			"E-waste piles up near the old factory towers. Worth scavenging.",
			"Scrap metal too, if you know where to look.",
		],
	});
	spawnOtter({
		x: -10,
		z: -22,
		lines: [
			"There is a cult, north of the city. They call their god EL.",
			"Don't go north. Not yet.",
		],
	});
	spawnOtter({
		x: 30,
		z: 22,
		lines: [
			"Lightning storms are getting worse every season.",
			"Bad for us. Good for your power rods.",
		],
	});
	spawnOtter({
		x: 6,
		z: -24,
		lines: [
			"My family fished this river before the chemical runoff.",
			"We adapted. You'll have to as well.",
		],
	});
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
	const [phase, setPhase] = useState<"title" | "playing">("title");
	const pendingSeedRef = useRef<number>(42);

	useEffect(() => {
		if (phase === "playing" && !worldInitialized) {
			worldInitialized = true;
			initializeWorld(pendingSeedRef.current);
		}
	}, [phase]);

	const handleNewGame = (seed: number) => {
		pendingSeedRef.current = seed;
		// No narration. Just go.
		setPhase("playing");
	};

	if (phase === "title") {
		return <TitleScreen onNewGame={handleNewGame} />;
	}

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				background: "#000",
				touchAction: "none",
			}}
		>
			<Canvas
				camera={{ fov: 75, near: 0.1, far: 500 }}
				style={{ width: "100%", height: "100%" }}
			>
				<StormSky />
				<ambientLight intensity={0.3} />
				<directionalLight
					position={[10, 20, 10]}
					intensity={0.6}
					color="#aabbff"
				/>

				<TerrainRenderer />
				<LandscapeProps />
				<CityRenderer />
				<UnitRenderer />
				<OtterRenderer />

				<FPSCamera />
				<FPSInput />
				<GameLoop />
			</Canvas>

			<FPSHUD />
		</div>
	);
}
