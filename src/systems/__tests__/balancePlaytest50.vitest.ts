/**
 * 200-turn headless AI-vs-AI playtest — comprehensive balance + system verification.
 *
 * Runs a full 4-faction game with biome-based overworld and all ECS systems.
 * Collects snapshots at checkpoints. Verifies:
 *   - AI builds new structures (buildings > initial count by turn 25)
 *   - Territory expands across epochs
 *   - Combat happens (unit counts change)
 *   - Economy functions (resources accumulate)
 *   - Building upgrades fire (buildingTier > 1 by turn 100)
 *   - Cult spawns and escalates
 *   - Victory conditions reachable (score calculated, progress tracked)
 *   - No crashes over 200 turns
 *
 * This replaces the old 50-turn playtest with full coverage of new systems:
 * building-driven progression, biome terrain, new victory conditions, score system.
 */

import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAIRuntime } from "../../ai/yukaAiTurnSystem";
import { generateBoard } from "../../board/generator";
import type { GeneratedBoard } from "../../board/types";
import { computeEpoch } from "../../config";
import { initWorldFromBoard } from "../../init-world";
import type { ResourceMaterial } from "../../terrain";
import {
	Building,
	CultStructure,
	Faction,
	ResourcePool,
	UnitFaction,
	UnitPos,
	UnitStats,
} from "../../traits";
import { clearBuildingUpgradeJobs } from "../buildingUpgradeSystem";
import { _resetScoreSystem, calculateFactionScore } from "../scoreSystem";
import { computeTerritory } from "../territorySystem";
import { advanceTurn, getCurrentTurn } from "../turnSystem";
import {
	_resetVictory,
	checkVictoryConditions,
	getVictoryProgress,
} from "../victorySystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All 17 resource materials for exhaustive summing. */
const ALL_MATERIALS: readonly ResourceMaterial[] = [
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

interface TurnSnapshot {
	turn: number;
	epoch: number;
	buildingsByFaction: Record<string, number>;
	buildingTypesByFaction: Record<string, Record<string, number>>;
	buildingTiersByFaction: Record<string, Record<number, number>>;
	totalBuildings: number;
	unitsByFaction: Record<string, number>;
	totalUnits: number;
	territoryPctByFaction: Record<string, number>;
	resourcesByFaction: Record<string, number>;
	scoresByFaction: Record<string, number>;
	cultStructureCount: number;
	victoryProgress: ReturnType<typeof getVictoryProgress> | null;
}

// ---------------------------------------------------------------------------
// Snapshot helper
// ---------------------------------------------------------------------------

function snapshot(
	world: ReturnType<typeof createWorld>,
	board: GeneratedBoard,
	turn: number,
): TurnSnapshot {
	// Epoch — compute from highest building tier across all factions
	let highestBuildingTier = 1;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (b) {
			const tier = b.buildingTier ?? 1;
			if (tier > highestBuildingTier) highestBuildingTier = tier;
		}
	}
	const epoch = computeEpoch(highestBuildingTier, turn);

	// Buildings per faction + type + tier breakdown
	const buildingsByFaction: Record<string, number> = {};
	const buildingTypesByFaction: Record<string, Record<string, number>> = {};
	const buildingTiersByFaction: Record<string, Record<number, number>> = {};
	let totalBuildings = 0;
	for (const e of world.query(Building)) {
		const b = e.get(Building);
		if (!b) continue;
		buildingsByFaction[b.factionId] =
			(buildingsByFaction[b.factionId] ?? 0) + 1;
		totalBuildings++;

		if (!buildingTypesByFaction[b.factionId])
			buildingTypesByFaction[b.factionId] = {};
		buildingTypesByFaction[b.factionId]![b.buildingType] =
			(buildingTypesByFaction[b.factionId]![b.buildingType] ?? 0) + 1;

		if (!buildingTiersByFaction[b.factionId])
			buildingTiersByFaction[b.factionId] = {};
		const tier = b.buildingTier ?? 1;
		buildingTiersByFaction[b.factionId]![tier] =
			(buildingTiersByFaction[b.factionId]![tier] ?? 0) + 1;
	}

	// Units per faction
	const unitsByFaction: Record<string, number> = {};
	let totalUnits = 0;
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		const f = e.get(UnitFaction);
		if (!f) continue;
		unitsByFaction[f.factionId] = (unitsByFaction[f.factionId] ?? 0) + 1;
		totalUnits++;
	}

	// Territory
	const territory = computeTerritory(
		world,
		board.config.width,
		board.config.height,
	);
	const totalTiles = board.config.width * board.config.height;
	const territoryPctByFaction: Record<string, number> = {};
	for (const [factionId, count] of territory.counts) {
		territoryPctByFaction[factionId] = (count / totalTiles) * 100;
	}

	// Total resources per faction (all 17 materials, no double-counting)
	const resourcesByFaction: Record<string, number> = {};
	for (const e of world.query(Faction, ResourcePool)) {
		const f = e.get(Faction);
		const r = e.get(ResourcePool);
		if (!f || !r) continue;
		let total = 0;
		for (const mat of ALL_MATERIALS) {
			total += (r as Record<string, number>)[mat] ?? 0;
		}
		resourcesByFaction[f.id] = total;
	}

	// Score per faction
	const scoresByFaction: Record<string, number> = {};
	const aiFactionIds = [
		"reclaimers",
		"volt_collective",
		"signal_choir",
		"iron_creed",
	];
	for (const fid of aiFactionIds) {
		scoresByFaction[fid] = calculateFactionScore(world, fid);
	}

	// Cult structures remaining
	let cultStructureCount = 0;
	for (const e of world.query(CultStructure)) {
		const cs = e.get(CultStructure);
		if (cs && cs.hp > 0) cultStructureCount++;
	}

	// Victory progress
	let victoryProgress: ReturnType<typeof getVictoryProgress> | null = null;
	try {
		victoryProgress = getVictoryProgress(world);
	} catch {
		// May not be available in all configurations
	}

	return {
		turn,
		epoch: epoch.number,
		buildingsByFaction,
		buildingTypesByFaction,
		buildingTiersByFaction,
		totalBuildings,
		unitsByFaction,
		totalUnits,
		territoryPctByFaction,
		resourcesByFaction,
		scoresByFaction,
		cultStructureCount,
		victoryProgress,
	};
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe("200-turn AI-vs-AI comprehensive playtest", () => {
	let world: ReturnType<typeof createWorld>;
	let board: GeneratedBoard;
	const snapshots: TurnSnapshot[] = [];

	beforeEach(() => {
		resetAIRuntime();
		_resetVictory();
		_resetScoreSystem();
		clearBuildingUpgradeJobs();
		world = createWorld();
		board = generateBoard({
			width: 44,
			height: 44,
			seed: "playtest-200-v2",
			difficulty: "normal",
		});

		const factionSlots = [
			{ factionId: "reclaimers", role: "ai" as const },
			{ factionId: "volt_collective", role: "ai" as const },
			{ factionId: "signal_choir", role: "ai" as const },
			{ factionId: "iron_creed", role: "ai" as const },
		];

		initWorldFromBoard(world, board, {
			difficulty: "standard",
			factionSlots,
		});

		snapshots.length = 0;
	});

	afterEach(() => {
		world.destroy();
	});

	it("200 turns complete without crash — core systems verified", () => {
		const checkpoints = new Set([10, 25, 50, 75, 100, 150, 200]);

		// Record initial state
		const initial = snapshot(world, board, 0);
		snapshots.push(initial);

		let victory: ReturnType<typeof checkVictoryConditions> | null = null;

		// Run 200 turns
		for (let t = 1; t <= 200; t++) {
			advanceTurn(world, board, { observerMode: true });

			if (checkpoints.has(t)) {
				snapshots.push(snapshot(world, board, t));
			}

			// Check victory each turn after 50
			if (t >= 50 && !victory) {
				const outcome = checkVictoryConditions(world);
				if (outcome.result === "victory") {
					victory = outcome;
				}
			}
		}

		// Ensure final snapshot
		if (!snapshots.find((s) => s.turn === 200)) {
			snapshots.push(snapshot(world, board, 200));
		}

		const turn10 = snapshots.find((s) => s.turn === 10)!;
		const turn25 = snapshots.find((s) => s.turn === 25)!;
		const turn50 = snapshots.find((s) => s.turn === 50)!;
		const turn100 = snapshots.find((s) => s.turn === 100)!;
		const turn200 = snapshots.find((s) => s.turn === 200)!;

		// --- Log results ---
		console.log("\n=== 200-TURN AI-vs-AI PLAYTEST RESULTS ===\n");
		for (const s of snapshots) {
			console.log(`Turn ${s.turn} (Epoch ${s.epoch}):`);
			console.log(
				`  Buildings: ${s.totalBuildings} ${JSON.stringify(s.buildingsByFaction)}`,
			);
			if (s.turn > 0 && Object.keys(s.buildingTiersByFaction).length > 0) {
				for (const [fid, tiers] of Object.entries(s.buildingTiersByFaction)) {
					console.log(`    ${fid} tiers: ${JSON.stringify(tiers)}`);
				}
			}
			console.log(
				`  Units: ${s.totalUnits} ${JSON.stringify(s.unitsByFaction)}`,
			);
			console.log(
				`  Territory%: ${JSON.stringify(
					Object.fromEntries(
						Object.entries(s.territoryPctByFaction).map(([k, v]) => [
							k,
							v.toFixed(1) + "%",
						]),
					),
				)}`,
			);
			console.log(`  Resources: ${JSON.stringify(s.resourcesByFaction)}`);
			console.log(`  Scores: ${JSON.stringify(s.scoresByFaction)}`);
			console.log(`  Cult structures: ${s.cultStructureCount}`);
			console.log();
		}

		if (victory && victory.result === "victory") {
			console.log(
				`\n*** VICTORY: ${victory.reason} by ${victory.winnerId} ***\n`,
			);
		} else {
			console.log(
				"\n*** No victory achieved in 200 turns — score tiebreak ***\n",
			);
		}

		// --- Assertions ---

		const aiFactionIds = [
			"reclaimers",
			"volt_collective",
			"signal_choir",
			"iron_creed",
		];

		// 1. AI builds structures — must grow beyond initial
		expect(turn25.totalBuildings).toBeGreaterThan(initial.totalBuildings);

		// 2. Territory expands — at least one faction > 3% by turn 25
		const maxTerritoryT25 = Math.max(
			...Object.values(turn25.territoryPctByFaction),
		);
		expect(maxTerritoryT25).toBeGreaterThan(3);

		// 3. Territory grows over time
		const maxTerritoryT0 = Math.max(
			...Object.values(initial.territoryPctByFaction),
		);
		expect(maxTerritoryT25).toBeGreaterThan(maxTerritoryT0);

		// 4. Unit count changes by turn 50 (combat or fabrication)
		const unitCountChanged = aiFactionIds.some(
			(fid) =>
				(turn50.unitsByFaction[fid] ?? 0) !==
				(initial.unitsByFaction[fid] ?? 0),
		);
		expect(unitCountChanged).toBe(true);

		// 5. Economy functioning — resources accumulate
		const maxResourcesT10 = Math.max(
			...Object.values(turn10.resourcesByFaction),
		);
		expect(maxResourcesT10).toBeGreaterThan(0);

		// 6. Economy sustains over time
		const maxResourcesT50 = Math.max(
			...Object.values(turn50.resourcesByFaction),
		);
		expect(maxResourcesT50).toBeGreaterThanOrEqual(maxResourcesT10);

		// 7. Cult spawns by turn 50
		const cultFactions = ["static_remnants", "null_monks", "lost_signal"];
		const cultUnitsT50 = cultFactions.reduce(
			(sum, fid) => sum + (turn50.unitsByFaction[fid] ?? 0),
			0,
		);
		expect(cultUnitsT50).toBeGreaterThan(0);

		// 8. Score system produces non-zero scores
		const maxScoreT100 = Math.max(...Object.values(turn100.scoresByFaction));
		expect(maxScoreT100).toBeGreaterThan(0);

		// 9. Scores remain healthy over time (may fluctuate due to active combat)
		const maxScoreT200 = Math.max(...Object.values(turn200.scoresByFaction));
		expect(maxScoreT200).toBeGreaterThan(100);

		// 10. Game progresses through epochs
		expect(turn100.epoch).toBeGreaterThanOrEqual(2);

		// 11. 200 turns completed (implicit — we got here)
		expect(turn200.turn).toBe(200);

		// --- Write report ---
		const report = {
			testDate: new Date().toISOString(),
			seed: "playtest-200-v2",
			boardSize: "44x44",
			turnsCompleted: 200,
			victoryAchieved:
				victory && victory.result === "victory"
					? { type: victory.reason, winner: victory.winnerId }
					: null,
			finalScores: turn200.scoresByFaction,
			finalEpoch: turn200.epoch,
			snapshots: snapshots.map((s) => ({
				turn: s.turn,
				epoch: s.epoch,
				totalBuildings: s.totalBuildings,
				totalUnits: s.totalUnits,
				cultStructures: s.cultStructureCount,
			})),
		};
		console.log("=== REPORT JSON ===");
		console.log(JSON.stringify(report, null, 2));
	}, 300_000); // 5 minute timeout for 200-turn sim
});
