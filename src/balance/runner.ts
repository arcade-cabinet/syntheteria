/**
 * Balance harness game runner — executes a single game simulation.
 *
 * Resets ALL global state between runs (AI runtime, victory, score,
 * building upgrades, config overrides) to ensure isolation.
 */

import { createWorld, type World } from "koota";
import { resetAIRuntime } from "../ai";
import type { GeneratedBoard } from "../board";
import { generateBoard } from "../board";
import {
	applyConfigOverrides,
	clearConfigOverrides,
	computeEpoch,
} from "../config";
import { initWorldFromBoard } from "../init-world";
import {
	_resetScoreSystem,
	_resetVictory,
	advanceTurn,
	calculateFactionScore,
	checkVictoryConditions,
	clearBuildingUpgradeJobs,
	computeTerritory,
	getTerritoryPercent,
} from "../systems";
import type { ResourceMaterial } from "../terrain";
import {
	Board,
	Building,
	CultStructure,
	Faction,
	ResourcePool,
	UnitFaction,
} from "../traits";
import type { RunResult, RunSnapshot } from "./types";

const AI_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];
const CULT_FACTIONS = ["static_remnants", "null_monks", "lost_signal"];
const ALL_MATERIALS: ResourceMaterial[] = [
	"stone",
	"timber",
	"iron_ore",
	"coal",
	"food",
	"fiber",
	"sand",
	"clay",
	"steel",
	"concrete",
	"glass",
	"circuits",
	"fuel",
	"alloy",
	"nanomaterial",
	"fusion_cell",
	"quantum_crystal",
];

/**
 * Configuration for a single headless game run.
 *
 * @property turnCount - Total number of turns to simulate.
 * @property boardWidth - Width of the generated board in tiles.
 * @property boardHeight - Height of the generated board in tiles.
 * @property seed - Deterministic seed string for board generation.
 * @property checkpointInterval - Turns between snapshot captures.
 * @property configOverrides - Optional runtime config overrides (applied via registry).
 */
export interface RunConfig {
	turnCount: number;
	boardWidth: number;
	boardHeight: number;
	seed: string;
	checkpointInterval: number;
	configOverrides?: Record<string, unknown>;
}

/**
 * Execute a single headless game simulation and return the results.
 *
 * Resets all global state (AI runtime, victory, score, building upgrades,
 * config overrides) before and after the run for full isolation.
 *
 * @param config - Run configuration (board size, seed, turn count, overrides).
 * @returns Snapshot data, victory outcome, and timing information.
 */
export function runSingleGame(config: RunConfig): RunResult {
	const startTime = Date.now();

	clearConfigOverrides();
	if (config.configOverrides) {
		applyConfigOverrides(config.configOverrides);
	}

	resetAIRuntime();
	_resetVictory();
	_resetScoreSystem();
	clearBuildingUpgradeJobs();

	const world = createWorld();
	const board = generateBoard({
		width: config.boardWidth,
		height: config.boardHeight,
		seed: config.seed,
		difficulty: "normal",
	});

	initWorldFromBoard(world, board, {
		difficulty: "standard",
		factionSlots: AI_FACTIONS.map((id) => ({
			factionId: id,
			role: "ai" as const,
		})),
	});

	const snapshots: RunSnapshot[] = [];
	let victoryType: string | null = null;
	let victoryWinner: string | null = null;
	let victoryTurn: number | null = null;

	snapshots.push(takeSnapshot(world, board, 0));

	for (let t = 1; t <= config.turnCount; t++) {
		advanceTurn(world, board, { observerMode: true });

		if (t % config.checkpointInterval === 0 || t === config.turnCount) {
			snapshots.push(takeSnapshot(world, board, t));
		}

		if (t >= 10 && !victoryType) {
			const outcome = checkVictoryConditions(world, { observerMode: true });
			if (outcome.result === "victory") {
				victoryType = outcome.reason;
				victoryWinner = outcome.winnerId;
				victoryTurn = t;
			}
		}
	}

	world.destroy();
	clearConfigOverrides();

	return {
		seed: config.seed,
		turnCount: config.turnCount,
		snapshots,
		victoryType,
		victoryWinner,
		victoryTurn,
		durationMs: Date.now() - startTime,
	};
}

function takeSnapshot(
	world: World,
	board: GeneratedBoard,
	turn: number,
): RunSnapshot {
	const { width, height } = board.config;

	const buildingsByFaction: Record<string, number> = {};
	const buildingTierMax: Record<string, number> = {};
	const unitsByFaction: Record<string, number> = {};
	const resourcesByFaction: Record<string, number> = {};
	const scoresByFaction: Record<string, number> = {};
	let cultUnitCount = 0;
	let cultStructureCount = 0;

	for (const fid of AI_FACTIONS) {
		buildingsByFaction[fid] = 0;
		buildingTierMax[fid] = 0;
		unitsByFaction[fid] = 0;
		resourcesByFaction[fid] = 0;
		scoresByFaction[fid] = 0;
	}

	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.hp <= 0) continue;
		const fid = b.factionId;
		if (fid in buildingsByFaction) {
			buildingsByFaction[fid] = (buildingsByFaction[fid] ?? 0) + 1;
			buildingTierMax[fid] = Math.max(
				buildingTierMax[fid] ?? 0,
				b.buildingTier,
			);
		}
	}

	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (!f) continue;
		const fid = f.factionId;
		if (AI_FACTIONS.includes(fid)) {
			unitsByFaction[fid] = (unitsByFaction[fid] ?? 0) + 1;
		} else if (CULT_FACTIONS.includes(fid)) {
			cultUnitCount++;
		}
	}

	for (const e of world.query(CultStructure)) {
		const cs = e.get(CultStructure);
		if (cs && cs.hp > 0) cultStructureCount++;
	}

	for (const e of world.query(ResourcePool, Faction)) {
		const f = e.get(Faction);
		const pool = e.get(ResourcePool);
		if (!f || !pool) continue;
		const fid = f.id;
		if (AI_FACTIONS.includes(fid)) {
			let total = 0;
			for (const mat of ALL_MATERIALS) {
				total += (pool[mat as keyof typeof pool] as number) ?? 0;
			}
			resourcesByFaction[fid] = total;
		}
	}

	const territory = computeTerritory(world, width, height);
	const territoryPctByFaction: Record<string, number> = {};
	for (const fid of AI_FACTIONS) {
		territoryPctByFaction[fid] = getTerritoryPercent(territory, fid);
		scoresByFaction[fid] = calculateFactionScore(world, fid);
	}

	const highestTier = Math.max(
		...Object.values(buildingTierMax).map((v) => v ?? 0),
		1,
	);
	const epoch = computeEpoch(highestTier, turn);

	return {
		turn,
		epoch: epoch.number,
		buildingsByFaction,
		buildingTierMax,
		unitsByFaction,
		territoryPctByFaction,
		resourcesByFaction,
		scoresByFaction,
		cultUnitCount,
		cultStructureCount,
	};
}
