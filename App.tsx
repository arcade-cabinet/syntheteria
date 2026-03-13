import { Canvas } from "@react-three/fiber";
import { StatusBar } from "expo-status-bar";
import {
	Component,
	Suspense,
	startTransition,
	useEffectEvent,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import "./src/db";
import { initializeDatabaseSync } from "./src/db/bootstrap";
import {
	createSaveGameSync,
	getLatestSaveGameSync,
	type SaveGameRecord,
	touchSaveGameSync,
} from "./src/db/saveGames";
import {
	getPersistedWorldSync,
	type PersistedWorldRecord,
	persistGeneratedWorldSync,
} from "./src/db/worldPersistence";
import { initializeNewGame } from "./src/ecs/initialization";
import { initGameplayPRNG, setWorldSeed } from "./src/ecs/seed";
import { TopDownCamera } from "./src/input/TopDownCamera";
import { UnitInput } from "./src/input/UnitInput";
import { CityInteriorRenderer } from "./src/rendering/CityInteriorRenderer";
import { CityRenderer } from "./src/rendering/CityRenderer";
import { HarvestProgressOverlay } from "./src/rendering/HarvestProgressOverlay";
import { LandscapeProps } from "./src/rendering/LandscapeProps";
import { LightningSystem } from "./src/rendering/LightningSystem";
import { NetworkLineRenderer } from "./src/rendering/NetworkLineRenderer";
import { StructuralFloorRenderer } from "./src/rendering/StructuralFloorRenderer";
import { StormLighting } from "./src/rendering/StormLighting";
import { StormParticles } from "./src/rendering/StormParticles";
import { StormSky } from "./src/rendering/StormSky";
import { UnitRenderer } from "./src/rendering/UnitRenderer";
import { GameUI } from "./src/ui/GameUI";
import { LoadingOverlay } from "./src/ui/LoadingOverlay";
import { TitleScreen } from "./src/ui/TitleScreen";
import type { NewGameConfig } from "./src/world/config";
import { generateWorldData } from "./src/world/generation";
import {
	getRuntimeState,
	subscribeRuntimeState,
} from "./src/world/runtimeState";
import { setActiveWorldSession } from "./src/world/session";
import { toWorldSessionSnapshot } from "./src/world/snapshots";
import "./global.css";

class ErrorBoundary extends Component<
	{ children: any },
	{ hasError: boolean; error: any }
> {
	constructor(props: any) {
		super(props);
		this.state = { hasError: false, error: null };
	}
	static getDerivedStateFromError(error: any) {
		return { hasError: true, error };
	}
	render() {
		if (this.state.hasError) {
			return (
				<View
					style={{
						flex: 1,
						backgroundColor: "#09131b",
						justifyContent: "center",
						alignItems: "center",
						padding: 24,
					}}
				>
					<Text
						style={{
							color: "#ff8f8f",
							fontFamily: "monospace",
							fontSize: 11,
							letterSpacing: 2,
							textTransform: "uppercase",
							marginBottom: 8,
						}}
					>
						Signal Lost
					</Text>
					<Text
						style={{
							color: "#edfaff",
							fontFamily: "monospace",
							fontSize: 14,
							textAlign: "center",
						}}
					>
						{this.state.error?.message}
					</Text>
				</View>
			);
		}
		return this.props.children;
	}
}

function SceneReadySignal({ onReady }: { onReady: () => void }) {
	const notifyReady = useEffectEvent(onReady);

	useEffect(() => {
		notifyReady();
	}, [notifyReady]);

	return null;
}

export default function App() {
	const [inGame, setInGame] = useState(false);
	const [loadingLabel, setLoadingLabel] = useState("Hydrating world");
	const [isLoading, setIsLoading] = useState(false);
	const [sceneReady, setSceneReady] = useState(false);
	const runtimeState = useSyncExternalStore(
		subscribeRuntimeState,
		getRuntimeState,
	);

	useEffect(() => {
		initializeDatabaseSync();
	}, []);

	const nextFrame = () =>
		new Promise<void>((resolve) => setTimeout(resolve, 0));

	const ensurePersistedWorld = (
		saveGame: SaveGameRecord,
	): PersistedWorldRecord => {
		try {
			return getPersistedWorldSync(saveGame);
		} catch (_error) {
			const generatedWorld = generateWorldData({
				worldSeed: saveGame.world_seed,
				sectorScale: saveGame.sector_scale,
				difficulty: saveGame.difficulty,
				climateProfile: saveGame.climate_profile,
				stormProfile: saveGame.storm_profile,
			});
			persistGeneratedWorldSync(
				saveGame,
				{
					worldSeed: saveGame.world_seed,
					sectorScale: saveGame.sector_scale,
					difficulty: saveGame.difficulty,
					climateProfile: saveGame.climate_profile,
					stormProfile: saveGame.storm_profile,
				},
				generatedWorld,
			);
			return getPersistedWorldSync(saveGame);
		}
	};

	const hydratePersistedWorld = (persistedWorld: PersistedWorldRecord) => {
		setWorldSeed(persistedWorld.config.worldSeed);
		initGameplayPRNG(persistedWorld.config.worldSeed);
		setActiveWorldSession(toWorldSessionSnapshot(persistedWorld));
		initializeNewGame(persistedWorld);
	};

	const handleNewGame = async (config: NewGameConfig) => {
		setLoadingLabel("Generating persistent world");
		setIsLoading(true);
		setSceneReady(false);
		await nextFrame();
		try {
			const saveGame = createSaveGameSync(config);
			if (!saveGame) {
				throw new Error("Failed to create save game record.");
			}
			const generatedWorld = generateWorldData(config);
			persistGeneratedWorldSync(saveGame, config, generatedWorld);
			const persistedWorld = getPersistedWorldSync(saveGame);

			hydratePersistedWorld(persistedWorld);
			startTransition(() => {
				setInGame(true);
				setIsLoading(false);
			});
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	const handleContinueGame = async () => {
		const saveGame = getLatestSaveGameSync();
		if (!saveGame) {
			return;
		}

		setLoadingLabel("Loading latest save");
		setIsLoading(true);
		setSceneReady(false);
		await nextFrame();
		try {
			touchSaveGameSync(saveGame.id);
			const persistedWorld = ensurePersistedWorld(saveGame);
			hydratePersistedWorld(persistedWorld);
			startTransition(() => {
				setInGame(true);
				setIsLoading(false);
			});
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" hidden={true} />

			{!inGame ? (
				<TitleScreen
					isLoading={isLoading}
					loadingLabel={loadingLabel}
					onContinueGame={handleContinueGame}
					onNewGame={handleNewGame}
				/>
			) : (
				<View style={StyleSheet.absoluteFill}>
					<ErrorBoundary>
						<Canvas
							style={StyleSheet.absoluteFill}
							shadows
							camera={{ position: [0, 20, 20], fov: 45 }}
						>
							<Suspense
								fallback={
									<mesh>
										<boxGeometry />
										<meshBasicMaterial color="blue" />
									</mesh>
								}
							>
								<SceneReadySignal
									onReady={() => {
										setSceneReady(true);
									}}
								/>
								<color attach="background" args={["#030308"]} />

								<TopDownCamera />
								{runtimeState.activeScene === "world" ? (
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
										<StructuralFloorRenderer />
										<NetworkLineRenderer />
										<LandscapeProps />
										<Suspense fallback={null}>
											<CityRenderer />
										</Suspense>
										<HarvestProgressOverlay />
										<UnitRenderer />
									</>
								) : (
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
								)}
							</Suspense>
						</Canvas>
					</ErrorBoundary>
					{sceneReady && <GameUI />}
					{!sceneReady ? (
						<LoadingOverlay label="Stabilizing structural feed" />
					) : (
						<View
							testID="game-scene-ready"
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: 2,
								height: 2,
								opacity: 0.01,
								pointerEvents: "none",
							}}
						/>
					)}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
});
