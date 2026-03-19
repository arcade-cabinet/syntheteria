/**
 * Game session lifecycle — create, save, load.
 *
 * Pure async functions with no React dependency.
 * The app shell calls these; they return session data.
 */

import { createWorld } from "koota";
import type { BoardConfig, GeneratedBoard } from "../board/types";
import { generateBoard } from "../board/generator";
import type { WorldType } from "../create-world";
import { GameRepo } from "../db/gameRepo";
import {
	applyBuildings,
	applyExplored,
	applyResources,
	applyTurn,
	applyUnits,
	serializeBuildings,
	serializeExplored,
	serializeResources,
	serializeUnits,
} from "../db/serialize";
import { FACTION_DEFINITIONS } from "../factions/definitions";
import { initWorldFromBoard } from "../init-world";
import { randomUUID } from "../lib/uuid";
import { setPlayerFactionColor } from "../rendering/modelPaths";
import { getSpawnCenters } from "../robots/placement";
import { seedToPhrase } from "../seed";
import {
	collectCampaignStats,
	collectFactionResources,
	collectTurnSnapshot,
} from "../systems/analyticsCollector";
import {
	rehydrateCampaignStats,
	resetCampaignStats,
} from "../systems/campaignStats";
import { resetResourceDeltas } from "../systems/resourceDeltaSystem";
import {
	getCompletedTurnLogs,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "../systems/turnEventLog";
import { resetTurnSummary } from "../systems/turnSummary";
import { getCurrentTurn } from "../systems/turnSystem";
import { _resetTutorial } from "../systems/tutorialSystem";
import { _resetVictory } from "../systems/victorySystem";
import type {
	ClimateProfile,
	Difficulty,
	FactionSlot,
	NewGameConfig,
	StormProfile,
} from "../world/config";
import { getPlayerFactionId, SECTOR_SCALE_SPECS } from "../world/config";
import type { GameSession } from "./types";

// ─── Create ──────────────────────────────────────────────────────────────

export async function createNewGame(
	cfg: NewGameConfig,
	repo: GameRepo | null,
): Promise<GameSession> {
	const scaleSpec = SECTOR_SCALE_SPECS[cfg.sectorScale];
	const difficultyMap: Record<string, BoardConfig["difficulty"]> = {
		story: "easy",
		standard: "normal",
		hard: "hard",
	};
	const boardConfig: BoardConfig = {
		width: scaleSpec.width,
		height: scaleSpec.height,
		seed: seedToPhrase(cfg.worldSeed),
		difficulty: difficultyMap[cfg.difficulty] ?? "normal",
		climateProfile: cfg.climateProfile,
	};

	const playerFid = getPlayerFactionId(cfg);
	if (playerFid) {
		const pDef = FACTION_DEFINITIONS.find((f) => f.id === playerFid);
		if (pDef) setPlayerFactionColor(pDef.color);
	}

	const board = generateBoard(boardConfig);
	const world = createWorld();
	initWorldFromBoard(world, board, {
		climateProfile: cfg.climateProfile,
		stormProfile: cfg.stormProfile,
		difficulty: cfg.difficulty,
		factionSlots: cfg.factions,
	});

	let gameId = randomUUID();
	if (repo) {
		try {
			gameId = await repo.createGame(
				boardConfig.seed,
				boardConfig.width,
				boardConfig.height,
				boardConfig.difficulty,
				2.0,
				{
					climateProfile: cfg.climateProfile,
					stormProfile: cfg.stormProfile,
					gameDifficulty: cfg.difficulty,
					factionSlots: JSON.stringify(cfg.factions),
				},
			);
			void repo.saveTiles(
				gameId,
				board.tiles.flat().map((t) => ({
					gameId,
					x: t.x,
					z: t.z,
					elevation: t.elevation,
					passable: t.passable,
				})),
			);
		} catch (err) {
			console.warn("[session] DB write failed (non-fatal):", err);
		}
	}

	const spawnTile = getSpawnCenters().get("player") ?? undefined;

	resetGameState();

	return {
		config: boardConfig,
		gameId,
		board,
		world,
		newGameConfig: cfg,
		spawnTile,
	};
}

// ─── Load ────────────────────────────────────────────────────────────────

export async function loadGame(
	gameId: string,
	repo: GameRepo,
): Promise<GameSession | null> {
	const record = await repo.getGame(gameId);
	if (!record) return null;

	const climateProfile = (record.climateProfile || "temperate") as ClimateProfile;
	const stormProfile = (record.stormProfile || "volatile") as StormProfile;
	const gameDifficulty = (record.gameDifficulty || "standard") as Difficulty;

	let factionSlots: FactionSlot[] | undefined;
	try {
		const parsed = JSON.parse(record.factionSlots);
		if (Array.isArray(parsed) && parsed.length > 0) factionSlots = parsed;
	} catch { /* use defaults */ }

	const playerFid = factionSlots?.find((s) => s.role === "player")?.factionId;
	if (playerFid) {
		const pDef = FACTION_DEFINITIONS.find((f) => f.id === playerFid);
		if (pDef) setPlayerFactionColor(pDef.color);
	}

	const config: BoardConfig = {
		width: record.boardW,
		height: record.boardH,
		seed: record.seed,
		difficulty: record.difficulty,
		climateProfile,
	};
	const board = generateBoard(config);
	const world = createWorld();
	initWorldFromBoard(world, board, {
		climateProfile,
		stormProfile,
		difficulty: gameDifficulty,
		factionSlots,
	});

	const [units, buildings, explored, resources] = await Promise.all([
		repo.loadUnits(gameId),
		repo.loadBuildings(gameId),
		repo.loadExplored(gameId),
		repo.loadResources(gameId),
	]);
	if (units.length > 0) applyUnits(world, units);
	if (buildings.length > 0) applyBuildings(world, buildings);
	if (explored.length > 0) applyExplored(world, explored);
	if (resources.length > 0) applyResources(world, resources);
	applyTurn(world, record.turn);

	// Rehydrate campaign stats
	const savedStats = await repo.loadCampaignStats(gameId);
	if (savedStats) {
		try { rehydrateCampaignStats(JSON.parse(savedStats.statsJson)); }
		catch { /* non-fatal */ }
	} else {
		resetCampaignStats();
	}

	// Rehydrate turn event logs
	const savedLogs = await repo.loadTurnEventLogs(gameId);
	if (savedLogs.length > 0) {
		try {
			const logs = savedLogs.map((l) => ({
				turnNumber: l.turn,
				events: JSON.parse(l.eventsJson),
			}));
			rehydrateTurnEventLog(record.turn, logs);
		} catch { /* non-fatal */ }
	} else {
		resetTurnEventLog();
	}
	resetResourceDeltas();
	resetTurnSummary();

	const spawnTile = getSpawnCenters().get("player") ?? undefined;
	resetGameState();

	return { config, gameId, board, world, spawnTile };
}

// ─── Save ────────────────────────────────────────────────────────────────

export async function saveGame(
	session: GameSession,
	repo: GameRepo,
): Promise<void> {
	const { gameId, world, board } = session;
	const currentTurn = getCurrentTurn(world);
	try {
		await repo.updateTurn(gameId, currentTurn);
		await repo.saveUnits(gameId, serializeUnits(world, gameId));
		await repo.saveBuildings(gameId, serializeBuildings(world, gameId));
		await repo.saveExplored(gameId, serializeExplored(world, gameId));
		await repo.saveResources(gameId, serializeResources(world, gameId));

		const stats = collectCampaignStats();
		await repo.saveCampaignStats(gameId, JSON.stringify(stats));

		const totalTiles = board.config.width * board.config.height;
		const snapshot = collectTurnSnapshot(world, totalTiles);
		await repo.saveTurnSnapshot(gameId, currentTurn, JSON.stringify(snapshot));

		for (const fr of collectFactionResources(world)) {
			await repo.saveFactionResourceSnapshot(
				gameId,
				currentTurn,
				fr.factionId,
				JSON.stringify(fr.resources),
			);
		}

		for (const log of getCompletedTurnLogs()) {
			await repo.appendTurnEventLog(
				gameId,
				log.turnNumber,
				JSON.stringify(log.events),
			);
		}
	} catch (err) {
		console.warn("[session] Save failed (non-fatal):", err);
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function resetGameState(): void {
	_resetVictory();
	resetCampaignStats();
	resetTurnEventLog();
	resetResourceDeltas();
	resetTurnSummary();
	_resetTutorial();
}
