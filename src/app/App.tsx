import {
	type ReactNode,
	useCallback,
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
import { selectBase } from "../components/base/BasePanel";
import type { DialogueSequence } from "../config/narrativeDefs";
import {
	EXPANSION_SEQUENCE,
	INTRO_SEQUENCE,
	VICTORY_SEQUENCE,
	WAR_SEQUENCE,
} from "../config/narrativeDefs";
import type { GamePhaseId } from "../config/phaseDefs";
import {
	type GameSnapshot,
	getSnapshot,
	isPaused,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import { reportFatalError } from "../errors";
import { GameCanvas } from "../game/GameCanvas";
import { deselectAll } from "../input/selection";
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

/** Speed presets mapped to number keys 1-4. */
const SPEED_KEYS: Record<string, number> = {
	"1": 0.5,
	"2": 1,
	"3": 2,
	"4": 4,
};

/** Duration of the phase transition fade in milliseconds. */
const PHASE_FADE_MS = 300;

export default function App() {
	const worldInitRef = useRef(false);
	const [phase, setPhase] = useState<"title" | "narration" | "playing">(
		"title",
	);
	const [fading, setFading] = useState(false);
	const pendingPhaseRef = useRef<"title" | "narration" | "playing" | null>(
		null,
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
	const victoryNarrativeShownRef = useRef(false);

	/** Transition to a new phase with a fade-out / fade-in. */
	const transitionTo = useCallback(
		(nextPhase: "title" | "narration" | "playing") => {
			pendingPhaseRef.current = nextPhase;
			setFading(true);
			setTimeout(() => {
				setPhase(nextPhase);
				pendingPhaseRef.current = null;
				// Allow a tick for the new content to mount before fading in
				requestAnimationFrame(() => setFading(false));
			}, PHASE_FADE_MS);
		},
		[],
	);

	// ── Keyboard shortcuts (active during gameplay) ──
	useEffect(() => {
		if (phase !== "playing") return;

		function handleKey(e: KeyboardEvent) {
			// Ignore key events when an input/textarea is focused
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

			if (e.key === " ") {
				e.preventDefault();
				togglePause();
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				deselectAll();
				selectBase(null);
				return;
			}

			const speed = SPEED_KEYS[e.key];
			if (speed !== undefined) {
				e.preventDefault();
				setGameSpeed(speed);
				return;
			}
		}

		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [phase]);

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

	// Victory narrative — show wormhole ending sequence on victory (Tier 5)
	useEffect(() => {
		if (phase !== "playing" || phaseNarrative) return;
		if (snap.gameOutcome !== "victory") return;
		if (victoryNarrativeShownRef.current) return;

		victoryNarrativeShownRef.current = true;
		wasPausedRef.current = isPaused();
		if (!isPaused()) {
			togglePause();
		}
		setPhaseNarrative(VICTORY_SEQUENCE);
	}, [phase, snap.gameOutcome, phaseNarrative]);

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
					transitionTo("narration");
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
					transitionTo("playing");
				}}
			/>
		);
	} else if (startPos) {
		content = (
			<div className="touch-none">
				<GameLayout>
					<GameCanvas startPos={startPos} seed={gameConfigRef.current.seed} />
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

	return (
		<ErrorBoundary>
			<div
				style={{
					opacity: fading ? 0 : 1,
					transition: `opacity ${PHASE_FADE_MS}ms ease-in-out`,
					width: "100%",
					height: "100%",
				}}
			>
				{content}
			</div>
		</ErrorBoundary>
	);
}
