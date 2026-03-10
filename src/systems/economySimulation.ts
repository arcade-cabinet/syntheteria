/**
 * Economy simulation system — per-faction economic tracking.
 *
 * Tracks GDP/wealth, production/consumption rates, trade balance,
 * and economic health scores for each faction. Runs at a configurable
 * tick interval and provides ranking/comparison utilities.
 *
 * Integrates with:
 * - cubeEconomy (cube stockpile values)
 * - diplomacy (trade-related config values)
 * - territory (territory count for GDP calculation)
 *
 * All tunables sourced from config/diplomacy.json via the centralized config index.
 */

import { config } from "../../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FactionEconomy {
	faction: string;
	/** Total economic value: cubes + buildings + territory */
	gdp: number;
	/** Number of cubes in stockpile */
	cubeStockpile: number;
	/** Value of cube stockpile */
	cubeValue: number;
	/** Number of buildings owned */
	buildingCount: number;
	/** Number of territories controlled */
	territoryCount: number;
	/** Cubes produced in current tracking window */
	productionRate: number;
	/** Cubes consumed (crafting/building) in current tracking window */
	consumptionRate: number;
	/** Net cubes received via trade in current tracking window */
	tradeImports: number;
	/** Net cubes sent via trade in current tracking window */
	tradeExports: number;
	/** Trade balance: imports - exports (positive = net importer) */
	tradeBalance: number;
	/** Economic health score 0-100 */
	healthScore: number;
	/** Tick when this snapshot was last updated */
	lastUpdated: number;
}

export interface EconomySnapshot {
	tick: number;
	factions: FactionEconomy[];
}

// ---------------------------------------------------------------------------
// Config references
// ---------------------------------------------------------------------------

const diplomacyCfg = config.diplomacy;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Per-faction economy records keyed by faction id */
const economies = new Map<string, FactionEconomy>();

/** Historical snapshots for trend analysis */
const snapshots: EconomySnapshot[] = [];

/** Production events accumulated since last update */
const productionAccumulator = new Map<string, number>();

/** Consumption events accumulated since last update */
const consumptionAccumulator = new Map<string, number>();

/** Trade import events accumulated since last update */
const importAccumulator = new Map<string, number>();

/** Trade export events accumulated since last update */
const exportAccumulator = new Map<string, number>();

/** Configurable update interval (defaults to diplomacy checkInterval) */
let updateInterval: number = diplomacyCfg.checkInterval;

/** Maximum number of historical snapshots retained */
const MAX_SNAPSHOTS = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureEconomy(faction: string): FactionEconomy {
	let economy = economies.get(faction);
	if (!economy) {
		economy = {
			faction,
			gdp: 0,
			cubeStockpile: 0,
			cubeValue: 0,
			buildingCount: 0,
			territoryCount: 0,
			productionRate: 0,
			consumptionRate: 0,
			tradeImports: 0,
			tradeExports: 0,
			tradeBalance: 0,
			healthScore: 50,
			lastUpdated: 0,
		};
		economies.set(faction, economy);
	}
	return economy;
}

/**
 * Calculate economic health score (0-100).
 *
 * Factors:
 * - Production vs consumption ratio (weight 40)
 * - Stockpile size (weight 30)
 * - Trade balance (weight 15)
 * - Territory count (weight 15)
 */
