import {
	type ReactNode,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	disposeAudio,
	initAudio,
	startAmbience,
	startMusic,
	stopAmbience,
	stopMusic,
} from "../audio";
import type { DialogueSequence } from "../config/narrativeDefs";
import {
	EXPANSION_SEQUENCE,
	INTRO_SEQUENCE,
	WAR_SEQUENCE,
} from "../config/narrativeDefs";
import type { GamePhaseId } from "../config/phaseDefs";
import {
	type GameSnapshot,
	getSnapshot,
	isPaused,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import { reportFatalError } from "../errors";
import { GameCanvas } from "../game/GameCanvas";
import { popStoryTrigger } from "../systems/storyTriggers";
import { GameLayout } from "../views/game/GameLayout";
import { NarrativeOverlay } from "../views/game/NarrativeOverlay";
import { LandingScreen } from "../views/landing/LandingScreen";
import type { NewGameConfig } from "../views/landing/NewGameModal";
import { DebugOverlay } from "./DebugOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import { GameOverlays } from "./GameOverlays";
import { initializeWorld } from "./initializeWorld";

const PHASE_NARRATIVE: Partial<Record<GamePhaseId, DialogueSequence>> = {
	expansion: EXPANSION_SEQUENCE,
	war: WAR_SEQUENCE,
};

interface AppProps {
	havok: unknown;
}

export default function App({ havok }: AppProps) {
	const worldInitRef = useRef(false);
	const [phase, setPhase] = useState<"title" | "narration" | "playing">(
		"title",
	);
	const [phaseNarrative, setPhaseNarrative] = useState<DialogueSequence | null>(
		null,
	);
	const gameConfigRef = useRef<NewGameConfig>({
		seed: "default",
		gameplaySeed: "default-gameplay",
		difficulty: "normal",
		worldName: "Default World",
	});
	const wasPausedRef = useRef(false);
	const [startPos, setStartPos] = useState<{ x: number; z: number } | null>(
		null,
	);
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	// US-5.1: Phase transition narratives
	useEffect(() => {
		if (phase !== "playing" || phaseNarrative) return;

		const transitionId = snap.phaseTransitionId;
		if (!transitionId) return;

		const sequence = PHASE_NARRATIVE[transitionId];
		if (!sequence) return;

		wasPausedRef.current = isPaused();
		if (!isPaused()) {
			togglePause();
		}
		setPhaseNarrative(sequence);
	}, [phase, snap.phaseTransitionId, phaseNarrative]);

	// US-5.1: Story trigger narratives (exploration-triggered dialogue)
	useEffect(() => {
		if (phase !== "playing" || phaseNarrative) return;
		if (!snap.hasStoryTrigger) return;

		const sequence = popStoryTrigger();
		if (!sequence) return;

		wasPausedRef.current = isPaused();
		if (!isPaused()) {
			togglePause();
		}
		setPhaseNarrative(sequence);
	}, [phase, snap.hasStoryTrigger, phaseNarrative]);

	useEffect(() => {
		return () => {
			stopAmbience();
			stopMusic();
			disposeAudio();
		};
	}, []);

	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			reportFatalError(event.error ?? event.message);
		};
		const onRejection = (event: PromiseRejectionEvent) => {
			reportFatalError(event.reason);
		};
		window.addEventListener("error", onError);
		window.addEventListener("unhandledrejection", onRejection);
		return () => {
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onRejection);
		};
	}, []);

	let content: ReactNode = null;

	if (phase === "title") {
		content = (
			<LandingScreen
				onStartGame={(config) => {
					initAudio().catch((error) => {
						console.warn("[audio] init failed:", error);
					});
					gameConfigRef.current = config;
					setPhase("narration");
				}}
			/>
		);
	} else if (phase === "narration") {
		content = (
			<NarrativeOverlay
				sequence={INTRO_SEQUENCE}
				onComplete={() => {
					if (!worldInitRef.current) {
						worldInitRef.current = true;
						const cfg = gameConfigRef.current;
						const { startX, startZ } = initializeWorld(
							cfg.seed,
							cfg.difficulty,
						);
						setStartPos({ x: startX, z: startZ });
						startAmbience();
						startMusic(1);
					}
					setPhase("playing");
				}}
			/>
		);
	} else if (startPos) {
		content = (
			<div className="touch-none">
				<GameLayout>
					<GameCanvas
						havok={havok}
						startPos={startPos}
						seed={gameConfigRef.current.seed}
					/>
					<GameOverlays snap={snap as GameSnapshot} />
					<DebugOverlay />
					{phaseNarrative && (
						<NarrativeOverlay
							sequence={phaseNarrative}
							onComplete={() => {
								setPhaseNarrative(null);
								if (!wasPausedRef.current && isPaused()) {
									togglePause();
								}
							}}
						/>
					)}
				</GameLayout>
			</div>
		);
	}

	return <ErrorBoundary>{content}</ErrorBoundary>;
}
