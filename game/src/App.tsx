/**
 * Syntheteria — FPS Factory Planet
 *
 * You wake up as a broken robot on the surface of a machine planet.
 * No narration walls. No click-through text. You just... wake up.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildNavMesh } from "./ai/NavMeshBuilder";
import { NavMeshDebugRenderer } from "./ai/NavMeshDebugRenderer";
import { YukaManager } from "./ai/YukaManager";
import { YukaSystem } from "./ai/YukaSystem.tsx";
import { AudioSystem } from "./audio/AudioSystem";
import { placeBelt } from "./ecs/beltFactory";
import { getCityBuildings, resetCityLayout } from "./ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnOtter,
	spawnUnit,
} from "./ecs/factory";
import { spawnMiner, spawnProcessor } from "./ecs/factoryBuildings";
import { getGameSpeed, getSnapshot, simulationTick } from "./ecs/gameState";
import { phraseToSeed, setWorldSeed } from "./ecs/seed";
import { getTerrainHeight, initTerrainFromSeed } from "./ecs/terrain";
import type { Entity } from "./ecs/types";
import { placeWire } from "./ecs/wireFactory";
import { getActivePlayerBot, world } from "./ecs/world";
import { FPSCamera } from "./input/FPSCamera";
import { FPSInput } from "./input/FPSInput";
import { ObjectSelectionSystem } from "./input/ObjectSelectionSystem";
import { PhysicsSystem } from "./physics/PhysicsSystem";
import { BeltRenderer } from "./rendering/BeltRenderer";
import { CameraEffects } from "./rendering/CameraEffects";
import { CityRenderer } from "./rendering/CityRenderer";
import { EnvironmentSetup } from "./rendering/EnvironmentSetup";
import { FactoryRenderer } from "./rendering/FactoryRenderer";
import { Flashlight } from "./rendering/Flashlight";
import { FreeCubeRenderer } from "./rendering/FreeCubeRenderer";
import { HarvestParticles } from "./rendering/HarvestParticles";
import { FurnaceRenderer } from "./rendering/FurnaceRenderer";
import { PlacementPreview } from "./rendering/PlacementPreview";
import { HologramRenderer } from "./rendering/HologramRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { OreDepositRenderer } from "./rendering/OreDepositRenderer";
import { OtterRenderer } from "./rendering/OtterRenderer";
import { PlacedCubeRenderer } from "./rendering/PlacedCubeRenderer";
import { SelectionHighlight } from "./rendering/SelectionHighlight";
import { usePreloadTerrainMaterials } from "./rendering/TerrainPBR";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { WallRenderer } from "./rendering/WallRenderer";
import { WireRenderer } from "./rendering/WireRenderer";
import { updateBeltTransport } from "./systems/beltTransport";
import { botAutomationSystem } from "./systems/botAutomation";
import { CoreLoopSystem } from "./systems/CoreLoopSystem";
import { GameplaySystems } from "./systems/GameplaySystems";
import { cultistAISystem, spawnCultist } from "./systems/cultistAI";
import { createFurnace } from "./systems/furnace";
import { InteractionSystem } from "./systems/InteractionSystem";
import { movementSystem } from "./systems/movement";
import { buildNavGraph } from "./systems/navmesh";
import { spawnInitialDeposits } from "./systems/oreSpawner";
import { autoStartFirstQuest } from "./systems/questSystem";
import { resetScavengePoints } from "./systems/resources";
import { Bezel } from "./ui/Bezel";
import { CoreLoopHUD } from "./ui/CoreLoopHUD";
import { FPSHUD } from "./ui/FPSHUD";
import { InventoryView } from "./ui/InventoryView";
import { ObjectActionMenu } from "./ui/ObjectActionMenu";
import { MobileControls } from "./ui/MobileControls";
import { PowerOverlay } from "./ui/PowerOverlay";
import type { PregameConfig } from "./ui/PregameScreen";
import { PregameScreen } from "./ui/PregameScreen";
import { getEquippedTool } from "./ui/RadialToolMenu";
import { TitleScreen } from "./ui/TitleScreen";

// --- World initialization ---

function initializeWorld(seed: number) {
	setWorldSeed(seed);
	initTerrainFromSeed(seed);
	resetCityLayout();
	resetScavengePoints();

	getCityBuildings();
	buildNavGraph();

	// Build Yuka NavMesh for navmesh-based pathfinding (parallel to grid A*)
	const yukaNavMesh = buildNavMesh();
	YukaManager.setNavMesh(yukaNavMesh);

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

	// ── Factory infrastructure ───────────────────────────────────────
	const frag = bot1.mapFragment.fragmentId;

	// Second lightning rod — further out, player must expand to reach it
	const rod2 = spawnLightningRod({ x: 25, z: 15, fragmentId: frag });

	// Mining drill near the starting area (scrap metal deposit)
	const miner1 = spawnMiner({
		x: 20,
		z: 10,
		fragmentId: frag,
		resourceType: "scrap_metal",
	});

	// Processor — smelter to refine scrap
	const proc1 = spawnProcessor({
		x: 22,
		z: 10,
		fragmentId: frag,
		processorType: "smelter",
	});

	// Conveyor belt chain: miner → processor (3 segments going east)
	placeBelt(21, 10, "east");

	// Power wire from lightning rod to fabrication unit
	placeWire(rod2.id, miner1.id, "power");
	placeWire(rod2.id, proc1.id, "power");

	// ── Signal relays ────────────────────────────────────────────────
	// Signal relay near starting area — extends player signal range
	world.add({
		id: "relay_start",
		faction: "player",
		worldPosition: { x: 12, y: getTerrainHeight(12, 15), z: 15 },
		mapFragment: { fragmentId: frag },
		signalRelay: {
			signalRange: 15,
			connectedTo: [],
			signalStrength: 0,
		},
	} as Partial<Entity> as Entity);

	// Signal relay further out — needs to be hacked or wired
	world.add({
		id: "relay_east",
		faction: "feral",
		worldPosition: { x: 30, y: getTerrainHeight(30, 12), z: 12 },
		mapFragment: { fragmentId: frag },
		signalRelay: {
			signalRange: 12,
			connectedTo: [],
			signalStrength: 0,
		},
		hackable: {
			difficulty: 20,
			hackProgress: 0,
			beingHacked: false,
			hacked: false,
		},
	} as Partial<Entity> as Entity);

	// ── Cultists ─────────────────────────────────────────────────────
	// Northern territory patrol — far enough that players discover them later
	spawnCultist({ x: 15, z: -30, fragmentId: frag, patrolRadius: 10 });
	spawnCultist({ x: 22, z: -35, fragmentId: frag, patrolRadius: 8 });

	// ── Ore deposits ────────────────────────────────────────────────
	// Scatter 15 ore deposits across a 200m world area
	spawnInitialDeposits(15, 200);

	// ── Starting furnace ────────────────────────────────────────────
	// Player's first furnace — near the fabrication unit
	createFurnace({ x: 13, y: 0, z: 14 });

	// ── Quest system ─────────────────────────────────────────────────
	autoStartFirstQuest();
}

// --- Game loop ---

/** Preloads PBR textures for terrain and buildings on mount. */
function PBRPreloader() {
	usePreloadTerrainMaterials();
	return null;
}

