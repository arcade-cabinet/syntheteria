/**
 * App root — 4-phase state machine.
 *
 * landing       → user opens New Game modal or resumes a saved game
 * generating    → board generation + ECS init + DB write (async)
 * game          → R3F canvas with board + units + click-to-move
 *
 * Phase "generating" is intentionally a brief loading state so the user
 * sees a smooth transition rather than a frame of missing data.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Debug bridge — exposed as window.__syntheteria for Playwright E2E specs.
// Only active in development. Never used in game logic.
declare global {
	interface Window {
		__syntheteria?: {
			phase: string;
			turn: number;
			playerAp: number;
			selectedUnitId: number | null;
			getWorld: () => import("./ecs/world").WorldType | null;
		};
	}
}

import { createWorld } from "koota";
import { generateBoard } from "./board/generator";
import type { BoardConfig, GeneratedBoard } from "./board/types";
import { PLAYER_MAX_AP } from "./config/gameDefaults";
import { createSqlJsAdapter } from "./db/adapter";
import { GameRepo } from "./db/gameRepo";
import { runMigrations } from "./db/migrations";
import type { GameSummary } from "./db/types";
import { initWorldFromBoard } from "./ecs/init";
import { advanceTurn, getCurrentTurn } from "./ecs/systems/turnSystem";
import { UnitFaction, UnitStats } from "./ecs/traits/unit";
import type { WorldType } from "./ecs/world";
import { GameScreen } from "./ui/game/GameScreen";
import { HUD } from "./ui/game/HUD";
import { LandingScreen } from "./ui/landing/LandingScreen";

type AppPhase = "landing" | "generating" | "game";

type GameSession = {
	config: BoardConfig;
	gameId: string;
	board: GeneratedBoard;
	world: WorldType;
};

export function AppVite() {
	const [phase, setPhase] = useState<AppPhase>("landing");
	const [session, setSession] = useState<GameSession | null>(null);
	const [sceneReady, setSceneReady] = useState(false);
	const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
	const [turn, setTurn] = useState(1);
	const [playerAp, setPlayerAp] = useState(PLAYER_MAX_AP);
	const [savedGames, setSavedGames] = useState<GameSummary[]>([]);
	const repoRef = useRef<GameRepo | null>(null);

	// Initialize DB on mount — needed to show existing saves on the landing screen.
	useEffect(() => {
		let cancelled = false;

		async function initDb() {
			try {
				const db = await createSqlJsAdapter();
				await runMigrations(db);
				if (cancelled) return;
				const repo = new GameRepo(db);
				repoRef.current = repo;
				const games = await repo.listGames();
				if (!cancelled) setSavedGames(games);
			} catch (err) {
				console.warn("[AppVite] DB init failed (non-fatal):", err);
			}
		}

		void initDb();
		return () => {
			cancelled = true;
		};
	}, []);

	function readPlayerAp(world: WorldType): number {
		for (const entity of world.query(UnitFaction, UnitStats)) {
			const faction = entity.get(UnitFaction);
			const stats = entity.get(UnitStats);
			if (faction?.factionId === "player" && stats) return stats.ap;
		}
		return PLAYER_MAX_AP;
	}

	const handleStartGame = useCallback(async (config: BoardConfig) => {
		setPhase("generating");

		const board = generateBoard(config);
		const world = createWorld();
		initWorldFromBoard(world, board);

		let gameId: string = crypto.randomUUID();
		const repo = repoRef.current;
		if (repo) {
			try {
				gameId = await repo.createGame(
					config.seed,
					config.width,
					config.height,
					config.difficulty,
				);
				const flatTiles = board.tiles.flat().map((t) => ({
					gameId,
					x: t.x,
					z: t.z,
					zone: t.zone,
					elevation: t.elevation,
					passable: t.passable,
				}));
				void repo.saveTiles(gameId, flatTiles);
				// Refresh saves list
				const games = await repo.listGames();
				setSavedGames(games);
			} catch (err) {
				console.warn("[AppVite] DB write failed (non-fatal):", err);
			}
		}

		setSession({ config, gameId, board, world });
		setTurn(1);
		setPlayerAp(readPlayerAp(world));
		setSceneReady(false);
		setPhase("game");
	}, []);

	const handleLoadGame = useCallback(async (gameId: string) => {
		const repo = repoRef.current;
		if (!repo) return;

		setPhase("generating");
		try {
			const record = await repo.getGame(gameId);
			if (!record) {
				setPhase("landing");
				return;
			}

			const config: BoardConfig = {
				width: record.boardW,
				height: record.boardH,
				seed: record.seed,
				difficulty: record.difficulty,
			};

			const board = generateBoard(config);
			const world = createWorld();
			initWorldFromBoard(world, board);

			setSession({ config, gameId, board, world });
			setTurn(record.turn);
			setPlayerAp(readPlayerAp(world));
			setSceneReady(false);
			setPhase("game");
		} catch (err) {
			console.warn("[AppVite] Load game failed:", err);
			setPhase("landing");
		}
	}, []);

	const handleEndTurn = useCallback(() => {
		if (!session) return;
		advanceTurn(session.world);
		const newTurn = getCurrentTurn(session.world);
		setTurn(newTurn);
	}, [session]);

	// Keep window.__syntheteria in sync so Playwright can read live game state.
	useEffect(() => {
		window.__syntheteria = {
			phase,
			turn,
			playerAp,
			selectedUnitId,
			getWorld: () => session?.world ?? null,
		};
	});

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
			{/* R3F Canvas layer (always below DOM UI) */}
			{phase === "game" && session && (
				<GameScreen
					config={session.config}
					gameId={session.gameId}
					board={session.board}
					world={session.world}
					selectedUnitId={selectedUnitId}
					onSelect={setSelectedUnitId}
					onSceneReady={() => setSceneReady(true)}
				/>
			)}

			{/* HUD overlay — mounted over canvas */}
			{phase === "game" && session && sceneReady && (
				<HUD
					turn={turn}
					ap={playerAp}
					maxAp={PLAYER_MAX_AP}
					onEndTurn={handleEndTurn}
				/>
			)}

			{/* Loading/generating state */}
			{phase === "generating" && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
						color: "rgba(139,230,255,0.6)",
						fontSize: 13,
						letterSpacing: "0.2em",
					}}
				>
					GENERATING...
				</div>
			)}

			{/* Landing screen + modal (visible until scene is ready) */}
			{(phase === "landing" || (phase === "game" && !sceneReady)) && (
				<LandingScreen
					onStartGame={handleStartGame}
					onLoadGame={handleLoadGame}
					savedGames={savedGames}
				/>
			)}
		</div>
	);
}
