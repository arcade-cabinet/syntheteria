/**
 * Diagnostic gap detection for balance reports.
 *
 * Scans a BatchReport for common balance pathologies:
 *   - Stagnation (metrics flat for consecutive checkpoints)
 *   - Snowball (one faction dominates)
 *   - Resource hoarding (resources grow without spending)
 *   - Elimination cascade (factions wiped out too early)
 *   - Victory unreachable (no faction close to any victory threshold)
 *   - Epoch pacing (epochs should advance at a reasonable cadence)
 *   - Cult balance (too weak or too strong)
 *   - Faction homogeneity (all factions playing identically)
 */

import type { BatchReport, CheckpointAggregate, Diagnostic } from "./types";

const AI_FACTIONS = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];

/**
 * Scan a BatchReport for common balance pathologies and return diagnostics.
 *
 * Detects: stagnation, snowball, resource hoarding, elimination cascade,
 * victory unreachable, epoch pacing issues, cult balance, and faction homogeneity.
 *
 * @param report - A BatchReport produced by aggregateRuns().
 * @returns Array of Diagnostic entries with severity, category, and details.
 */
export function diagnoseGaps(report: BatchReport): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	detectStagnation(report, diagnostics);
	detectSnowball(report, diagnostics);
	detectResourceHoarding(report, diagnostics);
	detectEliminationCascade(report, diagnostics);
	detectVictoryUnreachable(report, diagnostics);
	detectEpochPacing(report, diagnostics);
	detectCultBalance(report, diagnostics);
	detectFactionHomogeneity(report, diagnostics);
	detectTurtling(report, diagnostics);
	detectNoSpecialization(report, diagnostics);
	detectOneDimensionalEconomy(report, diagnostics);
	detectDecisiveVictory(report, diagnostics);

	return diagnostics;
}

/**
 * Stagnation: a checkpoint metric unchanged (stddev < 1) for 3+ consecutive checkpoints.
 */
function detectStagnation(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.checkpoints.length < 4) return;

	const metrics: Array<{
		name: string;
		extract: (cp: CheckpointAggregate) => number;
	}> = [
		{ name: "totalBuildings", extract: (cp) => cp.totalBuildings.mean },
		{ name: "totalUnits", extract: (cp) => cp.totalUnits.mean },
		{ name: "maxScore", extract: (cp) => cp.maxScore.mean },
	];

	for (const metric of metrics) {
		let consecutive = 0;
		for (let i = 1; i < report.checkpoints.length; i++) {
			const prev = metric.extract(report.checkpoints[i - 1]!);
			const curr = metric.extract(report.checkpoints[i]!);
			if (Math.abs(curr - prev) < 1) {
				consecutive++;
			} else {
				consecutive = 0;
			}
			if (consecutive >= 3) {
				diagnostics.push({
					severity: "warning",
					category: "stagnation",
					message: `${metric.name} unchanged for ${consecutive + 1} consecutive checkpoints (turns ${report.checkpoints[i - consecutive]!.turn}–${report.checkpoints[i]!.turn})`,
					data: {
						metric: metric.name,
						startTurn: report.checkpoints[i - consecutive]!.turn,
						endTurn: report.checkpoints[i]!.turn,
					},
				});
				break;
			}
		}
	}
}

/**
 * Snowball: one faction's score > 2x all others for 3+ consecutive checkpoints.
 */
function detectSnowball(report: BatchReport, diagnostics: Diagnostic[]): void {
	if (report.runs.length === 0) return;

	for (const run of report.runs) {
		let snowballStreak = 0;
		let snowballFaction = "";

		for (const snap of run.snapshots) {
			if (snap.turn === 0) continue;

			const scores = AI_FACTIONS.map((fid) => ({
				fid,
				score: snap.scoresByFaction[fid] ?? 0,
			}));
			scores.sort((a, b) => b.score - a.score);

			const leader = scores[0];
			const secondBest = scores[1];
			if (
				leader &&
				secondBest &&
				leader.score > 0 &&
				leader.score > 2 * secondBest.score
			) {
				if (snowballFaction === leader.fid) {
					snowballStreak++;
				} else {
					snowballFaction = leader.fid;
					snowballStreak = 1;
				}
			} else {
				snowballStreak = 0;
				snowballFaction = "";
			}

			if (snowballStreak >= 3) {
				diagnostics.push({
					severity: "warning",
					category: "snowball",
					message: `${snowballFaction} dominated (>2x all rivals) for ${snowballStreak}+ checkpoints in seed ${run.seed}`,
					data: {
						faction: snowballFaction,
						streak: snowballStreak,
						seed: run.seed,
					},
				});
				break;
			}
		}
	}
}

/**
 * Resource hoarding: avg resources grow continuously across 3+ checkpoints without spending.
 */