function calculateHealthScore(economy: FactionEconomy): number {
	let score = 0;

	// Production/consumption ratio: 40 points
	// Score 40 if production >= consumption, scale down linearly
	if (economy.consumptionRate === 0) {
		score += economy.productionRate > 0 ? 40 : 20;
	} else {
		const ratio = economy.productionRate / economy.consumptionRate;
		score += Math.min(40, Math.round(ratio * 20));
	}

	// Stockpile: 30 points
	// Each cube in stockpile is worth up to 30 points, capped at 50 cubes
	const stockpileScore = Math.min(30, Math.round((economy.cubeStockpile / 50) * 30));
	score += stockpileScore;

	// Trade balance: 15 points
	// Positive balance (net exporter) is considered healthy
	if (economy.tradeBalance <= 0) {
		// Net exporter or balanced
		score += 15;
	} else {
		// Net importer — score decreases with import dependency
		const importRatio =
			economy.productionRate > 0
				? economy.tradeImports / economy.productionRate
				: economy.tradeImports > 0
					? 0
					: 1;
		score += Math.max(0, Math.round(15 * (1 - importRatio)));
	}

	// Territory: 15 points
	// Each territory is worth 5 points, capped at 15
	score += Math.min(15, economy.territoryCount * 5);

	return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Public API — Event recording
// ---------------------------------------------------------------------------

/**
 * Record cube production for a faction.
 * Called by compression/mining systems when cubes are created.
 */
export function recordProduction(faction: string, amount: number): void {
	const current = productionAccumulator.get(faction) ?? 0;
	productionAccumulator.set(faction, current + amount);
}

/**
 * Record cube consumption for a faction.
 * Called by crafting/building systems when cubes are consumed.
 */
export function recordConsumption(faction: string, amount: number): void {
	const current = consumptionAccumulator.get(faction) ?? 0;
	consumptionAccumulator.set(faction, current + amount);
}

/**
 * Record a trade import (cubes received) for a faction.
 */
export function recordImport(faction: string, amount: number): void {
	const current = importAccumulator.get(faction) ?? 0;
	importAccumulator.set(faction, current + amount);
}

/**
 * Record a trade export (cubes sent) for a faction.
 */
export function recordExport(faction: string, amount: number): void {
	const current = exportAccumulator.get(faction) ?? 0;
	exportAccumulator.set(faction, current + amount);
}

// ---------------------------------------------------------------------------
// Public API — State updates
// ---------------------------------------------------------------------------

/**
 * Update a faction's cube stockpile and value.
 * Should be called with current values from the cubeEconomy system.
 */
export function updateStockpile(
	faction: string,
	cubeCount: number,
	cubeValue: number,
): void {
	const economy = ensureEconomy(faction);
	economy.cubeStockpile = cubeCount;
	economy.cubeValue = cubeValue;
}

/**
 * Update a faction's building count.
 */
export function updateBuildingCount(faction: string, count: number): void {
	const economy = ensureEconomy(faction);
	economy.buildingCount = count;
}

/**
 * Update a faction's territory count.
 */
export function updateTerritoryCount(faction: string, count: number): void {
	const economy = ensureEconomy(faction);
	economy.territoryCount = count;
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get the economy record for a faction.
 * Returns a copy to prevent external mutation.
 */
export function getEconomy(faction: string): FactionEconomy {
	return { ...ensureEconomy(faction) };
}

/**
 * Get all faction economies as an array.
 * Returns copies to prevent external mutation.
 */
export function getAllEconomies(): FactionEconomy[] {
	return Array.from(economies.values()).map((e) => ({ ...e }));
}

/**
 * Rank factions by economic power (GDP descending).
 * Returns an array of faction economy records sorted by GDP.
 */
export function rankFactions(): FactionEconomy[] {
	return getAllEconomies().sort((a, b) => b.gdp - a.gdp);
}

/**
 * Get historical snapshots for trend analysis.
 */
export function getSnapshots(): EconomySnapshot[] {
	return snapshots.map((s) => ({
		tick: s.tick,
		factions: s.factions.map((f) => ({ ...f })),
	}));
}

/**
 * Set the update interval (number of ticks between economy recalculations).
 */
export function setUpdateInterval(interval: number): void {
	updateInterval = interval;
}

/**
 * Get the current update interval.
 */
export function getUpdateInterval(): number {
	return updateInterval;
}

// ---------------------------------------------------------------------------
// Main system tick
// ---------------------------------------------------------------------------

/**
 * Run economy simulation. Called once per game tick.
 * Only performs calculations at the configured interval.
 *
 * Flushes accumulated production/consumption/trade events,
 * recalculates GDP, health scores, and stores a snapshot.
 */
export function economySimulation(currentTick: number): void {
	if (currentTick % updateInterval !== 0) return;

	// Reset all rates to 0 before flushing — if a faction had no events
	// this window its rates should drop to 0, not retain the previous value.
	for (const economy of economies.values()) {
		economy.productionRate = 0;
		economy.consumptionRate = 0;
		economy.tradeImports = 0;
		economy.tradeExports = 0;
	}

	// Flush accumulators into economy records
	for (const [faction, amount] of productionAccumulator) {
		const economy = ensureEconomy(faction);
		economy.productionRate = amount;
	}
	for (const [faction, amount] of consumptionAccumulator) {
		const economy = ensureEconomy(faction);
		economy.consumptionRate = amount;
	}
	for (const [faction, amount] of importAccumulator) {
		const economy = ensureEconomy(faction);
		economy.tradeImports = amount;
	}
	for (const [faction, amount] of exportAccumulator) {
		const economy = ensureEconomy(faction);
		economy.tradeExports = amount;
	}

	// Clear accumulators for next window
	productionAccumulator.clear();
	consumptionAccumulator.clear();
	importAccumulator.clear();
	exportAccumulator.clear();

	// Recalculate GDP and health for each faction
	for (const economy of economies.values()) {
		// GDP = cube value + building value (10 per building) + territory value (25 per territory)
		economy.tradeBalance = economy.tradeImports - economy.tradeExports;
		economy.gdp =
			economy.cubeValue +
			economy.buildingCount * 10 +
			economy.territoryCount * 25;
		economy.healthScore = calculateHealthScore(economy);
		economy.lastUpdated = currentTick;
	}

	// Store snapshot
	const snapshot: EconomySnapshot = {
		tick: currentTick,
		factions: Array.from(economies.values()).map((e) => ({ ...e })),
	};
	snapshots.push(snapshot);

	// Trim old snapshots
	while (snapshots.length > MAX_SNAPSHOTS) {
		snapshots.shift();
	}
}

// ---------------------------------------------------------------------------
// Reset (testing)
// ---------------------------------------------------------------------------

/**
 * Clear all economy state. Primarily for testing.
 */
export function resetEconomy(): void {
	economies.clear();
	snapshots.length = 0;
	productionAccumulator.clear();
	consumptionAccumulator.clear();
	importAccumulator.clear();
	exportAccumulator.clear();
	updateInterval = diplomacyCfg.checkInterval;
}
