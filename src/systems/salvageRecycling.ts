/**
 * Salvage & recycling system.
 *
 * When buildings or machines are destroyed, obsolete, or captured, the player
 * can salvage them to recover a fraction of the original material cubes.
 * Recovery rates vary by material type and can be upgraded via the tech tree.
 *
 * Key rules:
 * - Base recovery rates are per-material (e.g. scrap_iron=0.8, copper=0.7)
 * - Salvage time = 2 seconds per cube in the material cost
 * - Tech upgrades can boost recovery up to +0.3 (capped at 1.0)
 * - Partial cancellation: if cancelled at 50%, return 50% of what would have
 *   been recovered at full completion
 * - Materials are returned as floor(count * recoveryRate)
 * - Deterministic — no randomness
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Material cost map: material type -> cube count. */
export type MaterialCost = Record<string, number>;

/** Snapshot of an in-progress salvage operation. */
export interface SalvageProgress {
	/** 0..1 fraction complete */
	progress: number;
	/** Seconds remaining until completion */
	timeRemaining: number;
	/** Materials recovered so far (floor-rounded). */
	materialsRecovered: MaterialCost;
}

/** A completed salvage record for history tracking. */
export interface SalvageRecord {
	entityId: string;
	salvagerId: string;
	materialCost: MaterialCost;
	materialsRecovered: MaterialCost;
	completedFully: boolean;
	timestamp: number;
}

/** Internal data for a registered salvageable entity. */
interface SalvageableEntry {
	entityId: string;
	materialCost: MaterialCost;
}