function detectResourceHoarding(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.runs.length === 0) return;

	for (const fid of AI_FACTIONS) {
		let growthStreak = 0;
		for (let i = 1; i < report.checkpoints.length; i++) {
			const prevSnaps = collectFactionResourceMean(report, fid, i - 1);
			const currSnaps = collectFactionResourceMean(report, fid, i);
			if (currSnaps > prevSnaps + 5) {
				growthStreak++;
			} else {
				growthStreak = 0;
			}
			if (growthStreak >= 3) {
				diagnostics.push({
					severity: "info",
					category: "resource_hoarding",
					message: `${fid} resources grew for ${growthStreak + 1}+ consecutive checkpoints — possible hoarding`,
					data: { faction: fid, streak: growthStreak + 1 },
				});
				break;
			}
		}
	}
}

/**
 * Elimination cascade: >50% of AI factions eliminated before midpoint.
 */
function detectEliminationCascade(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	const midTurn = Math.floor(report.turnCount / 2);

	for (const run of report.runs) {
		let eliminated = 0;
		for (const fid of AI_FACTIONS) {
			for (const snap of run.snapshots) {
				if (snap.turn > 0 && snap.turn <= midTurn) {
					if ((snap.unitsByFaction[fid] ?? 0) === 0) {
						eliminated++;
						break;
					}
				}
			}
		}

		if (eliminated > AI_FACTIONS.length / 2) {
			diagnostics.push({
				severity: "critical",
				category: "elimination_cascade",
				message: `${eliminated}/${AI_FACTIONS.length} factions eliminated before turn ${midTurn} in seed ${run.seed}`,
				data: {
					eliminatedCount: eliminated,
					midTurn,
					seed: run.seed,
				},
			});
		}
	}
}

/**
 * Victory unreachable: at the final checkpoint, no faction within 50% of any score-based threshold.
 */
function detectVictoryUnreachable(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.victoryRate > 0) return;
	if (report.checkpoints.length === 0) return;

	const final = report.checkpoints[report.checkpoints.length - 1]!;
	if (final.maxScore.max < 50 && report.turnCount >= 50) {
		diagnostics.push({
			severity: "warning",
			category: "victory_unreachable",
			message: `Max score across all runs is only ${final.maxScore.max.toFixed(0)} at turn ${final.turn} — victory thresholds may be unreachable`,
			data: {
				maxScore: final.maxScore.max,
				turn: final.turn,
			},
		});
	}
}

/**
 * Epoch pacing: epochs should advance roughly every 20-30 turns. Flag if stuck.
 */
function detectEpochPacing(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.checkpoints.length < 3) return;

	const final = report.checkpoints[report.checkpoints.length - 1]!;
	const expectedEpoch = Math.min(5, 1 + Math.floor(final.turn / 25));

	if (final.epoch.mean < expectedEpoch - 1 && final.turn >= 50) {
		diagnostics.push({
			severity: "warning",
			category: "epoch_pacing",
			message: `Epoch pacing slow: mean epoch ${final.epoch.mean.toFixed(1)} at turn ${final.turn} (expected ~${expectedEpoch})`,
			data: {
				meanEpoch: final.epoch.mean,
				expectedEpoch,
				turn: final.turn,
			},
		});
	}
}

/**
 * Cult balance: cult too weak (< 3 units at late game) or too strong (> 50% of all units).
 */
function detectCultBalance(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.checkpoints.length < 2) return;

	const final = report.checkpoints[report.checkpoints.length - 1]!;
	const totalUnits = final.totalUnits.mean + final.cultUnits.mean;

	if (totalUnits > 0) {
		const cultPct = final.cultUnits.mean / totalUnits;
		if (cultPct > 0.5 && final.cultUnits.mean > 5) {
			diagnostics.push({
				severity: "warning",
				category: "cult_balance",
				message: `Cult units are ${(cultPct * 100).toFixed(0)}% of all units at turn ${final.turn} — cult may be too strong`,
				data: {
					cultUnitMean: final.cultUnits.mean,
					totalUnitMean: totalUnits,
					cultPct,
				},
			});
		}
	}

	if (
		report.turnCount >= 50 &&
		final.cultUnits.mean < 3 &&
		final.cultStructures.mean < 1
	) {
		diagnostics.push({
			severity: "info",
			category: "cult_balance",
			message: `Cult presence minimal at turn ${final.turn} (${final.cultUnits.mean.toFixed(1)} units, ${final.cultStructures.mean.toFixed(1)} structures) — cult may be too weak`,
			data: {
				cultUnitMean: final.cultUnits.mean,
				cultStructureMean: final.cultStructures.mean,
			},
		});
	}
}

/**
 * Faction homogeneity: all factions with similar scores indicates lack of strategic diversity.
 */
function detectFactionHomogeneity(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	const scores = Object.values(report.factions).map((f) => f.avgFinalScore);
	if (scores.length < 2) return;

	const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
	if (mean === 0) return;

	const coefficientOfVariation =
		Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length) /
		mean;

	if (coefficientOfVariation < 0.1 && report.turnCount >= 30) {
		diagnostics.push({
			severity: "info",
			category: "faction_homogeneity",
			message: `All factions scored similarly (CV=${(coefficientOfVariation * 100).toFixed(1)}%) — strategies may lack differentiation`,
			data: {
				coefficientOfVariation,
				scores: Object.fromEntries(
					Object.entries(report.factions).map(([fid, f]) => [
						fid,
						f.avgFinalScore,
					]),
				),
			},
		});
	}
}

