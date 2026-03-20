/**
 * App — thin React root component.
 *
 * Follows the Koota pattern: App renders renderers + frameloop + startup.
 * Owns the phase state machine and DOM overlay composition.
 * All game logic lives in systems; all session lifecycle in session.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { playSfx } from "../audio/sfx";
import { TILE_SIZE_M } from "../board/grid";
import { getCameraControls } from "../camera/cameraStore";
import { PLAYER_MAX_AP } from "../config/gameDefaults";
import { createSqlJsAdapter } from "../db/adapter";
import { GameRepo } from "../db/gameRepo";
import { runMigrations } from "../db/migrations";
import type { GameSummary } from "../db/types";
import type { GameOutcome } from "../systems";
import {
	_resetVictory,
	advanceTurn,
	collectTurnSummary,
	getCurrentTurn,
	getGameOutcome,
	getPlayerResources,
	getPopCap,
	getPopulation,
	getVictoryProgress,
	pushToast,
	resetTurnSummary,
} from "../systems";
import { UnitFaction, UnitPos } from "../traits";
import { Globe } from "../ui/Globe";
import { EventBus } from "../views/eventBus";
// Side-effect import: register radial menu providers at module scope
import "../systems/radial";
// --- Game DOM overlays ---
import { AlertBar } from "../ui/game/AlertBar";
import { DiplomacyOverlay } from "../ui/game/DiplomacyOverlay";
import { EntityTooltip } from "../ui/game/EntityTooltip";
import { GameOutcomeOverlay } from "../ui/game/GameOutcomeOverlay";
import { GarageModal } from "../ui/game/GarageModal";
import { HUD } from "../ui/game/HUD";
import { KeybindHints } from "../ui/game/KeybindHints";
import { Minimap } from "../ui/game/Minimap";
import { PauseMenu } from "../ui/game/PauseMenu";
import {
	collectPendingItems,
	PendingCompletions,
} from "../ui/game/PendingCompletions";
import { RadialMenu } from "../ui/game/RadialMenu";
import { SelectedInfo } from "../ui/game/SelectedInfo";
import { SystemToasts } from "../ui/game/SystemToasts";
import { TechTreeOverlay } from "../ui/game/TechTreeOverlay";
import { ToastStack } from "../ui/game/ToastStack";
import { TurnLog } from "../ui/game/TurnLog";
import { TurnPhaseOverlay } from "../ui/game/TurnPhaseOverlay";
import { TurnSummaryPanel } from "../ui/game/TurnSummaryPanel";
import { TutorialOverlay } from "../ui/game/TutorialOverlay";
import { UnitRosterOverlay } from "../ui/game/UnitRosterOverlay";
import { LandingScreen } from "../ui/landing/LandingScreen";
import type { NewGameConfig } from "../world/config";
import { getPlayerFactionId } from "../world/config";
import { CommandBar } from "./CommandBar";
import { installDebugBridge } from "./debug";
import { GameBoard } from "./GameBoard";
import { hmrState } from "./hmrState";
import {
	getCurrentResearchForHUD,
	getProductionQueue,
	readPlayerAp,
} from "./hudData";
import { createNewGame, loadGame, saveGame } from "./session";
import type { GameSession, Phase } from "./types";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_SAVE_INTERVAL = 3;

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
	const [phase, _setPhase] = useState<Phase>(hmrState.phase);
	const [session, _setSession] = useState<GameSession | null>(hmrState.session);
	const [sceneReady, setSceneReady] = useState(hmrState.session !== null);
	const [selectedUnitId, _setSelectedUnitId] = useState<number | null>(
		hmrState.selectedUnitId,
	);
	const [turn, _setTurn] = useState(hmrState.turn);
	const [playerAp, setPlayerAp] = useState(
		hmrState.session ? readPlayerAp(hmrState.session.world) : PLAYER_MAX_AP,
	);
	const [gameOutcome, setGameOutcome] = useState<GameOutcome>({
		result: "playing",
	});
	const [savedGames, setSavedGames] = useState<GameSummary[]>([]);
	const [isObserverMode, _setIsObserverMode] = useState(
		hmrState.isObserverMode,
	);
	const [observerSpeed, _setObserverSpeed] = useState(hmrState.observerSpeed);
	const [paused, setPaused] = useState(false);
	// Delay GameBoard mount by one frame after Globe unmounts to avoid WebGL context conflict
	const [gameBoardMounted, setGameBoardMounted] = useState(false);
	const [showTechTree, setShowTechTree] = useState(false);
	const [showGarage, setShowGarage] = useState(false);
	const [showRoster, setShowRoster] = useState(false);
	const [showDiplomacy, setShowDiplomacy] = useState(false);
	const repoRef = useRef<GameRepo | null>(null);
	const sessionRef = useRef<GameSession | null>(null);
	sessionRef.current = session;

	// HMR-aware setters
	const setPhase = useCallback((p: Phase) => {
		hmrState.phase = p;
		_setPhase(p);
	}, []);
	const setSession = useCallback((s: GameSession | null) => {
		hmrState.session = s;
		_setSession(s);
	}, []);
	const setSelectedUnitId = useCallback((id: number | null) => {
		hmrState.selectedUnitId = id;
		_setSelectedUnitId(id);
	}, []);
	const setTurn = useCallback((t: number) => {
		hmrState.turn = t;
		_setTurn(t);
	}, []);
	const setIsObserverMode = useCallback((v: boolean) => {
		hmrState.isObserverMode = v;
		_setIsObserverMode(v);
	}, []);
	const setObserverSpeed = useCallback((v: number) => {
		hmrState.observerSpeed = v;
		_setObserverSpeed(v);
	}, []);

	// ─── Save helper ─────────────────────────────────────────────────────
	const doSave = useCallback(async () => {
		const repo = repoRef.current;
		const s = sessionRef.current;
		if (!repo || !s) return;
		await saveGame(s, repo);
	}, []);

	// ─── DB init ─────────────────────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;
		async function init() {
			try {
				const db = await createSqlJsAdapter();
				await runMigrations(db);
				if (cancelled) return;
				const repo = new GameRepo(db);
				repoRef.current = repo;
				if (!cancelled) setSavedGames(await repo.listGames());
			} catch (err) {
				console.warn("[app] DB init failed (non-fatal):", err);
			}
		}
		void init();
		return () => {
			cancelled = true;
		};
	}, []);

	// Save on tab close
	useEffect(() => {
		const handleBeforeUnload = () => {
			if (sessionRef.current && repoRef.current) void doSave();
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [doSave]);

	// ─── Start / Load ────────────────────────────────────────────────────
	const handleStartGame = useCallback(
		async (cfg: NewGameConfig) => {
			setPhase("generating");
			const s = await createNewGame(cfg, repoRef.current);
			if (repoRef.current) setSavedGames(await repoRef.current.listGames());
			setGameOutcome({ result: "playing" });
			setSession(s);
			setTurn(1);
			setPlayerAp(readPlayerAp(s.world));
			setSceneReady(false);
			setIsObserverMode(getPlayerFactionId(cfg) === null);
			setObserverSpeed(1);
		},
		[setPhase, setSession, setTurn, setIsObserverMode, setObserverSpeed],
	);

	const handleLoadGame = useCallback(
		async (gameId: string) => {
			const repo = repoRef.current;
			if (!repo) return;
			setPhase("generating");
			try {
				const s = await loadGame(gameId, repo);
				if (!s) {
					setPhase("title");
					return;
				}
				setGameOutcome({ result: "playing" });
				setSession(s);
				setTurn(getCurrentTurn(s.world));
				setPlayerAp(readPlayerAp(s.world));
				setSceneReady(false);
				const hasPlayer = s.newGameConfig
					? (s.newGameConfig.factions?.some((f) => f.role === "player") ?? true)
					: true;
				setIsObserverMode(!hasPlayer);
				setObserverSpeed(1);
			} catch (err) {
				console.warn("[app] Load game failed:", err);
				setPhase("title");
			}
		},
		[setPhase, setSession, setTurn, setIsObserverMode, setObserverSpeed],
	);

	// ─── End turn ────────────────────────────────────────────────────────
	const observerFactionIdx = useRef(0);

	const handleEndTurn = useCallback(() => {
		if (!session) return;
		playSfx("turn_advance");
		advanceTurn(session.world, session.board, { observerMode: isObserverMode });
		EventBus.emit("turn-advanced");
		const currentTurn = getCurrentTurn(session.world);
		setTurn(currentTurn);
		setPlayerAp(readPlayerAp(session.world));

		// Pan camera to player centroid (or observer rotation)
		const cam = getCameraControls();
		if (cam) {
			if (!isObserverMode) {
				let sumX = 0,
					sumZ = 0,
					count = 0;
				for (const e of session.world.query(UnitPos, UnitFaction)) {
					const f = e.get(UnitFaction);
					if (!f || (f.factionId !== "player" && f.factionId !== "")) continue;
					const p = e.get(UnitPos);
					if (!p) continue;
					sumX += p.tileX;
					sumZ += p.tileZ;
					count++;
				}
				if (count > 0)
					cam.panTo((sumX / count) * TILE_SIZE_M, (sumZ / count) * TILE_SIZE_M);
			} else {
				const factionUnits = new Map<
					string,
					{ sumX: number; sumZ: number; count: number }
				>();
				for (const e of session.world.query(UnitPos, UnitFaction)) {
					const f = e.get(UnitFaction);
					const p = e.get(UnitPos);
					if (!f || !p || !f.factionId) continue;
					const entry = factionUnits.get(f.factionId) ?? {
						sumX: 0,
						sumZ: 0,
						count: 0,
					};
					entry.sumX += p.tileX;
					entry.sumZ += p.tileZ;
					entry.count++;
					factionUnits.set(f.factionId, entry);
				}
				const factionIds = Array.from(factionUnits.keys());
				if (factionIds.length > 0) {
					const idx = observerFactionIdx.current % factionIds.length;
					const fid = factionIds[idx]!;
					const entry = factionUnits.get(fid)!;
					cam.panTo(
						(entry.sumX / entry.count) * TILE_SIZE_M,
						(entry.sumZ / entry.count) * TILE_SIZE_M,
					);
					observerFactionIdx.current = idx + 1;
				}
			}
		}

		const { milestones } = collectTurnSummary(
			session.world,
			session.board,
			currentTurn,
		);
		for (const m of milestones)
			pushToast("system", m.factionName, m.message, 5000);

		const outcome = getGameOutcome();
		setGameOutcome(outcome);
		if (outcome.result === "victory") playSfx("victory");
		else if (outcome.result === "defeat") playSfx("defeat");

		if (
			currentTurn % AUTO_SAVE_INTERVAL === 0 ||
			outcome.result !== "playing"
		) {
			void doSave();
		}
	}, [session, doSave, isObserverMode, setTurn]);

	// Globe animation → "playing"
	const handleTransitionComplete = useCallback(() => {
		if (hmrState.phase === "generating") setPhase("playing");
	}, [setPhase]);

	const handleReturnToMenu = useCallback(() => {
		_resetVictory();
		setGameOutcome({ result: "playing" });
		setSession(null);
		setSceneReady(false);
		setSelectedUnitId(null);
		setTurn(1);
		setPlayerAp(PLAYER_MAX_AP);
		setPaused(false);
		setPhase("title");
	}, [setPhase, setSession, setSelectedUnitId, setTurn]);

	// Observer auto-advance
	useEffect(() => {
		if (
			!isObserverMode ||
			!session ||
			!sceneReady ||
			gameOutcome.result !== "playing"
		)
			return;
		const ms = 2000 / observerSpeed;
		const id = setInterval(() => handleEndTurn(), ms);
		return () => clearInterval(id);
	}, [
		isObserverMode,
		observerSpeed,
		session,
		sceneReady,
		gameOutcome.result,
		handleEndTurn,
	]);

	// Keyboard shortcuts
	useKeyboardShortcuts({
		phase,
		sceneReady,
		paused,
		selectedUnitId,
		session,
		sessionRef,
		setPaused,
		setSelectedUnitId,
		handleEndTurn,
	});

	// Debug bridge
	useEffect(() => {
		if (!session) return;
		installDebugBridge({
			phase,
			turn,
			playerAp,
			selectedUnitId,
			isObserverMode,
			observerSpeed,
			getWorld: () => session?.world ?? null,
			selectUnit: setSelectedUnitId,
			endTurn: handleEndTurn,
			setObserverSpeed,
			boardWidth: session.config.width,
			boardHeight: session.config.height,
		});
	});

	// Wait one frame after phase becomes "playing" before mounting GameBoard.
	// This lets Globe's R3F Canvas unmount and release its WebGL context first.
	useEffect(() => {
		if (phase === "playing") {
			const raf = requestAnimationFrame(() => setGameBoardMounted(true));
			return () => {
				cancelAnimationFrame(raf);
			};
		}
		setGameBoardMounted(false);
	}, [phase]);

	const gameActive = phase === "playing" && session !== null && sceneReady;

	return (
		<div
			data-testid="app-root"
			style={{
				width: "100vw",
				height: "100vh",
				overflow: "hidden",
				background: "#030308",
			}}
		>
			{/* Globe: title/setup/generating phases (R3F landing animation) */}
			{phase !== "playing" && (
				<Globe
					phase={phase}
					config={session?.config}
					board={session?.board}
					world={session?.world}
					selectedUnitId={selectedUnitId}
					onSelect={setSelectedUnitId}
					onSceneReady={() => setSceneReady(true)}
					onTransitionComplete={handleTransitionComplete}
					turn={turn}
					focusTileX={session?.spawnTile?.x}
					focusTileZ={session?.spawnTile?.z}
					stormProfile={session?.newGameConfig?.stormProfile}
				/>
			)}

			{/* GameBoard: playing phase (Phaser + enable3d), delayed one frame for WebGL context release */}
			{phase === "playing" && gameBoardMounted && session && (
				<GameBoard
					session={session}
					onSceneReady={() => setSceneReady(true)}
					onTileClick={(x, z) => {
						// TODO: wire to radial menu / move system
					}}
					onUnitSelect={setSelectedUnitId}
				/>
			)}

			{/* Title / Setup: landing screen */}
			{(phase === "title" ||
				phase === "setup" ||
				(phase === "playing" && !sceneReady)) && (
				<LandingScreen
					onStartGame={handleStartGame}
					onLoadGame={handleLoadGame}
					savedGames={savedGames}
				/>
			)}

			{/* Generating overlay */}
			{phase === "generating" && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontFamily: "ui-monospace, monospace",
						color: "rgba(139,230,255,0.6)",
						fontSize: 13,
						letterSpacing: "0.2em",
						pointerEvents: "none",
					}}
				>
					GENERATING...
				</div>
			)}

			{/* Playing: Game DOM overlays */}
			{gameActive && (
				<HUD
					turn={turn}
					ap={playerAp}
					maxAp={PLAYER_MAX_AP}
					onEndTurn={handleEndTurn}
					onSave={() => void doSave()}
					resources={getPlayerResources(session.world)}
					productionQueue={getProductionQueue(session.world)}
					victoryProgress={getVictoryProgress(session.world)}
					population={getPopulation(session.world, "player")}
					popCap={getPopCap(session.world, "player")}
					isObserverMode={isObserverMode}
					observerSpeed={observerSpeed}
					onSetObserverSpeed={setObserverSpeed}
					currentResearch={getCurrentResearchForHUD(session.world)}
				/>
			)}

			{gameActive && !isObserverMode && (
				<CommandBar
					showTechTree={showTechTree}
					showGarage={showGarage}
					showRoster={showRoster}
					showDiplomacy={showDiplomacy}
					onToggle={(key) => {
						setShowTechTree(key === "techTree");
						setShowGarage(key === "garage");
						setShowRoster(key === "roster");
						setShowDiplomacy(key === "diplomacy");
					}}
				/>
			)}

			{gameActive && showTechTree && (
				<TechTreeOverlay
					world={session.world}
					factionId="player"
					onClose={() => setShowTechTree(false)}
				/>
			)}
			{gameActive && showGarage && (
				<GarageModal
					world={session.world}
					factionId="player"
					onClose={() => setShowGarage(false)}
				/>
			)}
			{gameActive && showRoster && (
				<UnitRosterOverlay
					world={session.world}
					factionId="player"
					onClose={() => setShowRoster(false)}
					onSelectUnit={(id) => {
						setSelectedUnitId(id);
						setShowRoster(false);
					}}
				/>
			)}
			{gameActive && showDiplomacy && (
				<DiplomacyOverlay
					world={session.world}
					factionId="player"
					onClose={() => setShowDiplomacy(false)}
				/>
			)}

			{gameActive && <AlertBar />}
			{gameActive && !isObserverMode && (
				<PendingCompletions items={collectPendingItems(session.world)} />
			)}
			{gameActive && !isObserverMode && <TurnSummaryPanel />}
			{gameActive && (
				<PauseMenu
					visible={paused}
					onResume={() => setPaused(false)}
					onSave={() => void doSave()}
					onQuitToTitle={handleReturnToMenu}
				/>
			)}
			{gameActive && gameOutcome.result !== "playing" && (
				<GameOutcomeOverlay
					outcome={gameOutcome}
					turn={turn}
					onReturnToMenu={handleReturnToMenu}
				/>
			)}
			{gameActive && (
				<>
					<TurnLog />
					{session.world && session.board && (
						<Minimap world={session.world} board={session.board} />
					)}
					<RadialMenu />
					<KeybindHints />
					<SystemToasts />
					<ToastStack />
					<TurnPhaseOverlay />
					<TutorialOverlay turn={turn} />
					<EntityTooltip />
					{session.world && (
						<SelectedInfo
							world={session.world}
							selectedUnitId={selectedUnitId ?? null}
						/>
					)}
				</>
			)}
		</div>
	);
}
