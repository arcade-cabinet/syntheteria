/**
 * Entry point. Owns the top-level screen state machine.
 *
 * ONE persistent R3F Canvas (Globe) renders across all phases:
 *   title      →  Globe with storms + title text, DOM overlay buttons
 *   setup      →  Globe visible behind NewGameModal overlay
 *   generating →  Globe growth animation, generating text overlay
 *   playing    →  Game board on globe, HUD + all game DOM overlays
 *
 * DOM overlays are layered on top of the Canvas based on phase.
 */

import { createWorld } from "koota";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { playSfx } from "./audio/sfx";
import { generateBoard } from "./board/generator";
import { TILE_SIZE_M } from "./board/grid";
import type { BoardConfig, GeneratedBoard } from "./board/types";
import { getCameraControls } from "./camera/cameraStore";
import { PLAYER_MAX_AP } from "./config/gameDefaults";
import { TECH_BY_ID } from "./config/techTreeDefs";
import { createSqlJsAdapter } from "./db/adapter";
import { GameRepo } from "./db/gameRepo";
import { runMigrations } from "./db/migrations";
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
} from "./db/serialize";
import type { GameSummary } from "./db/types";
import { BUILDING_DEFS } from "./ecs/buildings/definitions";
import { FACTION_DEFINITIONS } from "./ecs/factions/definitions";
import { initWorldFromBoard } from "./ecs/init";
import { getSpawnCenters } from "./ecs/robots/placement";
import { seedToPhrase } from "./ecs/seed";
import {
	collectCampaignStats,
	collectFactionResources,
	collectTurnSnapshot,
} from "./ecs/systems/analyticsCollector";
import {
	getCombatKills,
	rehydrateCampaignStats,
	resetCampaignStats,
} from "./ecs/systems/campaignStats";
import { FabricationJob, ROBOT_COSTS } from "./ecs/systems/fabricationSystem";
import { getPopCap, getPopulation } from "./ecs/systems/populationSystem";
import { getResearchState } from "./ecs/systems/researchSystem";
import { resetResourceDeltas } from "./ecs/systems/resourceDeltaSystem";
import { getPlayerResources } from "./ecs/systems/resourceSystem";
import { FUSION_RECIPES, SynthesisQueue } from "./ecs/systems/synthesisSystem";
import { computeTerritory } from "./ecs/systems/territorySystem";
import { pushToast } from "./ecs/systems/toastNotifications";
import {
	getCompletedTurnLogs,
	rehydrateTurnEventLog,
	resetTurnEventLog,
} from "./ecs/systems/turnEventLog";
import {
	collectTurnSummary,
	resetTurnSummary,
} from "./ecs/systems/turnSummary";
import {
	advanceTurn,
	getCurrentTurn,
	getGameOutcome,
} from "./ecs/systems/turnSystem";
import { _resetTutorial } from "./ecs/systems/tutorialSystem";
import type { GameOutcome } from "./ecs/systems/victorySystem";
import { _resetVictory, getVictoryProgress } from "./ecs/systems/victorySystem";
import { Building } from "./ecs/traits/building";
import { Faction } from "./ecs/traits/faction";
import { ResourcePool } from "./ecs/traits/resource";
import {
	UnitFaction,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitVisual,
} from "./ecs/traits/unit";
import type { WorldType } from "./ecs/world";
import { randomUUID } from "./lib/uuid";
import { setPlayerFactionColor } from "./rendering/modelPaths";
import { Globe, type GlobePhase } from "./ui/Globe";
import { AlertBar } from "./ui/game/AlertBar";
import { DiplomacyOverlay } from "./ui/game/DiplomacyOverlay";
import { EntityTooltip } from "./ui/game/EntityTooltip";
import { GameOutcomeOverlay } from "./ui/game/GameOutcomeOverlay";
import { GarageModal } from "./ui/game/GarageModal";
import {
	type CurrentResearch,
	HUD,
	type ProductionQueueItem,
} from "./ui/game/HUD";
import { KeybindHints } from "./ui/game/KeybindHints";
import { Minimap } from "./ui/game/Minimap";
import { PauseMenu } from "./ui/game/PauseMenu";
import {
	collectPendingItems,
	PendingCompletions,
	type PendingItem,
} from "./ui/game/PendingCompletions";
import { RadialMenu } from "./ui/game/RadialMenu";
import { SelectedInfo } from "./ui/game/SelectedInfo";
import { SystemToasts } from "./ui/game/SystemToasts";
import { TechTreeOverlay } from "./ui/game/TechTreeOverlay";
import { ToastStack } from "./ui/game/ToastStack";
// Game DOM overlays (outside Canvas, on top of Globe)
import { TurnLog } from "./ui/game/TurnLog";
import { TurnPhaseOverlay } from "./ui/game/TurnPhaseOverlay";
import { TurnSummaryPanel } from "./ui/game/TurnSummaryPanel";
import { TutorialOverlay } from "./ui/game/TutorialOverlay";
import { UnitRosterOverlay } from "./ui/game/UnitRosterOverlay";
import { LandingScreen } from "./ui/landing/LandingScreen";
import type { NewGameConfig } from "./world/config";
import { getPlayerFactionId, SECTOR_SCALE_SPECS } from "./world/config";
import "@root/global.css";

