/**
 * Syntheteria — FPS Factory Planet
 *
 * You wake up as a broken robot on the surface of a machine planet.
 * No narration walls. No click-through text. You just... wake up.
 *
 * App is a lightweight shell: title screen and pregame load instantly,
 * the heavy 3D scene is lazy-loaded only when the player starts.
 */

import {
	lazy,
	Suspense,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { getSnapshot, subscribe } from "./ecs/gameState";
import { phraseToSeed } from "./ecs/seed";
import { initFromConfig, type NewGameConfig } from "./systems/newGameInit";
import { registerAllSystems } from "./systems/registerSystems";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { LoadingScreen } from "./ui/LoadingScreen";
import { PauseMenu } from "./ui/PauseMenu";
import type { PregameConfig } from "./ui/PregameScreen";
import { PregameScreen } from "./ui/PregameScreen";
import { TitleScreen } from "./ui/TitleScreen";

// Lazy-load the entire 3D scene — keeps title/pregame bundle tiny.
// Vite creates a separate chunk for GameScene + all its Three.js dependencies.
const GameScene = lazy(() => import("./GameScene"));

/**
 * Convert PregameConfig from the UI into NewGameConfig for the init system.
 */
function toNewGameConfig(config: PregameConfig): NewGameConfig {
	const sizeMap: Record<string, number> = {
		small: 100,
		medium: 200,
		large: 400,
	};

	return {
		playerRace: config.faction,
		mapSize: sizeMap[config.mapSettings.mapSize] ?? 200,
		mapType: "standard",
		aiOpponents: config.opponents.map((o) => o.faction),
		difficulty: "normal",
	};
}

export default function App() {
	const [phase, setPhase] = useState<
		"title" | "pregame" | "loading" | "playing"
	>("title");
	const pendingSeedRef = useRef<number>(42);
	const pendingConfigRef = useRef<PregameConfig | null>(null);

	// Title screen "New Game" → go to pregame config
	const handleNewGame = () => {
		setPhase("pregame");
	};

	// Pregame "Start Game" → transition to loading, then play
	const handlePregameStart = (config: PregameConfig) => {
		const seed = phraseToSeed(config.mapSettings.seedPhrase) ?? 42;
		pendingSeedRef.current = seed;
		pendingConfigRef.current = config;
		setPhase("loading");
	};

	// Pregame "Back" → return to title
	const handlePregameBack = () => {
		setPhase("title");
	};

	// Run initialization during LOADING phase
	useEffect(() => {
		if (phase !== "loading") return;

		const config = pendingConfigRef.current;
		if (!config) {
			setPhase("playing");
			return;
		}

		// Run the 12-step init sequence, then transition to playing.
		// Uses requestAnimationFrame to let the loading screen render first.
		const raf = requestAnimationFrame(() => {
			const gameConfig = toNewGameConfig(config);
			const result = initFromConfig(gameConfig);

			if (!result.success) {
				console.error("[newGameInit] Initialization failed:", result.errors);
			}

			// Register all systems into the orchestrator after world init
			registerAllSystems();

			setPhase("playing");
		});

		return () => cancelAnimationFrame(raf);
	}, [phase]);

	if (phase === "title") {
		return (
			<TitleScreen
				onNewGame={handleNewGame}
				onContinue={() => setPhase("playing")}
			/>
		);
	}

	if (phase === "pregame") {
		return (
			<PregameScreen onStart={handlePregameStart} onBack={handlePregameBack} />
		);
	}

	if (phase === "loading") {
		return <LoadingScreen />;
	}

	return (
		<ErrorBoundary>
			<PlayingView onQuitToTitle={() => setPhase("title")} />
		</ErrorBoundary>
	);
}

// ---------------------------------------------------------------------------
// Playing view — GameScene + PauseMenu overlay
// ---------------------------------------------------------------------------

function PlayingView({ onQuitToTitle }: { onQuitToTitle: () => void }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<Suspense fallback={<LoadingScreen />}>
			<GameScene />
			{snap.paused && <PauseMenu onQuitToTitle={onQuitToTitle} />}
		</Suspense>
	);
}
