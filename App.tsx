import { Canvas } from "@react-three/fiber";
import { StatusBar } from "expo-status-bar";
import {
	Component,
	Suspense,
	startTransition,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { TerrainRenderer } from "./src/rendering/TerrainRenderer";
import { UnitRenderer } from "./src/rendering/UnitRenderer";
import { GameUI } from "./src/ui/GameUI";
import { TitleScreen } from "./src/ui/TitleScreen";
import type { NewGameConfig } from "./src/world/config";
import { generateWorldData } from "./src/world/generation";
import {
	getRuntimeState,
	subscribeRuntimeState,
} from "./src/world/runtimeState";
import { setActiveWorldSession } from "./src/world/session";
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
						backgroundColor: "red",
						justifyContent: "center",
						alignItems: "center",
					}}
				>
					<Text style={{ color: "white" }}>
						Render Error: {this.state.error?.message}
					</Text>
				</View>
			);
		}
		return this.props.children;
	}
}

export default function App() {
	const [inGame, setInGame] = useState(false);
	const [loadingLabel, setLoadingLabel] = useState("Hydrating world");
	const [isLoading, setIsLoading] = useState(false);
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
				mapSize: saveGame.map_size,
				difficulty: saveGame.difficulty,
				climateProfile: saveGame.climate_profile,
				stormProfile: saveGame.storm_profile,
			});
			persistGeneratedWorldSync(
				saveGame,
				{
					worldSeed: saveGame.world_seed,
					mapSize: saveGame.map_size,
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
		setActiveWorldSession({
			saveGame: persistedWorld.saveGame,
			config: persistedWorld.config,
			worldMap: persistedWorld.worldMap,
			tiles: persistedWorld.tiles,
			pointsOfInterest: persistedWorld.pointsOfInterest,
			cityInstances: persistedWorld.cityInstances,
			campaignState: persistedWorld.campaignState,
			resourceState: persistedWorld.resourceState,
		});
		initializeNewGame(persistedWorld);
	};

	const handleNewGame = async (config: NewGameConfig) => {
		setLoadingLabel("Generating persistent world");
		setIsLoading(true);
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
								<color attach="background" args={["#050505"]} />
								<ambientLight intensity={0.5} />
								<directionalLight
									position={[10, 20, 10]}
									intensity={1}
									castShadow
								/>

								<TopDownCamera />
								{runtimeState.activeScene === "world" ? (
									<>
										<UnitInput />
										<TerrainRenderer />
										<CityRenderer />
										<UnitRenderer />
									</>
								) : (
									<CityInteriorRenderer />
								)}
							</Suspense>
						</Canvas>
					</ErrorBoundary>
					<GameUI />
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