/** Internal data for an active salvage operation. */
interface ActiveSalvage {
	entityId: string;
	salvagerId: string;
	/** Total time in seconds to complete this salvage. */
	totalTime: number;
	/** Elapsed time in seconds. */
	elapsed: number;
	/** Materials already returned to the player (from partial progress). */
	materialsReturned: MaterialCost;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Seconds of salvage time per cube in the material cost. */
const SECONDS_PER_CUBE = 2;

/** Maximum tech bonus that can be added to base recovery rates. */
const MAX_UPGRADE_BONUS = 0.3;

/** Base recovery rates per material type. Unknown materials default to 0.5. */
const BASE_RECOVERY_RATES: Record<string, number> = {
	scrap_iron: 0.8,
	iron: 0.6,
	copper: 0.7,
	e_waste: 0.9,
	fiber_optics: 0.4,
	rare_alloy: 0.5,
};

const DEFAULT_RECOVERY_RATE = 0.5;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const salvageables = new Map<string, SalvageableEntry>();
const activeSalvages = new Map<string, ActiveSalvage>();
const recoveryBonuses = new Map<string, number>();
const history: SalvageRecord[] = [];
let historyTimestamp = 0;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the effective recovery rate for a material type, accounting
 * for base rate plus any tech upgrade bonus, capped at 1.0.
 */
function effectiveRate(materialType: string): number {
	const base = BASE_RECOVERY_RATES[materialType] ?? DEFAULT_RECOVERY_RATE;
	const bonus = recoveryBonuses.get(materialType) ?? 0;
	return Math.min(base + bonus, 1.0);
}

/**
 * Compute total salvage time from a material cost map.
 * 2 seconds per cube across all material types.
 */
function computeTotalTime(materialCost: MaterialCost): number {
	let totalCubes = 0;
	for (const count of Object.values(materialCost)) {
		totalCubes += count;
	}
	return totalCubes * SECONDS_PER_CUBE;
}

/**
 * Compute materials recovered at a given progress fraction (0..1).
 * Each material: floor(count * recoveryRate * progress)
 */
function computeRecoveredAt(
	materialCost: MaterialCost,
	progress: number,
): MaterialCost {
	const result: MaterialCost = {};
	for (const [mat, count] of Object.entries(materialCost)) {
		const rate = effectiveRate(mat);
		const recovered = Math.floor(count * rate * progress);
		if (recovered > 0) {
			result[mat] = recovered;
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a placed entity as salvageable.
 *
 * @param entityId - unique entity identifier
 * @param materialCost - map of material type to cube count used to build it
 * @returns true if registered, false if already registered
 */
export function registerSalvageable(
	entityId: string,
	materialCost: MaterialCost,
): boolean {
	if (salvageables.has(entityId)) {
		return false;
	}
	salvageables.set(entityId, {
		entityId,
		materialCost: { ...materialCost },
	});
	return true;
}

/**
 * Remove an entity from the salvageable registry.
 *
 * @param entityId - entity to unregister
 * @returns true if it was registered, false if not found
 */
export function unregisterSalvageable(entityId: string): boolean {
	return salvageables.delete(entityId);
}

/**
 * Begin salvaging a registered entity.
 *
 * @param entityId - the entity to salvage
 * @param salvagerId - who is performing the salvage
 * @returns estimated total salvage time in seconds, or null on failure
 */
export function startSalvage(
	entityId: string,
	salvagerId: string,
): number | null {
	const entry = salvageables.get(entityId);
	if (!entry) {
		return null;
	}
	// Cannot start a salvage that is already in progress
	if (activeSalvages.has(entityId)) {
		return null;
	}

	const totalTime = computeTotalTime(entry.materialCost);

	activeSalvages.set(entityId, {
		entityId,
		salvagerId,
		totalTime,
		elapsed: 0,
		materialsReturned: {},
	});

	return totalTime;
}

/**
 * Advance a salvage operation by `delta` seconds.
 *
 * @param entityId - the entity being salvaged
 * @param delta - seconds elapsed since last update
 * @returns object with `complete` flag and `materialsReturned` this tick,
 *          or null if no active salvage for this entity
 */
export function updateSalvage(
	entityId: string,
	delta: number,
): { complete: boolean; materialsReturned: MaterialCost } | null {
	const salvage = activeSalvages.get(entityId);
	if (!salvage) {
		return null;
	}

	const entry = salvageables.get(entityId);
	if (!entry) {
		return null;
	}

	salvage.elapsed = Math.min(salvage.elapsed + delta, salvage.totalTime);
	const progress =
		salvage.totalTime > 0 ? salvage.elapsed / salvage.totalTime : 1;

	// Compute what SHOULD have been returned by now
	const shouldHaveReturned = computeRecoveredAt(
		entry.materialCost,
		progress,
	);

	// Diff against what we already returned
	const newReturns: MaterialCost = {};
	for (const [mat, shouldCount] of Object.entries(shouldHaveReturned)) {
		const alreadyReturned = salvage.materialsReturned[mat] ?? 0;
		const diff = shouldCount - alreadyReturned;
		if (diff > 0) {
			newReturns[mat] = diff;
			salvage.materialsReturned[mat] = shouldCount;
		}
	}

	const complete = salvage.elapsed >= salvage.totalTime;

	if (complete) {
		// Auto-finalize
		const totalReturned = { ...salvage.materialsReturned };
		// Merge any final newReturns into totalReturned
		for (const [mat, count] of Object.entries(newReturns)) {
			totalReturned[mat] = (totalReturned[mat] ?? 0) + count - count; // already merged above
		}

		history.push({
			entityId: salvage.entityId,
			salvagerId: salvage.salvagerId,
			materialCost: { ...entry.materialCost },
			materialsRecovered: { ...salvage.materialsReturned },
			completedFully: true,
			timestamp: historyTimestamp++,
		});

		activeSalvages.delete(entityId);
		salvageables.delete(entityId);
	}

	return { complete, materialsReturned: newReturns };
}

/**
 * Cancel an in-progress salvage. Materials already returned stay with the player.
 *
 * @param entityId - the entity being salvaged
 * @returns materials that were returned before cancellation, or null if no active salvage
 */
export function cancelSalvage(entityId: string): MaterialCost | null {
	const salvage = activeSalvages.get(entityId);
	if (!salvage) {
		return null;
	}

	const entry = salvageables.get(entityId);
	const returned = { ...salvage.materialsReturned };

	history.push({
		entityId: salvage.entityId,
		salvagerId: salvage.salvagerId,
		materialCost: entry ? { ...entry.materialCost } : {},
		materialsRecovered: { ...returned },
		completedFully: false,
		timestamp: historyTimestamp++,
	});

	activeSalvages.delete(entityId);
	return returned;
}

/**
 * Get progress snapshot for an active salvage.
 *
 * @param entityId - the entity being salvaged
 * @returns progress snapshot, or null if not being salvaged
 */
export function getSalvageProgress(entityId: string): SalvageProgress | null {
	const salvage = activeSalvages.get(entityId);
	if (!salvage) {
		return null;
	}

	const progress =
		salvage.totalTime > 0 ? salvage.elapsed / salvage.totalTime : 1;
	const timeRemaining = Math.max(0, salvage.totalTime - salvage.elapsed);

	return {
		progress,
		timeRemaining,
		materialsRecovered: { ...salvage.materialsReturned },
	};
}

/**
 * Finalize a completed salvage and return all recovered materials.
 * This is for manual finalization; `updateSalvage` auto-finalizes when
 * progress reaches 1.0.
 *
 * @param entityId - the entity being salvaged
 * @returns recovered materials, or null if no active salvage
 */
export function completeSalvage(entityId: string): MaterialCost | null {
	const salvage = activeSalvages.get(entityId);
	if (!salvage) {
		return null;
	}

	const entry = salvageables.get(entityId);
	if (!entry) {
		activeSalvages.delete(entityId);
		return null;
	}

	// Compute full recovery (progress = 1.0)
	const fullRecovery = computeRecoveredAt(entry.materialCost, 1.0);

	history.push({
		entityId: salvage.entityId,
		salvagerId: salvage.salvagerId,
		materialCost: { ...entry.materialCost },
		materialsRecovered: { ...fullRecovery },
		completedFully: true,
		timestamp: historyTimestamp++,
	});

	activeSalvages.delete(entityId);
	salvageables.delete(entityId);

	return fullRecovery;
}

/**
 * Get the effective recovery rate for a material type (base + upgrades, capped at 1.0).
 *
 * @param materialType - the material to query
 * @returns fraction recovered (0..1)
 */
export function getRecoveryRate(materialType: string): number {
	return effectiveRate(materialType);
}

/**
 * Upgrade the recovery rate for a material type via tech tree.
 * Bonus is additive with base rate, total capped at 1.0.
 * Cumulative bonus per material type is capped at MAX_UPGRADE_BONUS (0.3).
 *
 * @param materialType - the material to upgrade
 * @param bonus - additional recovery fraction (e.g. 0.1)
 * @returns the new effective rate after upgrade
 */
export function upgradeRecoveryRate(
	materialType: string,
	bonus: number,
): number {
	const current = recoveryBonuses.get(materialType) ?? 0;
	const newBonus = Math.min(current + bonus, MAX_UPGRADE_BONUS);
	recoveryBonuses.set(materialType, newBonus);
	return effectiveRate(materialType);
}

/**
 * List all registered salvageable entities.
 *
 * @returns array of { entityId, materialCost } entries
 */
export function getSalvageableEntities(): Array<{
	entityId: string;
	materialCost: MaterialCost;
}> {
	return Array.from(salvageables.values()).map((e) => ({
		entityId: e.entityId,
		materialCost: { ...e.materialCost },
	}));
}

/**
 * Get the full salvage history for stats/achievements.
 *
 * @returns array of SalvageRecord entries (defensive copies)
 */
export function getSalvageHistory(): SalvageRecord[] {
	return history.map((r) => ({
		...r,
		materialCost: { ...r.materialCost },
		materialsRecovered: { ...r.materialsRecovered },
	}));
}

/**
 * Reset all module state. For test isolation.
 */
export function reset(): void {
	salvageables.clear();
	activeSalvages.clear();
	recoveryBonuses.clear();
	history.length = 0;
	historyTimestamp = 0;
}