/** Extract mean resource total for a faction at a given checkpoint index. */
function collectFactionResourceMean(
	report: BatchReport,
	factionId: string,
	checkpointIndex: number,
): number {
	const cp = report.checkpoints[checkpointIndex];
	if (!cp) return 0;

	const turn = cp.turn;
	let total = 0;
	let count = 0;
	for (const run of report.runs) {
		const snap = run.snapshots.find((s) => s.turn === turn);
		if (snap) {
			total += snap.resourcesByFaction[factionId] ?? 0;
			count++;
		}
	}
	return count > 0 ? total / count : 0;
}

/**
 * Turtling: no battles for 5+ consecutive checkpoints AND all factions alive.
 */
function detectTurtling(report: BatchReport, diagnostics: Diagnostic[]): void {
	for (const run of report.runs) {
		let peacefulStreak = 0;
		for (const snap of run.snapshots) {
			if (snap.turn === 0) continue;

			const allAlive = AI_FACTIONS.every(
				(fid) => (snap.unitsByFaction[fid] ?? 0) > 0,
			);
			const noBattles = snap.battlesThisCheckpoint === 0;

			if (noBattles && allAlive) {
				peacefulStreak++;
			} else {
				peacefulStreak = 0;
			}

			if (peacefulStreak >= 5) {
				diagnostics.push({
					severity: "warning",
					category: "turtling",
					message: `No battles for ${peacefulStreak}+ checkpoints with all factions alive in seed ${run.seed} (turn ${snap.turn})`,
					data: {
						streak: peacefulStreak,
						seed: run.seed,
						turn: snap.turn,
					},
				});
				break;
			}
		}
	}
}

/**
 * No specialization: <20% of units have specialization tracks by turn 50.
 */
function detectNoSpecialization(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.turnCount < 50) return;

	for (const run of report.runs) {
		const midSnap = run.snapshots.find((s) => s.turn >= 50);
		if (!midSnap) continue;

		for (const fid of AI_FACTIONS) {
			const usage = midSnap.specializationUsage[fid] ?? 0;
			if (usage < 20 && (midSnap.unitsByFaction[fid] ?? 0) >= 4) {
				diagnostics.push({
					severity: "info",
					category: "no_specialization",
					message: `${fid} only ${usage.toFixed(0)}% specialized by turn ${midSnap.turn} in seed ${run.seed}`,
					data: { faction: fid, usage, seed: run.seed },
				});
			}
		}
	}
}

/**
 * One-dimensional economy: faction has only 1-2 building types.
 */
function detectOneDimensionalEconomy(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	if (report.turnCount < 30) return;

	for (const run of report.runs) {
		const finalSnap = run.snapshots[run.snapshots.length - 1];
		if (!finalSnap || finalSnap.turn < 30) continue;

		for (const fid of AI_FACTIONS) {
			const diversity = finalSnap.buildingDiversity[fid] ?? 0;
			const totalBuildings = finalSnap.buildingsByFaction[fid] ?? 0;
			if (diversity <= 2 && totalBuildings >= 3) {
				diagnostics.push({
					severity: "warning",
					category: "one_dimensional_economy",
					message: `${fid} has only ${diversity} building type(s) with ${totalBuildings} buildings at turn ${finalSnap.turn} in seed ${run.seed}`,
					data: {
						faction: fid,
						diversity,
						totalBuildings,
						seed: run.seed,
					},
				});
			}
		}
	}
}

/**
 * Decisive victory check: does ANYONE win before the turn cap?
 */
function detectDecisiveVictory(
	report: BatchReport,
	diagnostics: Diagnostic[],
): void {
	const decisiveWins = report.runs.filter(
		(r) => r.victoryType !== null && r.victoryType !== "score",
	);

	if (decisiveWins.length > 0) {
		const avgTurn =
			decisiveWins.reduce((sum, r) => sum + (r.victoryTurn ?? 0), 0) /
			decisiveWins.length;
		const types = [...new Set(decisiveWins.map((r) => r.victoryType))];
		diagnostics.push({
			severity: "info",
			category: "decisive_victory",
			message: `${decisiveWins.length}/${report.runs.length} runs had decisive victories (avg turn ${avgTurn.toFixed(0)}, types: ${types.join(", ")})`,
			data: {
				count: decisiveWins.length,
				total: report.runs.length,
				avgTurn,
				types,
			},
		});
	} else {
		diagnostics.push({
			severity: "warning",
			category: "decisive_victory",
			message: `No decisive victories in ${report.runs.length} runs — all ended at turn cap`,
			data: { count: 0, total: report.runs.length },
		});
	}
}
