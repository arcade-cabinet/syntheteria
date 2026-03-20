/**
 * Resource Deltas — tracks per-turn income and expenditure for each resource.
 *
 * Ported from pending/systems/resourceDeltas.ts — adapted to use our
 * snake_case ResourceMaterial type instead of camelCase resource names.
 *
 * Usage:
 *   - Call trackIncome/trackExpenditure when resources are gained/spent
 *   - Call finalizeTurnDeltas() at turn end (before turn counter increments)
 *   - UI reads getResourceDeltas() to display +/- indicators
 *
 * This is module-level state (not ECS traits) because deltas are a global
 * per-turn accumulator, not per-entity data.
 */

import type { ResourceMaterial } from "../terrain/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResourceDelta {
	income: number;
	expenditure: number;
	net: number;
}

export type ResourceDeltaMap = Partial<Record<ResourceMaterial, ResourceDelta>>;

// ─── All resource materials (for full snapshot) ──────────────────────────────

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
] as const;

// ─── State ───────────────────────────────────────────────────────────────────

const currentIncome: Partial<Record<ResourceMaterial, number>> = {};
const currentExpenditure: Partial<Record<ResourceMaterial, number>> = {};

let lastTurnDeltas: ResourceDeltaMap | null = null;

const listeners = new Set<() => void>();

function notify() {
	for (const listener of listeners) {
		listener();
	}
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Call when a resource is gained (harvesting, renewal, scavenging, etc.) */
export function trackIncome(material: ResourceMaterial, amount: number): void {
	if (amount <= 0) return;
	currentIncome[material] = (currentIncome[material] ?? 0) + amount;
}

/** Call when a resource is spent (construction, fabrication, mark upgrades, etc.) */
export function trackExpenditure(
	material: ResourceMaterial,
	amount: number,
): void {
	if (amount <= 0) return;
	currentExpenditure[material] = (currentExpenditure[material] ?? 0) + amount;
}

/** Snapshot current deltas and reset for new turn. Call at turn boundary. */
export function finalizeTurnDeltas(): ResourceDeltaMap {
	const deltas: ResourceDeltaMap = {};
	for (const mat of ALL_MATERIALS) {
		const inc = currentIncome[mat] ?? 0;
		const exp = currentExpenditure[mat] ?? 0;
		deltas[mat] = { income: inc, expenditure: exp, net: inc - exp };
	}

	lastTurnDeltas = deltas;

	// Reset accumulators
	for (const key of Object.keys(currentIncome) as ResourceMaterial[]) {
		delete currentIncome[key];
	}
	for (const key of Object.keys(currentExpenditure) as ResourceMaterial[]) {
		delete currentExpenditure[key];
	}

	notify();
	return deltas;
}

/** Get the last completed turn's resource deltas. Null before first turn ends. */
export function getResourceDeltas(): ResourceDeltaMap | null {
	return lastTurnDeltas;
}

/** Subscribe to delta changes (fires on finalize and reset). */
export function subscribeResourceDeltas(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Reset all delta tracking — call on new game. */
export function resetResourceDeltas(): void {
	for (const key of Object.keys(currentIncome) as ResourceMaterial[]) {
		delete currentIncome[key];
	}
	for (const key of Object.keys(currentExpenditure) as ResourceMaterial[]) {
		delete currentExpenditure[key];
	}
	lastTurnDeltas = null;
	notify();
}