// ---------------------------------------------------------------------------
// Debug bridge (Playwright E2E)
// ---------------------------------------------------------------------------

interface UnitInfo {
	entityId: number;
	tileX: number;
	tileZ: number;
	factionId: string;
	hp: number;
	ap: number;
	modelId: string;
}

interface BuildingInfo {
	tileX: number;
	tileZ: number;
	factionId: string;
	buildingType: string;
}

interface FactionStats {
	factionId: string;
	unitCount: number;
	totalHp: number;
	buildingCount: number;
	territoryPercent: number;
	totalResources: number;
	combatKills: number;
}

declare global {
	interface Window {
		__syntheteria?: {
			phase: string;
			turn: number;
			playerAp: number;
			selectedUnitId: number | null;
			isObserverMode: boolean;
			observerSpeed: number;
			getWorld: () => WorldType | null;
			selectUnit: (entityId: number | null) => void;
			moveUnit: (entityId: number, toX: number, toZ: number) => void;
			endTurn: () => void;
			advanceNTurns: (n: number) => void;
			getUnits: () => UnitInfo[];
			getBuildings: () => BuildingInfo[];
			getTerritoryMap: () => Record<
				string,
				{ factionId: string; contested: boolean }
			>;
			setObserverSpeed: (speed: number) => void;
			getResources: () => Record<string, number> | null;
			getFactionStats: () => FactionStats[];
			getGameOutcome: () => GameOutcome;
		};
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = GlobePhase; // "title" | "setup" | "generating" | "playing"

type GameSession = {
	config: BoardConfig;
	gameId: string;
	board: GeneratedBoard;
	world: WorldType;
	newGameConfig?: NewGameConfig;
	spawnTile?: { x: number; z: number };
};

// ---------------------------------------------------------------------------
// HMR state preservation
// ---------------------------------------------------------------------------

interface HmrState {
	phase: Phase;
	session: GameSession | null;
	turn: number;
	selectedUnitId: number | null;
	isObserverMode: boolean;
	observerSpeed: number;
}

declare global {
	interface Window {
		__hmrGameState?: HmrState;
	}
}

function migratePhase(p: string): Phase {
	// Handle old phase names from HMR state
	if (p === "landing") return "title";
	if (p === "game") return "playing";
	if (p === "title" || p === "setup" || p === "generating" || p === "playing")
		return p as Phase;
	return "title";
}

const hmrState: HmrState = window.__hmrGameState
	? {
			...window.__hmrGameState,
			phase: migratePhase(window.__hmrGameState.phase),
		}
	: {
			phase: "title",
			session: null,
			turn: 1,
			selectedUnitId: null,
			isObserverMode: false,
			observerSpeed: 1,
		};
window.__hmrGameState = hmrState;

if (import.meta.hot) {
	import.meta.hot.accept();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPlayerAp(world: WorldType): number {
	for (const entity of world.query(UnitFaction, UnitStats)) {
		const faction = entity.get(UnitFaction);
		const stats = entity.get(UnitStats);
		if (faction?.factionId === "player" && stats) return stats.ap;
	}
	return PLAYER_MAX_AP;
}

function getProductionQueue(world: WorldType): ProductionQueueItem[] {
	const items: ProductionQueueItem[] = [];

	for (const e of world.query(FabricationJob)) {
		const job = e.get(FabricationJob);
		if (!job || job.factionId !== "player") continue;
		items.push({
			building: "Motor Pool",
			product: job.robotClass.replace(/_/g, " "),
			turnsLeft: job.turnsRemaining,
		});
	}

	for (const e of world.query(Building, SynthesisQueue)) {
		const b = e.get(Building);
		const sq = e.get(SynthesisQueue);
		if (!b || !sq || b.factionId !== "player") continue;
		const recipe = FUSION_RECIPES.find((r) => r.id === sq.recipeId);
		items.push({
			building: "Synthesizer",
			product: recipe?.label ?? sq.recipeId,
			turnsLeft: sq.ticksRemaining,
		});
	}

	return items;
}

function getCurrentResearchForHUD(world: WorldType): CurrentResearch | null {
	const state = getResearchState(world, "player");
	if (!state || !state.currentTechId) return null;
	const tech = TECH_BY_ID.get(state.currentTechId);
	if (!tech) return null;
	return {
		techName: tech.name,
		progressPoints: state.progressPoints,
		turnsToResearch: tech.turnsToResearch,
		labCount: state.labCount,
	};
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

const AUTO_SAVE_INTERVAL = 3;

function Root() {
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

	const saveGame = useCallback(async () => {
		const repo = repoRef.current;
		const s = sessionRef.current;
		if (!repo || !s) return;
		const gid = s.gameId;
		const w = s.world;
		const currentTurn = getCurrentTurn(w);
		try {
			await repo.updateTurn(gid, currentTurn);
			await repo.saveUnits(gid, serializeUnits(w, gid));
			await repo.saveBuildings(gid, serializeBuildings(w, gid));
			await repo.saveExplored(gid, serializeExplored(w, gid));
			await repo.saveResources(gid, serializeResources(w, gid));

			const stats = collectCampaignStats();
			await repo.saveCampaignStats(gid, JSON.stringify(stats));

			const totalTiles = s.board.config.width * s.board.config.height;
			const snapshot = collectTurnSnapshot(w, totalTiles);
			await repo.saveTurnSnapshot(gid, currentTurn, JSON.stringify(snapshot));

			for (const fr of collectFactionResources(w)) {
				await repo.saveFactionResourceSnapshot(
					gid,
					currentTurn,
					fr.factionId,
					JSON.stringify(fr.resources),
				);
			}

			for (const log of getCompletedTurnLogs()) {
				await repo.appendTurnEventLog(
					gid,
					log.turnNumber,
					JSON.stringify(log.events),
				);
			}
		} catch (err) {
			console.warn("[main] Save failed (non-fatal):", err);
		}
	}, []);

	// DB init
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
				console.warn("[main] DB init failed (non-fatal):", err);
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
			if (sessionRef.current && repoRef.current) {
				void saveGame();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [saveGame]);

	const handleStartGame = useCallback(async (newGameCfg: NewGameConfig) => {
		setPhase("generating");

		const scaleSpec = SECTOR_SCALE_SPECS[newGameCfg.sectorScale];
		const difficultyMap: Record<string, BoardConfig["difficulty"]> = {
			story: "easy",
			standard: "normal",
			hard: "hard",
		};
		const boardConfig: BoardConfig = {
			width: scaleSpec.width,
			height: scaleSpec.height,
			seed: seedToPhrase(newGameCfg.worldSeed),
			difficulty: difficultyMap[newGameCfg.difficulty] ?? "normal",
			climateProfile: newGameCfg.climateProfile,
		};

		const playerFid = getPlayerFactionId(newGameCfg);
		if (playerFid) {
			const pDef = FACTION_DEFINITIONS.find((f) => f.id === playerFid);
			if (pDef) setPlayerFactionColor(pDef.color);
		}

		const board = generateBoard(boardConfig);
		const world = createWorld();
		initWorldFromBoard(world, board, {
			climateProfile: newGameCfg.climateProfile,
			stormProfile: newGameCfg.stormProfile,
			difficulty: newGameCfg.difficulty,
			factionSlots: newGameCfg.factions,
		});

		let gameId: string = randomUUID();
		const repo = repoRef.current;
		if (repo) {
			try {
				gameId = await repo.createGame(
					boardConfig.seed,
					boardConfig.width,
					boardConfig.height,
					boardConfig.difficulty,
					2.0,
					{
						climateProfile: newGameCfg.climateProfile,
						stormProfile: newGameCfg.stormProfile,
						gameDifficulty: newGameCfg.difficulty,
						factionSlots: JSON.stringify(newGameCfg.factions),
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
				setSavedGames(await repo.listGames());
			} catch (err) {
				console.warn("[main] DB write failed (non-fatal):", err);
			}
		}

		const spawnTile = getSpawnCenters().get("player") ?? undefined;

		_resetVictory();
		resetCampaignStats();
		resetTurnEventLog();
		resetResourceDeltas();
		resetTurnSummary();
		_resetTutorial();
		setGameOutcome({ result: "playing" });
		setSession({
			config: boardConfig,
			gameId,
			board,
			world,
			newGameConfig: newGameCfg,
			spawnTile,
		});
		setTurn(1);
		setPlayerAp(readPlayerAp(world));
		setSceneReady(false);
		setIsObserverMode(getPlayerFactionId(newGameCfg) === null);
		setObserverSpeed(1);
		// Phase stays "generating" — Globe animation drives the transition via onTransitionComplete
	}, []);

	const handleLoadGame = useCallback(async (gameId: string) => {
		const repo = repoRef.current;
		if (!repo) return;
		setPhase("generating");
		try {
			const record = await repo.getGame(gameId);
			if (!record) {
				setPhase("title");
				return;
			}

			const climateProfile = (record.climateProfile ||
				"temperate") as import("./world/config").ClimateProfile;
			const stormProfile = (record.stormProfile ||
				"volatile") as import("./world/config").StormProfile;
			const gameDifficulty = (record.gameDifficulty ||
				"standard") as import("./world/config").Difficulty;
			let factionSlots: import("./world/config").FactionSlot[] | undefined;
			try {
				const parsed = JSON.parse(record.factionSlots);
				if (Array.isArray(parsed) && parsed.length > 0) factionSlots = parsed;
			} catch {
				/* use defaults */
			}

			const playerFid = factionSlots?.find(
				(s) => s.role === "player",
			)?.factionId;
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

			const savedStats = await repo.loadCampaignStats(gameId);
			if (savedStats) {
				try {
					rehydrateCampaignStats(JSON.parse(savedStats.statsJson));
				} catch {
					/* non-fatal */
				}
			} else {
				resetCampaignStats();
			}

			const savedLogs = await repo.loadTurnEventLogs(gameId);
			if (savedLogs.length > 0) {
				try {
					const logs = savedLogs.map((l) => ({
						turnNumber: l.turn,
						events: JSON.parse(l.eventsJson),
					}));
					rehydrateTurnEventLog(record.turn, logs);
				} catch {
					/* non-fatal */
				}
			} else {
				resetTurnEventLog();
			}
			resetResourceDeltas();
			resetTurnSummary();

			const spawnTile = getSpawnCenters().get("player") ?? undefined;

			_resetVictory();
			setGameOutcome({ result: "playing" });
			setSession({ config, gameId, board, world, spawnTile });
			setTurn(record.turn);
			setPlayerAp(readPlayerAp(world));
			setSceneReady(false);
			const hasPlayer = factionSlots?.some((s) => s.role === "player") ?? true;
			setIsObserverMode(!hasPlayer);
			setObserverSpeed(1);
			// Phase stays "generating" — Globe animation drives the transition via onTransitionComplete
		} catch (err) {
			console.warn("[main] Load game failed:", err);
			setPhase("title");
		}
	}, []);

	// Observer auto-orbit: cycle through factions each turn
	const observerFactionIdx = useRef(0);

	const handleEndTurn = useCallback(() => {
		if (!session) return;
		playSfx("turn_advance");
		advanceTurn(session.world, session.board, { observerMode: isObserverMode });
		const currentTurn = getCurrentTurn(session.world);
		setTurn(currentTurn);
		setPlayerAp(readPlayerAp(session.world));

		const cam = getCameraControls();
		if (!isObserverMode) {
			if (cam) {
				let sumX = 0;
				let sumZ = 0;
				let count = 0;
				for (const e of session.world.query(UnitPos, UnitFaction)) {
					const f = e.get(UnitFaction);
					if (!f || (f.factionId !== "player" && f.factionId !== "")) continue;
					const p = e.get(UnitPos);
					if (!p) continue;
					sumX += p.tileX;
					sumZ += p.tileZ;
					count++;
				}
				if (count > 0) {
					cam.panTo((sumX / count) * TILE_SIZE_M, (sumZ / count) * TILE_SIZE_M);
				}
			}
		} else if (cam) {
			// Observer mode: auto-orbit to follow each faction in rotation
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

		const { milestones } = collectTurnSummary(
			session.world,
			session.board,
			currentTurn,
		);
		for (const m of milestones) {
			pushToast("system", m.factionName, m.message, 5000);
		}

		const outcome = getGameOutcome();
		setGameOutcome(outcome);
		if (outcome.result === "victory") playSfx("victory");
		else if (outcome.result === "defeat") playSfx("defeat");

		if (
			currentTurn % AUTO_SAVE_INTERVAL === 0 ||
			outcome.result !== "playing"
		) {
			void saveGame();
		}
	}, [session, saveGame, isObserverMode]);

	// Globe growth animation completed — transition from "generating" to "playing"
	const handleTransitionComplete = useCallback(() => {
		if (hmrState.phase === "generating") {
			setPhase("playing");
		}
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
	}, []);

	// Observer mode: auto-advance turns
	useEffect(() => {
		if (
			!isObserverMode ||
			!session ||
			!sceneReady ||
			gameOutcome.result !== "playing"
		)
			return;
		const ms = 2000 / observerSpeed;
		const id = setInterval(() => {
			handleEndTurn();
		}, ms);
		return () => clearInterval(id);
	}, [
		isObserverMode,
		observerSpeed,
		session,
		sceneReady,
		gameOutcome.result,
		handleEndTurn,
	]);

	// Keyboard shortcuts (active during playing phase)
	const zoomToggledRef = useRef(false);
	useEffect(() => {
		if (phase !== "playing" || !sceneReady) return;
		const isTyping = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			return (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.isContentEditable
			);
		};
		const handler = (e: KeyboardEvent) => {
			if (isTyping(e)) return;
			if (e.key === "Escape") {
				setPaused((prev) => !prev);
				return;
			}
			if (paused) return;
			// Tab — cycle through player units
			if (e.key === "Tab") {
				e.preventDefault();
				const s = sessionRef.current;
				if (!s) return;
				const playerUnits: number[] = [];
				for (const ent of s.world.query(UnitPos, UnitFaction)) {
					const f = ent.get(UnitFaction);
					if (f?.factionId === "player") playerUnits.push(ent.id());
				}
				if (playerUnits.length === 0) return;
				playerUnits.sort((a, b) => a - b);
				const currentIdx = selectedUnitId != null
					? playerUnits.indexOf(selectedUnitId)
					: -1;
				const nextIdx = (currentIdx + 1) % playerUnits.length;
				const nextId = playerUnits[nextIdx]!;
				setSelectedUnitId(nextId);
				// Pan camera to the selected unit
				for (const ent of s.world.query(UnitPos, UnitFaction)) {
					if (ent.id() === nextId) {
						const p = ent.get(UnitPos);
						if (p) {
							const cam = getCameraControls();
							cam?.panTo(p.tileX * TILE_SIZE_M, p.tileZ * TILE_SIZE_M);
						}
						break;
					}
				}
				return;
			}
			// Enter — advance turn
			if (e.key === "Enter") {
				e.preventDefault();
				handleEndTurn();
				return;
			}
			// Z — toggle zoom (close ↔ strategic)
			if (e.key === "z" || e.key === "Z") {
				const cam = getCameraControls();
				if (!cam) return;
				const s = sessionRef.current;
				if (!s) return;
				const R = Math.max(s.config.width, s.config.height) / (2 * Math.PI);
				if (zoomToggledRef.current) {
					cam.setZoom(R * 1.8);
					zoomToggledRef.current = false;
				} else {
					cam.setZoom(R * 5.5);
					zoomToggledRef.current = true;
				}
				return;
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [phase, sceneReady, paused, selectedUnitId, handleEndTurn, setSelectedUnitId]);

	// Playwright debug bridge
	useEffect(() => {
		window.__syntheteria = {
			phase,
			turn,
			playerAp,
			selectedUnitId,
			isObserverMode,
			observerSpeed,
			getWorld: () => session?.world ?? null,
			selectUnit: (entityId: number | null) => setSelectedUnitId(entityId),
			moveUnit: (entityId: number, toX: number, toZ: number) => {
				if (!session) return;
				for (const e of session.world.query(UnitPos, UnitFaction)) {
					if (e.id() === entityId) {
						const pos = e.get(UnitPos);
						if (!pos) return;
						e.add(
							UnitMove({
								fromX: pos.tileX,
								fromZ: pos.tileZ,
								toX,
								toZ,
								progress: 0,
								mpCost: 1,
							}),
						);
						return;
					}
				}
			},
			endTurn: () => handleEndTurn(),
			advanceNTurns: (n: number) => {
				for (let i = 0; i < n; i++) handleEndTurn();
			},
			getUnits: () => {
				if (!session) return [];
				const units: UnitInfo[] = [];
				for (const e of session.world.query(UnitPos, UnitFaction, UnitStats)) {
					const pos = e.get(UnitPos);
					const fac = e.get(UnitFaction);
					const stats = e.get(UnitStats);
					const vis = e.has(UnitVisual) ? e.get(UnitVisual) : null;
					if (!pos || !fac || !stats) continue;
					units.push({
						entityId: e.id(),
						tileX: pos.tileX,
						tileZ: pos.tileZ,
						factionId: fac.factionId,
						hp: stats.hp,
						ap: stats.ap,
						modelId: vis?.modelId ?? "",
					});
				}
				return units;
			},
			getBuildings: () => {
				if (!session) return [];
				const buildings: BuildingInfo[] = [];
				for (const e of session.world.query(Building)) {
					const b = e.get(Building);
					if (!b) continue;
					buildings.push({
						tileX: b.tileX,
						tileZ: b.tileZ,
						factionId: b.factionId,
						buildingType: b.buildingType,
					});
				}
				return buildings;
			},
			getTerritoryMap: () => {
				if (!session) return {};
				const snap = computeTerritory(
					session.world,
					session.config.width,
					session.config.height,
				);
				const out: Record<string, { factionId: string; contested: boolean }> =
					{};
				for (const [key, val] of snap.tiles) {
					out[key] = { factionId: val.factionId, contested: val.contested };
				}
				return out;
			},
			getResources: () => {
				if (!session) return null;
				return getPlayerResources(session.world);
			},
			getFactionStats: () => {
				if (!session) return [];
				const w = session.world;
				const territory = computeTerritory(
					w,
					session.config.width,
					session.config.height,
				);
				const fMap = new Map<string, { units: number; hp: number }>();
				for (const e of w.query(UnitPos, UnitFaction, UnitStats)) {
					const fac = e.get(UnitFaction);
					const stats = e.get(UnitStats);
					if (!fac || !stats) continue;
					const cur = fMap.get(fac.factionId) ?? { units: 0, hp: 0 };
					cur.units++;
					cur.hp += stats.hp;
					fMap.set(fac.factionId, cur);
				}
				const bMap = new Map<string, number>();
				for (const e of w.query(Building)) {
					const b = e.get(Building);
					if (!b) continue;
					bMap.set(b.factionId, (bMap.get(b.factionId) ?? 0) + 1);
				}
				const rMap = new Map<string, number>();
				for (const e of w.query(ResourcePool, Faction)) {
					const f = e.get(Faction);
					const pool = e.get(ResourcePool);
					if (!f || !pool) continue;
					let total = 0;
					for (const val of Object.values(pool)) {
						if (typeof val === "number") total += val;
					}
					rMap.set(f.id, total);
				}
				const allFactions = new Set<string>();
				for (const k of fMap.keys()) allFactions.add(k);
				for (const k of bMap.keys()) allFactions.add(k);
				for (const k of territory.counts.keys()) allFactions.add(k);
				const killMap = getCombatKills();
				const result: FactionStats[] = [];
				for (const fid of allFactions) {
					const u = fMap.get(fid) ?? { units: 0, hp: 0 };
					result.push({
						factionId: fid,
						unitCount: u.units,
						totalHp: u.hp,
						buildingCount: bMap.get(fid) ?? 0,
						territoryPercent:
							territory.totalTiles > 0
								? ((territory.counts.get(fid) ?? 0) / territory.totalTiles) *
									100
								: 0,
						totalResources: rMap.get(fid) ?? 0,
						combatKills: killMap.get(fid) ?? 0,
					});
				}
				return result;
			},
			getGameOutcome: () => getGameOutcome(),
			setObserverSpeed: (speed: number) => setObserverSpeed(speed),
		};
	});

	// Derived: is the game playing and scene ready?
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
			{/* ONE persistent Canvas — always rendered */}
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

			{/* Title / Setup: landing screen DOM overlay */}
			{(phase === "title" ||
				phase === "setup" ||
				(phase === "playing" && !sceneReady)) && (
				<LandingScreen
					onStartGame={handleStartGame}
					onLoadGame={handleLoadGame}
					savedGames={savedGames}
				/>
			)}

			{/* Generating: text overlay on top of globe animation */}
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
					onSave={() => void saveGame()}
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

			{/* Command bar — RESEARCH / GARAGE / ROSTER buttons */}
			{gameActive && !isObserverMode && (
				<div
					data-testid="command-bar"
					style={{
						position: "absolute",
						top: 12,
						left: "50%",
						transform: "translateX(-50%)",
						display: "flex",
						gap: 6,
						zIndex: 40,
						pointerEvents: "auto",
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
						background: "rgba(3,3,8,0.7)",
						padding: "6px 10px",
						borderRadius: 8,
						backdropFilter: "blur(6px)",
					}}
				>
					{(
						[
							{
								label: "Research",
								key: "techTree",
								active: showTechTree,
								set: setShowTechTree,
							},
							{
								label: "Garage",
								key: "garage",
								active: showGarage,
								set: setShowGarage,
							},
							{
								label: "Roster",
								key: "roster",
								active: showRoster,
								set: setShowRoster,
							},
							{
								label: "Diplomacy",
								key: "diplomacy",
								active: showDiplomacy,
								set: setShowDiplomacy,
							},
						] as const
					).map(({ label, key, active, set }) => (
						<button
							key={key}
							type="button"
							data-testid={`cmd-${key}`}
							onClick={() => {
								setShowTechTree(false);
								setShowGarage(false);
								setShowRoster(false);
								setShowDiplomacy(false);
								if (!active) set(true);
							}}
							style={{
								padding: "6px 14px",
								background: active
									? "rgba(139,230,255,0.12)"
									: "rgba(3,3,8,0.7)",
								border: `1px solid ${active ? "rgba(139,230,255,0.5)" : "rgba(139,230,255,0.2)"}`,
								borderRadius: 5,
								color: active ? "#8be6ff" : "rgba(139,230,255,0.6)",
								fontSize: 10,
								letterSpacing: "0.18em",
								textTransform: "uppercase",
								cursor: "pointer",
								fontFamily: "inherit",
							}}
						>
							{label}
						</button>
					))}
				</div>
			)}

			{/* Full-screen overlays */}
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
					onSave={() => void saveGame()}
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

			{/* Game DOM overlays rendered outside the Globe Canvas */}
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

// ---------------------------------------------------------------------------
// Mount — preserves React root across HMR to avoid full re-mount
// ---------------------------------------------------------------------------

import { FatalErrorGate } from "./ui/FatalErrorModal";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root");

const existingRoot = (rootEl as any).__reactRoot;
const reactRoot = existingRoot ?? createRoot(rootEl);
(rootEl as any).__reactRoot = reactRoot;

reactRoot.render(
	<FatalErrorGate>
		<Root />
	</FatalErrorGate>,
);
