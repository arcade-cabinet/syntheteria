/**
 * Full R3F game scene (world + city interior). No Filament, no SceneComposer.
 * Used by the Vite/Capacitor app as the only 3D path.
 */

import { Canvas } from "@react-three/fiber";
import {
	Suspense,
	useEffect,
	useEffectEvent,
	useState,
	useSyncExternalStore,
} from "react";
import { USE_WEBGPU_WEB } from "./config/rendering";
import { TopDownCamera } from "./input/TopDownCamera";
import { UnitInput } from "./input/UnitInput";
import { ActionRangeRenderer } from "./rendering/ActionRangeRenderer";
import { BreachZoneRenderer } from "./rendering/BreachZoneRenderer";
import { ChunkLoaderSync } from "./rendering/ChunkLoaderSync";
import { CityInteriorRenderer } from "./rendering/CityInteriorRenderer";
import { CityRenderer } from "./rendering/CityRenderer";
import { CombatEffectsRenderer } from "./rendering/CombatEffectsRenderer";
import { ConstructionRenderer } from "./rendering/ConstructionRenderer";
import { GlowRingRenderer } from "./rendering/GlowRingRenderer";
import { HackingBeamRenderer } from "./rendering/HackingBeamRenderer";
import { HarvestProgressOverlay } from "./rendering/HarvestProgressOverlay";
import { HarvestVisualRenderer } from "./rendering/HarvestVisualRenderer";
import { InstancedBuildingRenderer } from "./rendering/InstancedBuildingRenderer";
import { LandscapeProps } from "./rendering/LandscapeProps";
import { LightningSystem } from "./rendering/LightningSystem";
import { MemoryFragmentRenderer } from "./rendering/MemoryFragmentRenderer";
import { MovementOverlayRenderer } from "./rendering/MovementOverlayRenderer";
import { NetworkLineRenderer } from "./rendering/NetworkLineRenderer";
import { PathPreviewRenderer } from "./rendering/PathPreviewRenderer";
import { PostProcessing } from "./rendering/PostProcessing";
import { ProceduralStructureDetails } from "./rendering/ProceduralStructureDetails";
import { ParticleRenderer } from "./rendering/particles/ParticleRenderer";
import { ShadowSystem } from "./rendering/ShadowSystem";
import { SpeechBubbleRenderer } from "./rendering/SpeechBubbleRenderer";
import { StormEnvironment } from "./rendering/StormEnvironment";
import { StormLighting } from "./rendering/StormLighting";
import { StormParticles } from "./rendering/StormParticles";
import { StormSky } from "./rendering/StormSky";
import { StructuralFloorRenderer } from "./rendering/StructuralFloorRenderer";
import { TerritoryBorderRenderer } from "./rendering/TerritoryBorderRenderer";
import { TerritoryFillRenderer } from "./rendering/TerritoryFillRenderer";
import { TurretAttackRenderer } from "./rendering/TurretAttackRenderer";
import { UnitRenderer } from "./rendering/UnitRenderer";
import { WormholeRenderer } from "./rendering/WormholeRenderer";
import { getRuntimeState, subscribeRuntimeState } from "./world/runtimeState";

function SceneReadySignal({ onReady }: { onReady: () => void }) {
	const notifyReady = useEffectEvent(onReady);
	useEffect(() => {
		notifyReady();
	}, []);
	return null;
}

function WorldScene() {
	return (
		<>
			<ambientLight intensity={0.95} color={0x7c8ea8} />
			<hemisphereLight
				intensity={0.9}
				color={0x7fb9ff}
				groundColor={0x071119}
			/>
			<directionalLight
				position={[8, 16, 10]}
				intensity={1.45}
				color={0x8be6ff}
			/>
			<directionalLight
				position={[-8, 10, -6]}
				intensity={0.7}
				color={0xf6c56a}
			/>
			<StormSky />
			<StormLighting />
			<StormParticles />
			<LightningSystem />
			<UnitInput />
			<ChunkLoaderSync />
			<StructuralFloorRenderer />
			<NetworkLineRenderer />
			<LandscapeProps />
			<Suspense fallback={null}>
				<CityRenderer />
			</Suspense>
			<HarvestProgressOverlay />
			<UnitRenderer />
			<SpeechBubbleRenderer />
			<GlowRingRenderer />
			<CombatEffectsRenderer />
			<HackingBeamRenderer />
			<TurretAttackRenderer />
			<HarvestVisualRenderer />
			<ConstructionRenderer />
			<InstancedBuildingRenderer />
			<ParticleRenderer />
			<TerritoryBorderRenderer />
			<TerritoryFillRenderer />
			<BreachZoneRenderer />
			<StormEnvironment />
			<ProceduralStructureDetails />
			<MovementOverlayRenderer />
			<PathPreviewRenderer />
			<ActionRangeRenderer />
			<MemoryFragmentRenderer />
			<WormholeRenderer />
			<ShadowSystem />
			<PostProcessing />
		</>
	);
}

function CityInteriorScene() {
	return (
		<>
			<ambientLight intensity={0.4} color={0x111122} />
			<directionalLight
				position={[0, 20, -10]}
				intensity={0.5}
				color={0x7744aa}
				castShadow
			/>
			<CityInteriorRenderer />
		</>
	);
}

export function GameSceneR3F({ onSceneReady }: { onSceneReady: () => void }) {
	const runtimeState = useSyncExternalStore(
		subscribeRuntimeState,
		getRuntimeState,
	);
	const activeScene = runtimeState.activeScene;

	return (
		<Canvas
			style={{ position: "absolute", inset: 0 }}
			shadows
			camera={{ position: [0, 20, 20], fov: 45 }}
			{...(USE_WEBGPU_WEB
				? {
						gl: (async (defaultProps: {
							canvas: HTMLCanvasElement | OffscreenCanvas;
						}) => {
							const { WebGPURenderer } = await import("three/webgpu");
							const renderer = new WebGPURenderer({
								canvas: defaultProps.canvas as HTMLCanvasElement,
								antialias: true,
								alpha: false,
							});
							await renderer.init();
							return renderer;
						}) as import("@react-three/fiber").GLProps,
					}
				: { gl: { alpha: false } })}
		>
			{/* Background color must be outside Suspense so scene.background is set
			    immediately — even while GLBs are loading. Inside Suspense it unmounts
			    during loading, leaving scene.background=null and the canvas transparent. */}
			<color attach="background" args={["#030308"]} />
			<Suspense
				fallback={
					<mesh>
						<boxGeometry />
						<meshBasicMaterial color="blue" />
					</mesh>
				}
			>
				<SceneReadySignal onReady={onSceneReady} />
				<TopDownCamera />
				{activeScene === "world" ? <WorldScene /> : <CityInteriorScene />}
			</Suspense>
		</Canvas>
	);
}
