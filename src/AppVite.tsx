/**
 * Vite/Capacitor app: R3F-only game with minimal DOM shell.
 * No React Native; no Filament. Phase 6 will add full DOM UI (GameUI, TitleScreen).
 */

import { WorldProvider } from "koota/react";
import { startTransition, useState } from "react";
import { saveAllStateSync } from "./db/saveAllState";
import {
	createSaveGameSync,
	getLatestSaveGameSync,
	type SaveGameRecord,
	touchSaveGameSync,
} from "./db/saveGames";
import {
	getPersistedWorldSync,
	type PersistedWorldRecord,
	persistGeneratedWorldSync,
} from "./db/worldPersistence";
import { setWorldReady } from "./ecs/gameState";
import { initializeNewGame } from "./ecs/initialization";
import { initGameplayPRNG, setWorldSeed } from "./ecs/seed";
import { world } from "./ecs/world";
import { GameSceneR3F } from "./GameSceneR3F";
import { GameHUDDom } from "./ui/dom/GameHUDDom";
import type { NewGameConfig } from "./world/config";
import {
	clearActiveWorldSession,
	setActiveWorldSession,
} from "./world/session";
import "./systems/radialProviders";
import "./systems/turnPhaseHandlers";
import "./systems/autosave";
import { createNewGameConfig } from "./world/config";
import { generateWorldData } from "./world/generation";
import { toWorldSessionSnapshot } from "./world/snapshots";

const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function ensurePersistedWorld(saveGame: SaveGameRecord): PersistedWorldRecord {
	try {
		return getPersistedWorldSync(saveGame);
	} catch {
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
}

function hydratePersistedWorld(persistedWorld: PersistedWorldRecord) {
	setWorldSeed(persistedWorld.config.worldSeed);
	initGameplayPRNG(persistedWorld.config.worldSeed);
	setActiveWorldSession(toWorldSessionSnapshot(persistedWorld));
	initializeNewGame(persistedWorld);
}

function AppInner() {
	const [inGame, setInGame] = useState(false);
	const [loadingLabel, setLoadingLabel] = useState("Hydrating world");
	const [isLoading, setIsLoading] = useState(false);
	const [sceneReady, setSceneReady] = useState(false);

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
			persistGeneratedWorldSync(saveGame, config, generateWorldData(config));
			const persistedWorld = getPersistedWorldSync(saveGame);
			hydratePersistedWorld(persistedWorld);
			setWorldReady(true);
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
		if (!saveGame) return;
		setLoadingLabel("Loading latest save");
		setIsLoading(true);
		setSceneReady(false);
		await nextFrame();
		try {
			touchSaveGameSync(saveGame.id);
			const persistedWorld = ensurePersistedWorld(saveGame);
			hydratePersistedWorld(persistedWorld);
			setWorldReady(true);
			startTransition(() => {
				setInGame(true);
				setIsLoading(false);
			});
		} catch (error) {
			setIsLoading(false);
			throw error;
		}
	};

	const handleQuitToTitle = () => {
		saveAllStateSync();
		clearActiveWorldSession();
		startTransition(() => {
			setInGame(false);
			setSceneReady(false);
		});
	};

	if (!inGame) {
		return (
			<div
				style={{
					position: "fixed",
					inset: 0,
					background: "#030308",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 24,
					color: "#edfaff",
					fontFamily: "system-ui, sans-serif",
				}}
			>
				<h1 style={{ fontSize: 28, letterSpacing: 4, margin: 0 }}>
					SYNTHETERIA
				</h1>
				{isLoading ? (
					<p style={{ margin: 0 }}>{loadingLabel}</p>
				) : (
					<div style={{ display: "flex", gap: 16 }}>
						<button
							type="button"
							data-testid="title-new_game"
							onClick={() => handleNewGame(createNewGameConfig(42))}
							style={{
								padding: "12px 24px",
								fontSize: 16,
								background: "#1a3a4a",
								color: "#8be6ff",
								border: "1px solid #2a5a6a",
								borderRadius: 4,
								cursor: "pointer",
							}}
						>
							New Game
						</button>
						<button
							type="button"
							data-testid="title-load_game"
							onClick={handleContinueGame}
							style={{
								padding: "12px 24px",
								fontSize: 16,
								background: "#1a3a4a",
								color: "#8be6ff",
								border: "1px solid #2a5a6a",
								borderRadius: 4,
								cursor: "pointer",
							}}
						>
							Continue
						</button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			style={{ position: "fixed", inset: 0 }}
			{...(sceneReady ? { "data-testid": "game-scene-ready" } : {})}
		>
			<GameSceneR3F onSceneReady={() => setSceneReady(true)} />
			{sceneReady && <GameHUDDom onQuit={handleQuitToTitle} />}
			{!sceneReady && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(3,3,8,0.8)",
						color: "#8be6ff",
						fontSize: 18,
					}}
				>
					Stabilizing structural feed
				</div>
			)}
		</div>
	);
}

export function App() {
	return (
		<WorldProvider world={world}>
			<AppInner />
		</WorldProvider>
	);
}
