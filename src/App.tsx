/**
 * Syntheteria — Phase 1 Prototype
 * Opening narration → world initialization → gameplay.
 * In-game phase transitions trigger narrative overlays during gameplay.
 * 3D canvas rendered via BabylonJS + Reactylon (GameCanvas).
 */

import type { Entity } from "koota";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
	disposeAudio,
	initAudio,
	startAmbience,
	startMusic,
	stopAmbience,
	stopMusic,
} from "./audio";
import type { DialogueSequence } from "./config/narrativeDefs";
import {
	EXPANSION_SEQUENCE,
	INTRO_SEQUENCE,
	WAR_SEQUENCE,
} from "./config/narrativeDefs";
import type { GamePhaseId } from "./config/phaseDefs";
import { initPersistence } from "./db/persistence";
import { createWebAdapter } from "./db/webAdapter";
import { getRooms, initCityLayout } from "./ecs/cityLayout";
import {
	spawnFabricationUnit,
	spawnLightningRod,
	spawnUnit,
} from "./ecs/factory";
import {
	getSnapshot,
	isPaused,
	setGameConfig,
	simulationTick,
	subscribe,
	togglePause,
} from "./ecs/gameState";
import { Faction, Fragment, Unit } from "./ecs/traits";
import { world } from "./ecs/world";
import { logError } from "./errors";
import { GameCanvas } from "./game/GameCanvas";
import { foundBase } from "./systems/baseManagement";
import { DebugOverlay } from "./ui/game/DebugOverlay";
import { ErrorBoundary } from "./ui/game/ErrorBoundary";
import { NarrativeOverlay } from "./ui/game/NarrativeOverlay";
import { RadialMenu } from "./ui/game/RadialMenu";
import { LandingScreen, type NewGameConfig } from "./ui/landing/LandingScreen";
import { GameLayout } from "./ui/layout/GameLayout";

// --- Phase → Narrative sequence mapping ---

const PHASE_NARRATIVE: Partial<Record<GamePhaseId, DialogueSequence>> = {
	expansion: EXPANSION_SEQUENCE,
	war: WAR_SEQUENCE,
};

// --- World initialization ---

