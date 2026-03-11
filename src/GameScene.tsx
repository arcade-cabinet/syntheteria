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
import { NavMeshDebugRenderer } from "./ai/NavMeshDebugRenderer";
import { YukaSystem } from "./ai/YukaSystem.tsx";
import { AudioSystem } from "./audio/AudioSystem";
import { getGameSpeed, getSnapshot, subscribe } from "./ecs/gameState";
import { syncAfterFrame, syncBeforeFrame } from "./ecs/koota/bridge";
import { getActivePlayerBot } from "./ecs/world";
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
import { FogOfWarRenderer } from "./rendering/FogOfWarRenderer";
import { FreeCubeRenderer } from "./rendering/FreeCubeRenderer";
import { FurnaceRenderer } from "./rendering/FurnaceRenderer";
import { HarvestParticles } from "./rendering/HarvestParticles";
import { HologramRenderer } from "./rendering/HologramRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { usePreloadCubeMaterials } from "./rendering/materials/CubeMaterialProvider";
import { OreDepositRenderer } from "./rendering/OreDepositRenderer";
import { OtterRenderer } from "./rendering/OtterRenderer";
import { PlacedCubeRenderer } from "./rendering/PlacedCubeRenderer";
import { PlacementPreview } from "./rendering/PlacementPreview";
import { PostProcessing } from "./rendering/PostProcessing";
import { SelectionHighlight } from "./rendering/SelectionHighlight";
import { StockpileGlow } from "./rendering/StockpileGlow";
import { StormSky } from "./rendering/StormSky";
import { usePreloadTerrainMaterials } from "./rendering/TerrainPBR";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { WallRenderer } from "./rendering/WallRenderer";
import { WealthIndicator } from "./rendering/WealthIndicator";
import { WireRenderer } from "./rendering/WireRenderer";
import { saveGame } from "./save/SaveManager";
import { CoreLoopSystem } from "./systems/CoreLoopSystem";
import { GameplaySystems } from "./systems/GameplaySystems";
import { orchestratorTick } from "./systems/gameLoopOrchestrator";
import { InteractionSystem } from "./systems/InteractionSystem";
import { movementSystem } from "./systems/movement";
import { getLastResult } from "./systems/newGameInit";
import { registerAllSystems } from "./systems/registerSystems";
import { Bezel } from "./ui/Bezel";
import { CoreLoopHUD } from "./ui/CoreLoopHUD";
import { FPSHUD } from "./ui/FPSHUD";
import { GameOverScreen } from "./ui/GameOverScreen";
import { InventoryView } from "./ui/InventoryView";
import { MobileControls } from "./ui/MobileControls";
import { ObjectActionMenu } from "./ui/ObjectActionMenu";
import { PowerOverlay } from "./ui/PowerOverlay";
import { QuestPanel } from "./ui/QuestPanel";
import { getEquippedTool } from "./ui/RadialToolMenu";
import { SaveLoadMenu } from "./ui/SaveLoadMenu";
import { TechTreePanel } from "./ui/TechTreePanel";

// Register all systems with the orchestrator once at module load
registerAllSystems();

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
		syncBeforeFrame();

		const speed = getGameSpeed();
		if (speed <= 0) {
			syncAfterFrame();
			return;
		}

		movementSystem(delta, speed);

		simAccumulator.current += delta * speed;
		while (simAccumulator.current >= SIM_INTERVAL) {
			simAccumulator.current -= SIM_INTERVAL;
			orchestratorTick();
		}

		syncAfterFrame();
	});

	return null;
}

// --- GameScene ---

export interface GameSceneProps {
	seed: number;
}

export default function GameScene({ seed: _seed }: GameSceneProps) {
	const [saveMenuOpen, setSaveMenuOpen] = useState(false);

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

	// Guard: require successful newGameInit before rendering
	const result = getLastResult();
	if (!result?.success) {
		return null;
	}

	// Detect touch device
	const isMobile = "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;

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
