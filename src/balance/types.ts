/**
 * Balance harness report types — snapshot, aggregation, and diagnostic interfaces.
 */

export interface RunSnapshot {
	turn: number;
	epoch: number;
	buildingsByFaction: Record<string, number>;
	buildingTierMax: Record<string, number>;
	unitsByFaction: Record<string, number>;
	territoryPctByFaction: Record<string, number>;
	resourcesByFaction: Record<string, number>;
	scoresByFaction: Record<string, number>;
	cultUnitCount: number;
	cultStructureCount: number;
}

export interface RunResult {
	seed: string;
	turnCount: number;
	snapshots: RunSnapshot[];
	victoryType: string | null;
	victoryWinner: string | null;
	victoryTurn: number | null;
	durationMs: number;
}

export interface AggregateMetric {
	min: number;
	max: number;
	mean: number;
	stddev: number;
	median: number;
}

export interface FactionAggregate {
	winRate: number;
	eliminationRate: number;
	avgEliminationTurn: number;
	avgFinalScore: number;
	peakScore: number;
	avgBuildingCount: number;
	avgUnitCount: number;
	avgTerritoryPct: number;
}

export interface CheckpointAggregate {
	turn: number;
	totalBuildings: AggregateMetric;
	totalUnits: AggregateMetric;
	maxTerritoryPct: AggregateMetric;
	maxScore: AggregateMetric;
	cultUnits: AggregateMetric;
	cultStructures: AggregateMetric;
	epoch: AggregateMetric;
}

export interface Diagnostic {
	severity: "info" | "warning" | "critical";
	category: string;
	message: string;
	data?: Record<string, unknown>;
}

export interface BatchReport {
	tier: number;
	turnCount: number;
	runCount: number;
	boardSize: string;
	timestamp: string;
	runs: RunResult[];
	checkpoints: CheckpointAggregate[];
	factions: Record<string, FactionAggregate>;
	diagnostics: Diagnostic[];
	victoryRate: number;
	avgGameLength: number;
}