function initializeWorld(
	seed = "default",
	difficulty: "easy" | "normal" | "hard" = "normal",
): { startX: number; startZ: number } {
	// Store config for save/load
	setGameConfig(seed, difficulty);

	// Generate labyrinth board
	initCityLayout({ width: 48, height: 48, seed, difficulty });

	// Find the player start room to spawn units there
	const rooms = getRooms();
	const playerRoom = rooms.find((r) => r.tag === "player");
	const TILE_SIZE = 2.0;
	const startX = playerRoom
		? (playerRoom.x + playerRoom.w / 2) * TILE_SIZE
		: 48;
	const startZ = playerRoom
		? (playerRoom.z + playerRoom.h / 2) * TILE_SIZE
		: 62;

	// Bot 1: Has a working camera but broken arms.
	const bot1 = spawnUnit({
		x: startX - 2,
		z: startZ,
		displayName: "Bot Alpha",
		components: [
			{ name: "camera", functional: true, material: "electronic" },
			{ name: "arms", functional: false, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Bot 2: Has working arms but broken camera.
	spawnUnit({
		x: startX + 2,
		z: startZ,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		displayName: "Bot Beta",
		components: [
			{ name: "camera", functional: false, material: "electronic" },
			{ name: "arms", functional: true, material: "metal" },
			{ name: "legs", functional: true, material: "metal" },
			{ name: "power_cell", functional: true, material: "electronic" },
		],
	});

	// Fabrication unit in the player start room.
	spawnFabricationUnit({
		x: startX,
		z: startZ + 2,
		fragmentId: bot1.get(Fragment)!.fragmentId,
		powered: false,
		components: [
			{ name: "power_supply", functional: false, material: "electronic" },
			{ name: "fabrication_arm", functional: true, material: "metal" },
			{ name: "material_hopper", functional: true, material: "metal" },
		],
	});

	// Lightning rod in the player start room.
	spawnLightningRod({
		x: startX - 3,
		z: startZ + 2,
		fragmentId: bot1.get(Fragment)!.fragmentId,
	});

	// Pre-place cult bases in enemy territory (northern zone)
	// Enemy zone is nz < 0.25 → tiles z < 0.25 * 256 = 64, x spread across width
	const CULT_BASES = [
		{ tileX: 50, tileZ: 20, name: "Cult Stronghold Alpha" },
		{ tileX: 150, tileZ: 30, name: "Cult Outpost Beta" },
		{ tileX: 100, tileZ: 10, name: "Cult Citadel Gamma" },
	];
	for (const cb of CULT_BASES) {
		try {
			foundBase(world, cb.tileX, cb.tileZ, "cultist", cb.name);
		} catch (e) {
			// Non-fatal: cult base placement may fail if too close to each other
			console.warn("[init] cult base placement failed:", cb.name, e);
		}
	}

	// Initial exploration tick so terrain is visible
	simulationTick();

	return { startX, startZ };
}

// --- Main App ---

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
		difficulty: "normal",
	});
	const wasPausedRef = useRef(false);
	const [startPos, setStartPos] = useState<{ x: number; z: number } | null>(
		null,
	);
	const [radialMenu, setRadialMenu] = useState<{
		entity: Entity;
		screenX: number;
		screenY: number;
	} | null>(null);

	// Watch game snapshot for phase transitions during gameplay
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	// Detect in-game phase transitions and show narrative overlay
	useEffect(() => {
		if (phase !== "playing") return;
		if (phaseNarrative) return; // already showing a narrative

		const transitionId = snap.phaseTransitionId;
		if (!transitionId) return;

		const sequence = PHASE_NARRATIVE[transitionId];
		if (!sequence) return;

		// Pause the game and show the narrative overlay
		wasPausedRef.current = isPaused();
		if (!isPaused()) {
			togglePause();
		}
		setPhaseNarrative(sequence);
	}, [phase, snap.phaseTransitionId, phaseNarrative]);

	// Initialize persistence layer (non-fatal — game works without it)
	useEffect(() => {
		createWebAdapter()
			.then((adapter) => initPersistence(adapter))
			.catch((e) => {
				// Non-fatal: save/load will be unavailable
				console.warn("[persistence] DB init failed, save/load unavailable:", e);
			});
	}, []);

	// Cleanup audio on unmount
	useEffect(() => {
		return () => {
			stopAmbience();
			stopMusic();
			disposeAudio();
		};
	}, []);

	// Global handler for uncaught errors and unhandled rejections
	useEffect(() => {
		const onError = (event: ErrorEvent) => {
			logError(event.error ?? event.message);
		};
		const onRejection = (event: PromiseRejectionEvent) => {
			logError(event.reason);
		};
		window.addEventListener("error", onError);
		window.addEventListener("unhandledrejection", onRejection);
		return () => {
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onRejection);
		};
	}, []);

	// Listen for radial menu events from InputHandler
	useEffect(() => {
		function onRadialMenu(e: Event) {
			const { screenX, screenY } = (e as CustomEvent).detail;
			let selected: Entity | null = null;
			for (const entity of world.query(Unit, Faction)) {
				if (
					entity.get(Unit)!.selected &&
					entity.get(Faction)!.value === "player"
				) {
					selected = entity;
					break;
				}
			}
			if (selected) {
				setRadialMenu({ entity: selected, screenX, screenY });
			}
		}
		window.addEventListener("syntheteria:radialmenu", onRadialMenu);
		return () =>
			window.removeEventListener("syntheteria:radialmenu", onRadialMenu);
	}, []);

	if (phase === "title") {
		return (
			<LandingScreen
				onStartGame={(config: NewGameConfig) => {
					// Initialize audio on first user gesture (browser AudioContext policy)
					initAudio().catch((e) => {
						// Non-fatal: audio will be unavailable
						console.warn("[audio] init failed:", e);
					});
					gameConfigRef.current = config;
					setPhase("narration");
				}}
			/>
		);
	}

	if (phase === "narration") {
		return (
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
						startMusic(1); // Epoch 1: Emergence
					}
					setPhase("playing");
				}}
			/>
		);
	}

	// Wait for world initialization before rendering
	if (!startPos) return null;

	return (
		<ErrorBoundary>
			<div className="touch-none">
				<GameLayout>
					<GameCanvas
						havok={havok}
						startPos={startPos}
						seed={gameConfigRef.current.seed}
					/>

					{/* Floating overlays inside the game area */}
					<GameOverlays snap={snap} />
					<DebugOverlay />

					{/* Radial menu on right-click selected unit */}
					{radialMenu && (
						<RadialMenu
							entity={radialMenu.entity}
							screenX={radialMenu.screenX}
							screenY={radialMenu.screenY}
							onClose={() => setRadialMenu(null)}
						/>
					)}

					{/* In-game phase transition narrative overlay */}
					{phaseNarrative && (
						<NarrativeOverlay
							sequence={phaseNarrative}
							onComplete={() => {
								setPhaseNarrative(null);
								// Resume game if it wasn't paused before the transition
								if (!wasPausedRef.current && isPaused()) {
									togglePause();
								}
							}}
						/>
					)}
				</GameLayout>
			</div>
		</ErrorBoundary>
	);
}

// ─── Game overlays (combat notifications, merge events) ─────────────────────

import type { GameSnapshot } from "./ecs/gameState";

function GameOverlays({ snap }: { snap: GameSnapshot }) {
	return (
		<div className="absolute inset-0 pointer-events-none font-mono z-10">
			{/* Combat notifications */}
			{snap.combatEvents.length > 0 && (
				<div className="absolute top-20 right-20 bg-red-950/85 border border-red-500/40 rounded-lg px-3.5 py-2 text-[11px] text-red-400 max-w-[220px]">
					{snap.combatEvents.slice(0, 3).map((e) => (
						<div key={`${e.targetId}-${e.componentDamaged}`}>
							{e.targetDestroyed
								? `${e.targetId} DESTROYED`
								: `${e.targetId}: ${e.componentDamaged} damaged`}
						</div>
					))}
				</div>
			)}

			{/* Merge event notification */}
			{snap.mergeEvents.length > 0 && (
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-cyan-400 rounded-xl px-8 py-5 text-lg text-cyan-400 text-center">
					MAP FRAGMENTS MERGED
				</div>
			)}
		</div>
	);
}
