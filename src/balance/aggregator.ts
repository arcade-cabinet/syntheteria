/**
 * Statistical aggregation for balance harness runs.
 *
 * Computes per-checkpoint and per-faction aggregate metrics across multiple
 * game runs, producing a BatchReport with min/max/mean/stddev/median stats.
 */

import type {
	AggregateMetric,
	BatchReport,
	CheckpointAggregate,
	FactionAggregate,
	RunResult,
	RunSnapshot,
} from "./types";

const AI_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];

/**
 * Aggregate results from multiple game runs into a BatchReport.
 *
 * Computes per-checkpoint and per-faction statistics (min/max/mean/stddev/median)
 * across all runs, plus overall victory rate and average game length.
 *
 * @param runs - Array of RunResult from runSingleGame().
 * @param tier - Balance tier label for the report.
 * @param turnCount - Configured turn count for this batch.
 * @param boardSize - Board size label (e.g. "64x64").
 * @returns A BatchReport with aggregated checkpoint and faction data.
 */
export function aggregateRuns(
	runs: RunResult[],
	tier: number,
	turnCount: number,
	boardSize: string,
): BatchReport {
	const checkpoints = aggregateCheckpoints(runs);
	const factions = aggregateFactions(runs);

	const victoriesCount = runs.filter((r) => r.victoryType !== null).length;
	const victoryRate = runs.length > 0 ? victoriesCount / runs.length : 0;

	const gameLengths = runs.map((r) => r.victoryTurn ?? r.turnCount);
	const avgGameLength =
		gameLengths.length > 0
			? gameLengths.reduce((a, b) => a + b, 0) / gameLengths.length
			: turnCount;

	return {
		tier,
		turnCount,
		runCount: runs.length,
		boardSize,
		timestamp: new Date().toISOString(),
		runs,
		checkpoints,
		factions,
		diagnostics: [],
		victoryRate,
		avgGameLength,
	};
}

function aggregateCheckpoints(runs: RunResult[]): CheckpointAggregate[] {
	if (runs.length === 0) return [];

	const turnSet = new Set<number>();
	for (const run of runs) {
		for (const snap of run.snapshots) {
			turnSet.add(snap.turn);
		}
	}
	const turns = [...turnSet].sort((a, b) => a - b);

	return turns.map((turn) => {
		const snapshots = collectSnapshotsAtTurn(runs, turn);

		return {
			turn,
			totalBuildings: computeAggregate(
				snapshots.map((s) => sumValues(s.buildingsByFaction)),
			),
			totalUnits: computeAggregate(
				snapshots.map((s) => sumValues(s.unitsByFaction)),
			),
			maxTerritoryPct: computeAggregate(
				snapshots.map((s) => maxValue(s.territoryPctByFaction)),
			),
			maxScore: computeAggregate(
				snapshots.map((s) => maxValue(s.scoresByFaction)),
			),
			cultUnits: computeAggregate(snapshots.map((s) => s.cultUnitCount)),
			cultStructures: computeAggregate(
				snapshots.map((s) => s.cultStructureCount),
			),
			epoch: computeAggregate(snapshots.map((s) => s.epoch)),
		};
	});
}