function GameLoop() {
	const simAccumulator = useRef(0);
	const SIM_INTERVAL = 1.0;

	useFrame((_, delta) => {
		const speed = getGameSpeed();
		if (speed <= 0) return;

		const scaledDelta = delta * speed;

		movementSystem(delta, speed);
		updateBeltTransport(scaledDelta);
		botAutomationSystem(scaledDelta);
		cultistAISystem(scaledDelta);

		simAccumulator.current += scaledDelta;
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
	const [phase, setPhase] = useState<"title" | "pregame" | "playing">("title");
	const pendingSeedRef = useRef<number>(42);
	const pregameConfigRef = useRef<PregameConfig | null>(null);

	useEffect(() => {
		if (phase === "playing" && !worldInitialized) {
			worldInitialized = true;
			initializeWorld(pendingSeedRef.current);
		}
	}, [phase]);

	// Title screen "New Game" → go to pregame config
	const handleNewGame = (_seed: number) => {
		setPhase("pregame");
	};

	// Pregame "Start Game" → initialize world and play
	const handlePregameStart = (config: PregameConfig) => {
		pregameConfigRef.current = config;
		// Resolve seed from the map settings phrase
		const seed = phraseToSeed(config.mapSettings.seedPhrase) ?? 42;
		pendingSeedRef.current = seed;
		setPhase("playing");
	};

	// Pregame "Back" → return to title
	const handlePregameBack = () => {
		setPhase("title");
	};

	// Detect touch device
	const isMobile = "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;

	// Mobile action handlers
	const handleInteract = useCallback(() => {
		// Simulate E key press for FPSInput
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
	}, []);

	const handleSwitchBot = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }));
	}, []);

	const handlePrimaryAction = useCallback(() => {
		// Primary action depends on equipped tool — for now, same as interact
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
	}, []);

	if (phase === "title") {
		return <TitleScreen onNewGame={handleNewGame} />;
	}

	if (phase === "pregame") {
		return (
			<PregameScreen onStart={handlePregameStart} onBack={handlePregameBack} />
		);
	}

	// Get game state for bezel informatics
	const snap = getSnapshot();
	const bot = getActivePlayerBot();

	return (
		<Bezel
			resources={snap.resources}
			power={snap.power}
			equippedTool={getEquippedTool().toUpperCase()}
			botName={bot?.unit.displayName}
			isMobile={isMobile}
		>
			<Canvas
				camera={{ fov: 75, near: 0.1, far: 500 }}
				style={{ width: "100%", height: "100%" }}
			>
				<PBRPreloader />
				<EnvironmentSetup />
				<ambientLight intensity={0.15} />
				<directionalLight
					position={[10, 20, 10]}
					intensity={0.4}
					color="#8899cc"
				/>

				<TerrainRenderer />
				<LandscapeProps />
				<CityRenderer />
				<UnitRenderer />
				<OtterRenderer />
				<BeltRenderer />
				<WireRenderer />
				<FactoryRenderer />
				<HologramRenderer />
				<OreDepositRenderer />
				<FreeCubeRenderer />
				<PlacedCubeRenderer />
				<FurnaceRenderer />
				<PlacementPreview />
				<HarvestParticles />
				<WallRenderer />

				<FPSCamera />
				<CameraEffects />
				<Flashlight />
				<FPSInput />
				<ObjectSelectionSystem />
				<SelectionHighlight />
				<PhysicsSystem />
				<AudioSystem />
				<GameLoop />
				<CoreLoopSystem />
				<InteractionSystem />
				<YukaSystem />
				<GameplaySystems />
				<NavMeshDebugRenderer />
			</Canvas>

			{/* HUD overlays on the viewport */}
			<FPSHUD />
			<CoreLoopHUD />
			<PowerOverlay />
			<InventoryView />
			<ObjectActionMenu />

			{/* Mobile controls — joystick, tool view, action buttons */}
			{isMobile && (
				<MobileControls
					onInteract={handleInteract}
					onSwitchBot={handleSwitchBot}
					onPrimaryAction={handlePrimaryAction}
				/>
			)}
		</Bezel>
	);
}
