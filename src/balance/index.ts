/**
 * @package balance
 *
 * Multi-tier balance harness — automated game simulation, statistical
 * aggregation, and diagnostic gap detection for game balance tuning.
 */

export { aggregateRuns } from "./aggregator";
export { diagnoseGaps } from "./diagnostics";
export { type RunConfig, runSingleGame } from "./runner";
export type {
	AggregateMetric,
	BatchReport,
	CheckpointAggregate,
	Diagnostic,
	FactionAggregate,
	RunResult,
	RunSnapshot,
} from "./types";

import { aggregateRuns } from "./aggregator";
import { diagnoseGaps } from "./diagnostics";
import { runSingleGame } from "./runner";
import type { BatchReport, RunResult } from "./types";

/**
 * Run a complete balance test tier.
 *
 * Each run uses a unique seed for variance. State is fully reset between runs.
 */
export function runBalanceTier(
	tier: number,
	turnCount: number,
	runCount: number,
	configOverrides?: Record<string, unknown>,
	opts?: {
		boardWidth?: number;
		boardHeight?: number;
		gameSpeed?: "quick" | "standard" | "epic" | "marathon";
	},
): BatchReport {
	const boardWidth = opts?.boardWidth ?? 44;
	const boardHeight = opts?.boardHeight ?? 44;
	const gameSpeed = opts?.gameSpeed ?? "standard";

	const runs: RunResult[] = [];
	for (let i = 0; i < runCount; i++) {
		runs.push(
			runSingleGame({
				turnCount,
				boardWidth,
				boardHeight,
				seed: `balance-tier${tier}-run${i}`,
				checkpointInterval: Math.max(1, Math.floor(turnCount / 10)),
				configOverrides,
				gameSpeed,
			}),
		);
	}
	const report = aggregateRuns(
		runs,
		tier,
		turnCount,
		`${boardWidth}x${boardHeight}`,
	);
	report.diagnostics = diagnoseGaps(report);
	return report;
}

/**
 * Print a human-readable summary of a balance report.
 */
export function printBalanceSummary(report: BatchReport): void {
	console.log(
		`\n=== BALANCE TIER ${report.tier}: ${report.runCount} runs × ${report.turnCount} turns ===\n`,
	);
	console.log(`Victory rate: ${(report.victoryRate * 100).toFixed(0)}%`);
	console.log(`Avg game length: ${report.avgGameLength.toFixed(0)} turns`);
	console.log();

	for (const [fid, stats] of Object.entries(report.factions)) {
		console.log(
			`${fid}: score ${stats.avgFinalScore.toFixed(0)} | win ${(stats.winRate * 100).toFixed(0)}% | elim ${(stats.eliminationRate * 100).toFixed(0)}% | bldg ${stats.avgBuildingCount.toFixed(0)} | units ${stats.avgUnitCount.toFixed(0)} | terr ${stats.avgTerritoryPct.toFixed(1)}%`,
		);
	}
	console.log();

	if (report.diagnostics.length === 0) {
		console.log("No diagnostic issues found");
	} else {
		for (const d of report.diagnostics) {
			const icon =
				d.severity === "critical"
					? "[CRITICAL]"
					: d.severity === "warning"
						? "[WARNING]"
						: "[INFO]";
			console.log(`${icon} [${d.category}] ${d.message}`);
		}
	}
}