function aggregateFactions(
	runs: RunResult[],
): Record<string, FactionAggregate> {
	const result: Record<string, FactionAggregate> = {};

	for (const fid of AI_FACTIONS) {
		const wins = runs.filter((r) => r.victoryWinner === fid).length;
		const winRate = runs.length > 0 ? wins / runs.length : 0;

		const eliminationData = runs.map((r) => {
			const finalSnap = r.snapshots[r.snapshots.length - 1];
			if (!finalSnap) return { eliminated: false, turn: r.turnCount };
			const units = finalSnap.unitsByFaction[fid] ?? 0;
			if (units === 0) {
				const elimTurn = findEliminationTurn(r, fid);
				return { eliminated: true, turn: elimTurn };
			}
			return { eliminated: false, turn: r.turnCount };
		});

		const eliminated = eliminationData.filter((d) => d.eliminated);
		const eliminationRate =
			runs.length > 0 ? eliminated.length / runs.length : 0;
		const avgEliminationTurn =
			eliminated.length > 0
				? eliminated.reduce((a, d) => a + d.turn, 0) / eliminated.length
				: 0;

		const finalScores = runs.map((r) => {
			const finalSnap = r.snapshots[r.snapshots.length - 1];
			return finalSnap?.scoresByFaction[fid] ?? 0;
		});
		const avgFinalScore =
			finalScores.length > 0
				? finalScores.reduce((a, b) => a + b, 0) / finalScores.length
				: 0;

		let peakScore = 0;
		for (const run of runs) {
			for (const snap of run.snapshots) {
				const score = snap.scoresByFaction[fid] ?? 0;
				if (score > peakScore) peakScore = score;
			}
		}

		const finalBuildings = runs.map((r) => {
			const finalSnap = r.snapshots[r.snapshots.length - 1];
			return finalSnap?.buildingsByFaction[fid] ?? 0;
		});
		const avgBuildingCount =
			finalBuildings.length > 0
				? finalBuildings.reduce((a, b) => a + b, 0) / finalBuildings.length
				: 0;

		const finalUnits = runs.map((r) => {
			const finalSnap = r.snapshots[r.snapshots.length - 1];
			return finalSnap?.unitsByFaction[fid] ?? 0;
		});
		const avgUnitCount =
			finalUnits.length > 0
				? finalUnits.reduce((a, b) => a + b, 0) / finalUnits.length
				: 0;

		const finalTerritory = runs.map((r) => {
			const finalSnap = r.snapshots[r.snapshots.length - 1];
			return finalSnap?.territoryPctByFaction[fid] ?? 0;
		});
		const avgTerritoryPct =
			finalTerritory.length > 0
				? finalTerritory.reduce((a, b) => a + b, 0) / finalTerritory.length
				: 0;

		result[fid] = {
			winRate,
			eliminationRate,
			avgEliminationTurn,
			avgFinalScore,
			peakScore,
			avgBuildingCount,
			avgUnitCount,
			avgTerritoryPct,
		};
	}

	return result;
}

function findEliminationTurn(run: RunResult, factionId: string): number {
	for (const snap of run.snapshots) {
		if ((snap.unitsByFaction[factionId] ?? 0) === 0 && snap.turn > 0) {
			return snap.turn;
		}
	}
	return run.turnCount;
}

function collectSnapshotsAtTurn(
	runs: RunResult[],
	turn: number,
): RunSnapshot[] {
	const result: RunSnapshot[] = [];
	for (const run of runs) {
		const snap = run.snapshots.find((s) => s.turn === turn);
		if (snap) result.push(snap);
	}
	return result;
}

function sumValues(record: Record<string, number>): number {
	return Object.values(record).reduce((a, b) => a + b, 0);
}

function maxValue(record: Record<string, number>): number {
	const values = Object.values(record);
	return values.length > 0 ? Math.max(...values) : 0;
}

export function computeAggregate(values: number[]): AggregateMetric {
	if (values.length === 0) {
		return { min: 0, max: 0, mean: 0, stddev: 0, median: 0 };
	}

	const sorted = [...values].sort((a, b) => a - b);
	const n = sorted.length;
	const mean = sorted.reduce((a, b) => a + b, 0) / n;
	const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
	const median =
		n % 2 === 0
			? ((sorted[n / 2 - 1] ?? 0) + (sorted[n / 2] ?? 0)) / 2
			: (sorted[Math.floor(n / 2)] ?? 0);

	return {
		min: sorted[0] ?? 0,
		max: sorted[n - 1] ?? 0,
		mean,
		stddev: Math.sqrt(variance),
		median,
	};
}
