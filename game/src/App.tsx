/**
 * Syntheteria — FPS Factory Planet
 *
 * You wake up as a broken robot on the surface of a machine planet.
 * No narration walls. No click-through text. You just... wake up.
 *
 * App is a lightweight shell: title screen and pregame load instantly,
 * the heavy 3D scene is lazy-loaded only when the player starts.
 */

import { lazy, Suspense, useRef, useState } from "react";
import { phraseToSeed } from "./ecs/seed";
import type { PregameConfig } from "./ui/PregameScreen";
import { PregameScreen } from "./ui/PregameScreen";
import { TitleScreen } from "./ui/TitleScreen";
import { LoadingScreen } from "./ui/LoadingScreen";

// Lazy-load the entire 3D scene — keeps title/pregame bundle tiny.
// Vite creates a separate chunk for GameScene + all its Three.js dependencies.
const GameScene = lazy(() => import("./GameScene"));

export default function App() {
	const [phase, setPhase] = useState<"title" | "pregame" | "playing">("title");
	const pendingSeedRef = useRef<number>(42);

	// Title screen "New Game" → go to pregame config
	const handleNewGame = (_seed: number) => {
		setPhase("pregame");
	};

	// Pregame "Start Game" → initialize world and play
	const handlePregameStart = (config: PregameConfig) => {
		const seed = phraseToSeed(config.mapSettings.seedPhrase) ?? 42;
		pendingSeedRef.current = seed;
		setPhase("playing");
	};

	// Pregame "Back" → return to title
	const handlePregameBack = () => {
		setPhase("title");
	};

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

	return (
		<Suspense fallback={<LoadingScreen />}>
			<GameScene seed={pendingSeedRef.current} />
		</Suspense>
	);
}
