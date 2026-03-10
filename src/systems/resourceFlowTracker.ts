/**
 * Resource flow tracker — monitors production and consumption rates
 * across the game economy.
 *
 * Tracks per-tick inflows and outflows for each resource type, computes
 * rolling averages, and detects supply shortages or surpluses.
 *
 * Used by the HUD to show production graphs and by AI governors to
 * make economic decisions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceFlow {
	resource: string;
	produced: number; // total produced in current window
	consumed: number; // total consumed in current window
	netFlow: number; // produced - consumed
	avgProducedPerTick: number;
	avgConsumedPerTick: number;
}

export interface FlowSnapshot {
	tick: number;
	flows: ResourceFlow[];
	totalProduction: number;
	totalConsumption: number;
}

export type FlowStatus = "surplus" | "balanced" | "deficit" | "critical";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rolling window size in ticks for computing averages. */
const WINDOW_SIZE = 60;

/** Threshold ratios for flow status. */
const SURPLUS_THRESHOLD = 1.5; // production >= 1.5x consumption
const DEFICIT_THRESHOLD = 0.5; // production < 0.5x consumption

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Per-resource, per-tick production/consumption. */
const productionHistory = new Map<string, number[]>();
const consumptionHistory = new Map<string, number[]>();

/** Current tick's accumulator. */
const tickProduction = new Map<string, number>();
const tickConsumption = new Map<string, number>();

let currentTick = 0;
let windowSize = WINDOW_SIZE;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateHistory(
	map: Map<string, number[]>,
	resource: string,
): number[] {
	let arr = map.get(resource);
	if (!arr) {
		arr = [];
		map.set(resource, arr);
	}
	return arr;
}

function computeWindowAvg(history: number[]): number {
	if (history.length === 0) return 0;
	const window = history.slice(-windowSize);
	const sum = window.reduce((a, b) => a + b, 0);
	return sum / window.length;
}

function computeWindowTotal(history: number[]): number {
	const window = history.slice(-windowSize);
	return window.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Public API — Recording
// ---------------------------------------------------------------------------

/**
 * Record production of a resource this tick.
 */
export function recordProduction(resource: string, amount: number): void {
	const current = tickProduction.get(resource) ?? 0;
	tickProduction.set(resource, current + amount);
}

/**
 * Record consumption of a resource this tick.
 */
export function recordConsumption(resource: string, amount: number): void {
	const current = tickConsumption.get(resource) ?? 0;
	tickConsumption.set(resource, current + amount);
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get the current flow snapshot for all tracked resources.
 */
export function getFlowSnapshot(): FlowSnapshot {
	const allResources = new Set([
		...productionHistory.keys(),
		...consumptionHistory.keys(),
	]);

	const flows: ResourceFlow[] = [];
	let totalProduction = 0;
	let totalConsumption = 0;

	for (const resource of allResources) {
		const prodHist = productionHistory.get(resource) ?? [];
		const consHist = consumptionHistory.get(resource) ?? [];

		const produced = computeWindowTotal(prodHist);
		const consumed = computeWindowTotal(consHist);
		const avgProd = computeWindowAvg(prodHist);
		const avgCons = computeWindowAvg(consHist);

		flows.push({
			resource,
			produced,
			consumed,
			netFlow: produced - consumed,
			avgProducedPerTick: Math.round(avgProd * 100) / 100,
			avgConsumedPerTick: Math.round(avgCons * 100) / 100,
		});

		totalProduction += produced;
		totalConsumption += consumed;
	}

	flows.sort((a, b) => a.resource.localeCompare(b.resource));

	return { tick: currentTick, flows, totalProduction, totalConsumption };
}

/**
 * Get flow for a specific resource.
 */
export function getResourceFlow(resource: string): ResourceFlow | null {
	const prodHist = productionHistory.get(resource);
	const consHist = consumptionHistory.get(resource);

	if (!prodHist && !consHist) return null;

	const produced = computeWindowTotal(prodHist ?? []);
	const consumed = computeWindowTotal(consHist ?? []);

	return {
		resource,
		produced,
		consumed,
		netFlow: produced - consumed,
		avgProducedPerTick: Math.round(computeWindowAvg(prodHist ?? []) * 100) / 100,
		avgConsumedPerTick: Math.round(computeWindowAvg(consHist ?? []) * 100) / 100,
	};
}

/**
 * Determine the supply status for a resource.
 */
export function getFlowStatus(resource: string): FlowStatus {
	const flow = getResourceFlow(resource);
	if (!flow) return "balanced";

	if (flow.avgConsumedPerTick === 0) {
		return flow.avgProducedPerTick > 0 ? "surplus" : "balanced";
	}

	const ratio = flow.avgProducedPerTick / flow.avgConsumedPerTick;

	if (ratio >= SURPLUS_THRESHOLD) return "surplus";
	if (ratio >= DEFICIT_THRESHOLD) return "balanced";
	if (ratio > 0) return "deficit";
	return "critical";
}

/**
 * Get all resources currently in deficit or critical status.
 */
export function getDeficitResources(): string[] {
	const result: string[] = [];
	const allResources = new Set([
		...productionHistory.keys(),
		...consumptionHistory.keys(),
	]);

	for (const resource of allResources) {
		const status = getFlowStatus(resource);
		if (status === "deficit" || status === "critical") {
			result.push(resource);
		}
	}

	return result.sort();
}

// ---------------------------------------------------------------------------
// System tick
// ---------------------------------------------------------------------------

/**
 * Flush tick accumulators into history. Called once per tick.
 */
export function resourceFlowSystem(tick: number): void {
	currentTick = tick;

	// Record all resources that have any activity
	const allResources = new Set([
		...tickProduction.keys(),
		...tickConsumption.keys(),
		...productionHistory.keys(),
		...consumptionHistory.keys(),
	]);

	for (const resource of allResources) {
		const prod = tickProduction.get(resource) ?? 0;
		const cons = tickConsumption.get(resource) ?? 0;

		getOrCreateHistory(productionHistory, resource).push(prod);
		getOrCreateHistory(consumptionHistory, resource).push(cons);

		// Trim history to window size * 2 to prevent unbounded growth
		const maxLen = windowSize * 2;
		const prodHist = productionHistory.get(resource)!;
		const consHist = consumptionHistory.get(resource)!;
		if (prodHist.length > maxLen) prodHist.splice(0, prodHist.length - maxLen);
		if (consHist.length > maxLen) consHist.splice(0, consHist.length - maxLen);
	}

	// Clear tick accumulators
	tickProduction.clear();
	tickConsumption.clear();
}

/**
 * Set the rolling window size for averages.
 */
export function setWindowSize(size: number): void {
	windowSize = Math.max(1, size);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetResourceFlowTracker(): void {
	productionHistory.clear();
	consumptionHistory.clear();
	tickProduction.clear();
	tickConsumption.clear();
	currentTick = 0;
	windowSize = WINDOW_SIZE;
}
