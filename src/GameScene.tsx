/**
 * GameScene — the 3D game world, extracted into its own module for
 * React.lazy() code splitting.  All Three.js / Rapier / audio imports
 * live here so the title & pregame screens load without the heavy chunk.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
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
import {
	getGameSpeed,
	getSnapshot,
	simulationTick,
	subscribe,
} from "./ecs/gameState";
import { setWorldSeed } from "./ecs/seed";
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
import { PostProcessing } from "./rendering/PostProcessing";
import { FactoryRenderer } from "./rendering/FactoryRenderer";
import { Flashlight } from "./rendering/Flashlight";
import { FogOfWarRenderer } from "./rendering/FogOfWarRenderer";
import { FreeCubeRenderer } from "./rendering/FreeCubeRenderer";
import { FurnaceRenderer } from "./rendering/FurnaceRenderer";
import { HarvestParticles } from "./rendering/HarvestParticles";
import { HologramRenderer } from "./rendering/HologramRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { OreDepositRenderer } from "./rendering/OreDepositRenderer";
import { OtterRenderer } from "./rendering/OtterRenderer";
import { PlacedCubeRenderer } from "./rendering/PlacedCubeRenderer";
import { PlacementPreview } from "./rendering/PlacementPreview";
import { SelectionHighlight } from "./rendering/SelectionHighlight";
import { StockpileGlow } from "./rendering/StockpileGlow";
import { StormSky } from "./rendering/StormSky";
import { usePreloadCubeMaterials } from "./rendering/materials/CubeMaterialProvider";
import { usePreloadTerrainMaterials } from "./rendering/TerrainPBR";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { WallRenderer } from "./rendering/WallRenderer";
import { WealthIndicator } from "./rendering/WealthIndicator";
import { WireRenderer } from "./rendering/WireRenderer";
import { saveGame } from "./save/SaveManager";
import { updateBeltTransport } from "./systems/beltTransport";
import { botAutomationSystem } from "./systems/botAutomation";
import { CoreLoopSystem } from "./systems/CoreLoopSystem";
import { cultistAISystem, spawnCultist } from "./systems/cultistAI";
import { fpsCombatSystem } from "./systems/fpsCombat";
import { createFurnace } from "./systems/furnace";
import { GameplaySystems } from "./systems/GameplaySystems";
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
import { MobileControls } from "./ui/MobileControls";
import { ObjectActionMenu } from "./ui/ObjectActionMenu";
import { PowerOverlay } from "./ui/PowerOverlay";
import { QuestPanel } from "./ui/QuestPanel";
import { TechTreePanel } from "./ui/TechTreePanel";
import { getEquippedTool } from "./ui/RadialToolMenu";
import { GameOverScreen } from "./ui/GameOverScreen";
import { SaveLoadMenu } from "./ui/SaveLoadMenu";

// --- World initialization ---

function initializeWorld(seed: number) {
	setWorldSeed(seed);
	initTerrainFromSeed(seed);
	resetCityLayout();
	resetScavengePoints();

	getCityBuildings();
	buildNavGraph();

	const yukaNavMesh = buildNavMesh();
	YukaManager.setNavMesh(yukaNavMesh);

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

	spawnFabricationUnit({
		x: 13,
		z: 14,
		fragmentId: bot1.mapFragment.fragmentId,
		powered: false,
	});

	spawnLightningRod({
		x: 10,
		z: 13,
		fragmentId: bot1.mapFragment.fragmentId,
	});

	simulationTick();

	// ── Otter Holograms ──────────────────────────────────────────────────────
	// The home-planet AI that dispatched the player found Earth otters endearing
	// and adopted an otter as its holographic avatar. Holograms appear at fixed
	// positions — Star-Wars-style translucent projections — delivering tutorials,
	// crafting guidance, and quest progression.
	//
	// Pip is the primary hologram — spawned right next to the starting bots so
	// the player encounters it immediately.
	spawnOtter({
		x: 14,
		z: 18,
		stationary: true,
		lines: [
			"Oh. You're awake. I wasn't sure the signal would reach you.",
			"I'm Pip — your home-planet AI's local projection. I've been monitoring those two bots while you were offline.",
			"Walk over to Bot Beta — the one nearby. Press Q to switch into it.",
			"Get both bots close to the lightning rod. Power flows when they're in range.",
			"Once the fabrication unit has power, you can start building. That's where it gets interesting.",
			"Home base has been waiting a long time for this signal. Don't let it go to waste.",
		],
	});

	// Five more hologram projection points within the city and its outskirts —
	// close enough to find during early exploration, each relaying mission
	// intelligence from the home-planet AI.
	spawnOtter({
		x: -18,
		z: 8,
		lines: [
			"The feral machines don't sleep. Keep your bots moving.",
			"They used to be like yours. Something corrupted their directives a long time ago.",
		],
	});
	spawnOtter({
		x: 24,
		z: -12,
		lines: [
			"Sensors show e-waste deposits near the old factory towers. Worth scavenging.",
			"Scrap metal too — your bots should be able to locate it.",
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
			"Lightning storms are getting worse every cycle.",
			"Dangerous for unshielded circuits. Good for your power rods.",
		],
	});
	spawnOtter({
		x: 6,
		z: -24,
		lines: [
			"This river carried industrial runoff before the machines went feral.",
			"The environment has adapted. You'll have to as well.",
		],
	});

	// Factory infrastructure
	const frag = bot1.mapFragment.fragmentId;

	const rod2 = spawnLightningRod({ x: 25, z: 15, fragmentId: frag });

	const miner1 = spawnMiner({
		x: 20,
		z: 10,
		fragmentId: frag,
		resourceType: "scrap_metal",
	});

	const proc1 = spawnProcessor({
		x: 22,
		z: 10,
		fragmentId: frag,
		processorType: "smelter",
	});

	placeBelt(21, 10, "east");

	placeWire(rod2.id, miner1.id, "power");
	placeWire(rod2.id, proc1.id, "power");

	// Signal relays
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

	// Cultists
	spawnCultist({ x: 15, z: -30, fragmentId: frag, patrolRadius: 10 });
	spawnCultist({ x: 22, z: -35, fragmentId: frag, patrolRadius: 8 });

	// Ore deposits
	spawnInitialDeposits(15, 200);

	// Starting furnace
	createFurnace({ x: 13, y: 0, z: 14 });

	// Quest system
	autoStartFirstQuest();
}

// --- Game loop ---

function PBRPreloader() {
	usePreloadTerrainMaterials();
	usePreloadCubeMaterials();
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
		fpsCombatSystem(delta);

		simAccumulator.current += scaledDelta;
		while (simAccumulator.current >= SIM_INTERVAL) {
			simAccumulator.current -= SIM_INTERVAL;
			simulationTick();
		}
	});

	return null;
}

// --- GameScene ---

let worldInitialized = false;

export interface GameSceneProps {
	seed: number;
}

export default function GameScene({ seed }: GameSceneProps) {
	const [saveMenuOpen, setSaveMenuOpen] = useState(false);

	useEffect(() => {
		if (!worldInitialized) {
			worldInitialized = true;
			initializeWorld(seed);
		}
	}, [seed]);

	// ESC key toggles save/load menu.
	// Uses keyup to avoid conflicts with other ESC handlers (ObjectActionMenu,
	// RadialMenu, InventoryView) which use keydown.
	useEffect(() => {
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSaveMenuOpen((prev) => !prev);
			}
		};

		window.addEventListener("keyup", onKeyUp);
		return () => window.removeEventListener("keyup", onKeyUp);
	}, []);

	// Autosave every 5 minutes
	useEffect(() => {
		const interval = setInterval(
			() => {
				saveGame("autosave").catch((err) =>
					console.warn("[Autosave] Failed:", err),
				);
			},
			5 * 60 * 1000,
		);

		return () => clearInterval(interval);
	}, []);

	// Detect touch device
	const isMobile = "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;

	// Mobile action handlers
	const handleInteract = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
	}, []);

	const handleSwitchBot = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }));
	}, []);

	const handlePrimaryAction = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
	}, []);

	const handleHarvest = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
	}, []);

	const handleCompress = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
	}, []);

	const handleGrab = useCallback(() => {
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
	}, []);

	// Subscribe to game state for reactive bezel informatics (bot name, resources, power)
	const snap = useSyncExternalStore(subscribe, getSnapshot);
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
				<StormSky />
				<PostProcessing />
				<ambientLight intensity={0.15} />
				<directionalLight
					position={[10, 20, 10]}
					intensity={0.4}
					color="#8899cc"
				/>

				<TerrainRenderer />
				<FogOfWarRenderer />
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
				<StockpileGlow />
				<WealthIndicator />
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
			<QuestPanel />
			<TechTreePanel />
			<ObjectActionMenu />

			{/* Mobile controls — joystick, tool view, action buttons */}
			{isMobile && (
				<MobileControls
					onInteract={handleInteract}
					onSwitchBot={handleSwitchBot}
					onPrimaryAction={handlePrimaryAction}
					onHarvest={handleHarvest}
					onCompress={handleCompress}
					onGrab={handleGrab}
				/>
			)}

			{/* Save/Load menu — ESC to toggle */}
			{saveMenuOpen && (
				<SaveLoadMenu
					onClose={() => setSaveMenuOpen(false)}
					onLoadComplete={() => setSaveMenuOpen(false)}
				/>
			)}

			{/* Game over overlay — victory or loss */}
			{snap.gameOver && <GameOverScreen state={snap.gameOver} />}
		</Bezel>
	);
}
