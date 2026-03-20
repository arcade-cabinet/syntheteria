/**
 * Resource Deltas — tracks per-turn income and expenditure for each resource.
 *
 * Hooks into addResource/spendResource to accumulate deltas within a turn.
 * At turn end, the deltas are snapshotted and reset for the new turn.
 * The UI reads the previous turn's snapshot to display +/- indicators.
 */

import type { ResourcePool } from "./resources";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResourceDelta {
	income: number;
	expenditure: number;
	net: number;
}

export type ResourceDeltaMap = Record<keyof ResourcePool, ResourceDelta>;

// ─── State ───────────────────────────────────────────────────────────────────

/** Accumulates deltas for the current turn in progress */
const currentIncome: Record<string, number> = {};
const currentExpenditure: Record<string, number> = {};

/** Snapshot of the last completed turn's deltas */
let lastTurnDeltas: ResourceDeltaMap | null = null;

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Call when a resource is gained (from harvesting, scavenging, etc.) */
export function trackResourceIncome(type: keyof ResourcePool, amount: number) {
	if (amount <= 0) return;
	currentIncome[type] = (currentIncome[type] ?? 0) + amount;
}

/** Call when a resource is spent (construction, fabrication, etc.) */
export function trackResourceExpenditure(
	type: keyof ResourcePool,
	amount: number,
) {
	if (amount <= 0) return;
	currentExpenditure[type] = (currentExpenditure[type] ?? 0) + amount;
}

/** Snapshot current deltas and reset for new turn. Call at turn boundary. */
export function finalizeTurnDeltas() {
	const allKeys: (keyof ResourcePool)[] = [
		"scrapMetal",
		"eWaste",
		"intactComponents",
		"ferrousScrap",
		"alloyStock",
		"polymerSalvage",
		"conductorWire",
		"electrolyte",
		"siliconWafer",
		"stormCharge",
		"elCrystal",
	];

	const deltas = {} as ResourceDeltaMap;
	for (const key of allKeys) {
		const inc = currentIncome[key] ?? 0;
		const exp = currentExpenditure[key] ?? 0;
		deltas[key] = { income: inc, expenditure: exp, net: inc - exp };
	}

	lastTurnDeltas = deltas;

	// Reset accumulators
	for (const key of Object.keys(currentIncome)) {
		delete currentIncome[key];
	}
	for (const key of Object.keys(currentExpenditure)) {
		delete currentExpenditure[key];
	}

	notify();
}

/** Get the last completed turn's resource deltas. */
export function getResourceDeltas(): ResourceDeltaMap | null {
	return lastTurnDeltas;
}

export function subscribeResourceDeltas(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Reset all delta tracking — call on new game. */
export function resetResourceDeltas() {
	for (const key of Object.keys(currentIncome)) {
		delete currentIncome[key];
	}
	for (const key of Object.keys(currentExpenditure)) {
		delete currentExpenditure[key];
	}
	lastTurnDeltas = null;
	notify();
}
