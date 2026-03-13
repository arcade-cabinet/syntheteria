import { getCityModelById } from "../city/catalog/cityCatalog";
import { getActiveWorldSession } from "../world/session";
import type { PathResult } from "./navmesh";

function cellKey(q: number, r: number) {
	return `${q},${r}`;
}

function pathCacheKey(
	startQ: number,
	startR: number,
	goalQ: number,
	goalR: number,
) {
	return `${startQ},${startR}->${goalQ},${goalR}`;
}

// ── Blocked cells from structures ──────────────────────────────────

let cachedBlockedCells: Set<string> | null = null;
let structureGeneration = 0;

/**
 * Returns the set of cell keys that are blocked by structures with
 * passabilityEffect "blocking". Computed lazily and cached until
 * invalidatePathCache() is called.
 */
export function getBlockedCells(): Set<string> {
	if (cachedBlockedCells) {
		return cachedBlockedCells;
	}

	const blocked = new Set<string>();
	const session = getActiveWorldSession();
	if (!session) {
		cachedBlockedCells = blocked;
		return blocked;
	}

	for (const structure of session.sectorStructures) {
		// Only "structure" layer placements can block cells.
		// Details, props, and roofs do not affect passability.
		if (structure.placement_layer !== "structure") {
			continue;
		}

		let model;
		try {
			model = getCityModelById(structure.model_id);
		} catch {
			continue;
		}
		if (model && model.passabilityEffect === "blocking") {
			blocked.add(cellKey(structure.q, structure.r));
		}
	}

	cachedBlockedCells = blocked;
	return blocked;
}

// ── Per-unit path cache ────────────────────────────────────────────

const unitPathCaches = new Map<string, Map<string, PathResult>>();

export function getCachedPath(
	unitId: string,
	startQ: number,
	startR: number,
	goalQ: number,
	goalR: number,
): PathResult | null {
	const unitCache = unitPathCaches.get(unitId);
	if (!unitCache) {
		return null;
	}
	return unitCache.get(pathCacheKey(startQ, startR, goalQ, goalR)) ?? null;
}

export function setCachedPath(
	unitId: string,
	startQ: number,
	startR: number,
	goalQ: number,
	goalR: number,
	result: PathResult,
): void {
	let unitCache = unitPathCaches.get(unitId);
	if (!unitCache) {
		unitCache = new Map();
		unitPathCaches.set(unitId, unitCache);
	}
	unitCache.set(pathCacheKey(startQ, startR, goalQ, goalR), result);
}

/**
 * Invalidate all path caches. Call when:
 * - A structure is placed or destroyed
 * - A new turn begins
 * - The world session changes
 */
export function invalidatePathCache(): void {
	cachedBlockedCells = null;
	unitPathCaches.clear();
	structureGeneration++;
}

/**
 * Invalidate paths for a specific unit (e.g. when it moves).
 */
export function invalidateUnitPathCache(unitId: string): void {
	unitPathCaches.delete(unitId);
}

/**
 * Returns the current structure generation counter.
 * Useful for checking whether cached data is stale.
 */
export function getStructureGeneration(): number {
	return structureGeneration;
}

/**
 * Reset all state — for tests.
 */
export function _resetPathfindingCache(): void {
	cachedBlockedCells = null;
	unitPathCaches.clear();
	structureGeneration = 0;
}
