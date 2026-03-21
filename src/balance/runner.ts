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
import type { GameSpeed } from "../config/gameSpeedDefs";
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
	getVictoryProgress,
} from "../systems";
import { SynthesisQueue } from "../systems/synthesisSystem";
import type { ResourceMaterial } from "../terrain";
import {
	Board,
	Building,
	CultStructure,
	Faction,
	ResourcePool,
	UnitAttack,
	UnitFaction,
	UnitHarvest,
	UnitMove,
	UnitPos,
	UnitStats,
	UnitXP,
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
	gameSpeed?: GameSpeed;
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

	const gameSpeed = config.gameSpeed ?? "standard";

	initWorldFromBoard(world, board, {
		difficulty: "standard",
		factionSlots: AI_FACTIONS.map((id) => ({
			factionId: id,
			role: "ai" as const,
		})),
		gameSpeed,
	});

	const snapshots: RunSnapshot[] = [];
	let victoryType: string | null = null;
	let victoryWinner: string | null = null;
	let victoryTurn: number | null = null;

	// Track previous resources for spending computation
	let prevResources: Record<string, number> = {};
	// Track battle and elimination counts between checkpoints
	let battlesSinceCheckpoint = 0;
	let eliminationsSinceCheckpoint = 0;
	let prevUnitCounts: Record<string, number> = {};

	snapshots.push(
		takeSnapshot(
			world,
			board,
			0,
			prevResources,
			battlesSinceCheckpoint,
			eliminationsSinceCheckpoint,
			null,
		),
	);

	// Record initial resources
	for (const fid of AI_FACTIONS) {
		prevResources[fid] = snapshots[0].resourcesByFaction[fid] ?? 0;
		prevUnitCounts[fid] = snapshots[0].unitsByFaction[fid] ?? 0;
	}

	for (let t = 1; t <= config.turnCount; t++) {
		// Diagnostic: check for UnitAttack components BEFORE advanceTurn
		let attacksBefore = 0;
		for (const e of world.query(UnitAttack)) {
			if (e.get(UnitAttack)) attacksBefore++;
		}
		let harvestBefore = 0;
		for (const e of world.query(UnitHarvest)) {
			if (e.get(UnitHarvest)) harvestBefore++;
		}
		let movesBefore = 0;
		for (const e of world.query(UnitMove)) {
			if (e.get(UnitMove)) movesBefore++;
		}

		advanceTurn(world, board, { observerMode: true });

		// Diagnostic: check unit positions to detect movement
		if (t <= 15 && config.seed === "balance-tier2-run0") {
			// Check after advanceTurn
			let movesAfter = 0;
			for (const e of world.query(UnitMove)) {
				if (e.get(UnitMove)) movesAfter++;
			}
			let harvestAfter = 0;
			for (const e of world.query(UnitHarvest)) {
				if (e.get(UnitHarvest)) harvestAfter++;
			}
			console.log(
				`[T${t}] atk=${attacksBefore} mov=${movesBefore}→${movesAfter} harv=${harvestBefore}→${harvestAfter}`,
			);
		}

		// Track combat: unit count drops between turns indicate battles
		const currentUnitCounts: Record<string, number> = {};
		for (const fid of AI_FACTIONS) {
			let count = 0;
			for (const e of world.query(UnitFaction)) {
				const f = e.get(UnitFaction);
				if (f?.factionId === fid) count++;
			}
			currentUnitCounts[fid] = count;
		}

		// Detect battles: if any faction lost units this turn
		const anyLosses = AI_FACTIONS.some(
			(fid) => (currentUnitCounts[fid] ?? 0) < (prevUnitCounts[fid] ?? 0),
		);
		if (anyLosses) battlesSinceCheckpoint++;

		// Detect eliminations: faction went from >0 to 0 units
		for (const fid of AI_FACTIONS) {
			if (
				(prevUnitCounts[fid] ?? 0) > 0 &&
				(currentUnitCounts[fid] ?? 0) === 0
			) {
				eliminationsSinceCheckpoint++;
			}
		}
		prevUnitCounts = currentUnitCounts;

		if (t % config.checkpointInterval === 0 || t === config.turnCount) {
			const prevSnap = snapshots[snapshots.length - 1] ?? null;
			const snap = takeSnapshot(
				world,
				board,
				t,
				prevResources,
				battlesSinceCheckpoint,
				eliminationsSinceCheckpoint,
				prevSnap,
			);
			snapshots.push(snap);

			// Update tracking for next checkpoint
			for (const fid of AI_FACTIONS) {
				prevResources[fid] = snap.resourcesByFaction[fid] ?? 0;
			}
			battlesSinceCheckpoint = 0;
			eliminationsSinceCheckpoint = 0;
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

/** Building chain depth: how deep the unlock tree goes. */
const BUILDING_CHAIN: Record<string, number> = {
	storm_transmitter: 0,
	motor_pool: 0,
	outpost: 0,
	power_box: 0,
	synthesizer: 1,
	storage_hub: 1,
	defense_turret: 1,
	analysis_node: 2,
	relay_tower: 2,
	resource_refinery: 2,
};

function takeSnapshot(
	world: World,
	board: GeneratedBoard,
	turn: number,
	prevResources: Record<string, number>,
	battlesSinceCheckpoint: number,
	eliminationsSinceCheckpoint: number,
	prevSnap: RunSnapshot | null,
): RunSnapshot {
	const { width, height } = board.config;

	const buildingsByFaction: Record<string, number> = {};
	const buildingTierMax: Record<string, number> = {};
	const unitsByFaction: Record<string, number> = {};
	const resourcesByFaction: Record<string, number> = {};
	const scoresByFaction: Record<string, number> = {};
	let cultUnitCount = 0;
	let cultStructureCount = 0;

	// New metrics
	const maxBuildChainDepth: Record<string, number> = {};
	const buildingDiversity: Record<string, number> = {};
	const avgBuildingTier: Record<string, number> = {};
	const combatToWorkerRatio: Record<string, number> = {};
	const specializationUsage: Record<string, number> = {};
	const avgMarkLevel: Record<string, number> = {};
	const synthesisUsage: Record<string, number> = {};

	for (const fid of AI_FACTIONS) {
		buildingsByFaction[fid] = 0;
		buildingTierMax[fid] = 0;
		unitsByFaction[fid] = 0;
		resourcesByFaction[fid] = 0;
		scoresByFaction[fid] = 0;
		maxBuildChainDepth[fid] = 0;
		buildingDiversity[fid] = 0;
		avgBuildingTier[fid] = 0;
		combatToWorkerRatio[fid] = 0;
		specializationUsage[fid] = 0;
		avgMarkLevel[fid] = 0;
		synthesisUsage[fid] = 0;
	}

	// Building metrics
	const buildingTypesByFaction: Record<string, Set<string>> = {};
	const buildingTierSums: Record<string, number> = {};
	const buildingCounts: Record<string, number> = {};
	for (const fid of AI_FACTIONS) {
		buildingTypesByFaction[fid] = new Set();
		buildingTierSums[fid] = 0;
		buildingCounts[fid] = 0;
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
			buildingTypesByFaction[fid]?.add(b.buildingType);
			buildingTierSums[fid] = (buildingTierSums[fid] ?? 0) + b.buildingTier;
			buildingCounts[fid] = (buildingCounts[fid] ?? 0) + 1;
			const chainDepth = BUILDING_CHAIN[b.buildingType] ?? 0;
			maxBuildChainDepth[fid] = Math.max(
				maxBuildChainDepth[fid] ?? 0,
				chainDepth,
			);
		}
	}

	for (const fid of AI_FACTIONS) {
		buildingDiversity[fid] = buildingTypesByFaction[fid]?.size ?? 0;
		avgBuildingTier[fid] =
			buildingCounts[fid] > 0 ? buildingTierSums[fid] / buildingCounts[fid] : 0;
	}

	// Unit metrics — combat vs worker ratio, specialization, mark levels
	const combatUnits: Record<string, number> = {};
	const workerUnits: Record<string, number> = {};
	const specializedUnits: Record<string, number> = {};
	const totalUnitsPerFaction: Record<string, number> = {};
	const markLevelSums: Record<string, number> = {};
	for (const fid of AI_FACTIONS) {
		combatUnits[fid] = 0;
		workerUnits[fid] = 0;
		specializedUnits[fid] = 0;
		totalUnitsPerFaction[fid] = 0;
		markLevelSums[fid] = 0;
	}

	for (const e of world.query(UnitFaction)) {
		const f = e.get(UnitFaction);
		if (!f) continue;
		const fid = f.factionId;
		if (AI_FACTIONS.includes(fid)) {
			unitsByFaction[fid] = (unitsByFaction[fid] ?? 0) + 1;
			totalUnitsPerFaction[fid] = (totalUnitsPerFaction[fid] ?? 0) + 1;

			const stats = e.get(UnitStats);
			if (stats) {
				const xp = e.get(UnitXP);
				markLevelSums[fid] = (markLevelSums[fid] ?? 0) + (xp?.markLevel ?? 1);
				if (stats.attack > 0) {
					combatUnits[fid] = (combatUnits[fid] ?? 0) + 1;
				} else {
					workerUnits[fid] = (workerUnits[fid] ?? 0) + 1;
				}
				if (stats.maxAp > 3 || stats.attack > 3 || stats.defense > 2) {
					specializedUnits[fid] = (specializedUnits[fid] ?? 0) + 1;
				}
			}
		} else if (CULT_FACTIONS.includes(fid)) {
			cultUnitCount++;
		}
	}

	for (const fid of AI_FACTIONS) {
		const workers = Math.max(1, workerUnits[fid] ?? 1);
		combatToWorkerRatio[fid] = (combatUnits[fid] ?? 0) / workers;
		const total = totalUnitsPerFaction[fid] ?? 0;
		specializationUsage[fid] =
			total > 0 ? ((specializedUnits[fid] ?? 0) / total) * 100 : 0;
		avgMarkLevel[fid] = total > 0 ? (markLevelSums[fid] ?? 0) / total : 1;
	}

	// Synthesis usage: count active synthesis queues per faction
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b || b.buildingType !== "synthesizer") continue;
		if (!AI_FACTIONS.includes(b.factionId)) continue;
		if (e.has(SynthesisQueue)) {
			synthesisUsage[b.factionId] = (synthesisUsage[b.factionId] ?? 0) + 1;
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

	// Territory growth rate: delta since previous snapshot
	const territoryGrowthRate: Record<string, number> = {};
	for (const fid of AI_FACTIONS) {
		const prev = prevSnap?.territoryPctByFaction[fid] ?? 0;
		territoryGrowthRate[fid] = (territoryPctByFaction[fid] ?? 0) - prev;
	}

	// Contested tiles: tiles claimed by 2+ factions
	let contestedTiles = 0;
	if (territory) {
		for (const tt of territory.tiles.values()) {
			if (tt.contested) contestedTiles++;
		}
	}

	// Resource spending: diff from previous checkpoint
	const resourceSpentThisCheckpoint: Record<string, number> = {};
	const stockpileRatio: Record<string, number> = {};
	for (const fid of AI_FACTIONS) {
		const curr = resourcesByFaction[fid] ?? 0;
		const prev = prevResources[fid] ?? 0;
		// Spending is estimated: if current < prev, faction spent at least (prev - curr)
		// But income may have also increased total. Use max(0, prev - curr) as lower bound.
		resourceSpentThisCheckpoint[fid] = Math.max(0, prev - curr);
		// Stockpile ratio: idle resources / max(resources seen, 1)
		const maxSeen = Math.max(curr, prev, 1);
		stockpileRatio[fid] = curr / maxSeen;
	}

	// Leading faction advantage
	const scores = AI_FACTIONS.map((fid) => scoresByFaction[fid] ?? 0);
	scores.sort((a, b) => b - a);
	const leader = scores[0] ?? 0;
	const second = scores[1] ?? 0;
	const leadingFactionAdvantage =
		second > 0 ? leader / second : leader > 0 ? 10 : 1;

	const highestTier = Math.max(
		...Object.values(buildingTierMax).map((v) => v ?? 0),
		1,
	);
	const epoch = computeEpoch(highestTier, turn);

	// Victory proximity: which faction is closest to any victory condition
	let closestVictoryType = "none";
	let closestVictoryProgress = 0;

	const maxTerritory = Math.max(
		...AI_FACTIONS.map((fid) => territoryPctByFaction[fid] ?? 0),
	);
	const dominationTarget = 40;
	const dominationProgress = Math.min(
		100,
		(maxTerritory / dominationTarget) * 100,
	);
	if (dominationProgress > closestVictoryProgress) {
		closestVictoryProgress = dominationProgress;
		closestVictoryType = "domination";
	}

	const maxScore = Math.max(
		...AI_FACTIONS.map((fid) => scoresByFaction[fid] ?? 0),
	);
	const scoreTarget = 200;
	const scoreProgress = Math.min(100, (maxScore / scoreTarget) * 100);
	if (scoreProgress > closestVictoryProgress) {
		closestVictoryProgress = scoreProgress;
		closestVictoryType = "score";
	}

	const maxChainDepth = Math.max(
		...AI_FACTIONS.map((fid) => maxBuildChainDepth[fid] ?? 0),
	);
	const techVictoryTarget = 3;
	const techProgress = Math.min(100, (maxChainDepth / techVictoryTarget) * 100);
	if (epoch.number >= 3 && techProgress > closestVictoryProgress) {
		closestVictoryProgress = techProgress;
		closestVictoryType = "technology";
	}

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
		territoryGrowthRate,
		contestedTiles,
		maxBuildChainDepth,
		buildingDiversity,
		avgBuildingTier,
		specializationUsage,
		combatToWorkerRatio,
		avgMarkLevel,
		resourceSpentThisCheckpoint,
		stockpileRatio,
		synthesisUsage,
		battlesThisCheckpoint: battlesSinceCheckpoint,
		eliminationsThisCheckpoint: eliminationsSinceCheckpoint,
		leadingFactionAdvantage,
		closestVictoryType,
		closestVictoryProgress,
	};
}
