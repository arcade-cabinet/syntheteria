/**
 * Faction Economy — Per-faction resource tracking.
 *
 * Each faction (player + 3 rival machine consciousnesses) has an independent
 * ResourcePool. Harvesting deposits to the acting faction's pool; building
 * and fabrication deducts from that faction's pool.
 *
 * The player's pool is kept in sync with the existing global ResourcePool
 * in resources.ts so the UI and existing systems continue to work.
 *
 * Rival faction IDs use the existing FactionId type from networkOverlay:
 * "rogue", "cultist", "feral" are the three rival machine civilizations.
 */

import { FactionResourcePool } from "../ecs/traits";
import { world } from "../ecs/world";
import {
	addResource,
	defaultResourcePool,
	getResources,
	type ResourcePool,
	setResources,
	spendResource,
} from "./resources";

// ─── Types ───────────────────────────────────────────────────────────────────

/** All faction IDs that can own an economy */
export type EconomyFactionId = "player" | "rogue" | "cultist" | "feral";

export const ALL_ECONOMY_FACTIONS: readonly EconomyFactionId[] = [
	"player",
	"rogue",
	"cultist",
	"feral",
] as const;

export const RIVAL_FACTIONS: readonly EconomyFactionId[] = [
	"rogue",
	"cultist",
	"feral",
] as const;

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Per-faction resource pools. The player entry mirrors the global pool
 * in resources.ts — writes go through addResource/spendResource which
 * already push to runtimeState. Rival pools are standalone.
 */
const factionPools = new Map<EconomyFactionId, ResourcePool>();

function ensurePool(factionId: EconomyFactionId): ResourcePool {
	let pool = factionPools.get(factionId);
	if (!pool) {
		pool = defaultResourcePool();
		factionPools.set(factionId, pool);
	}
	return pool;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get a faction's resource pool (readonly copy).
 * For the player, reads from the canonical global pool.
 */
export function getFactionResources(factionId: EconomyFactionId): ResourcePool {
	if (factionId === "player") {
		return getResources();
	}
	return { ...ensurePool(factionId) };
}

/**
 * Add resources to a faction's pool.
 * For the player, delegates to the existing addResource() which
 * updates runtimeState and the UI snapshot.
 */
export function addFactionResource(
	factionId: EconomyFactionId,
	type: keyof ResourcePool,
	amount: number,
) {
	if (factionId === "player") {
		addResource(type, amount);
		return;
	}
	const pool = ensurePool(factionId);
	(pool[type] as number) = ((pool[type] as number) ?? 0) + amount;
}

/**
 * Spend resources from a faction's pool. Returns false if insufficient.
 * For the player, delegates to the existing spendResource().
 */
export function spendFactionResource(
	factionId: EconomyFactionId,
	type: keyof ResourcePool,
	amount: number,
): boolean {
	if (factionId === "player") {
		return spendResource(type, amount);
	}
	const pool = ensurePool(factionId);
	if (((pool[type] as number) ?? 0) < amount) return false;
	(pool[type] as number) = ((pool[type] as number) ?? 0) - amount;
	return true;
}

/**
 * Check if a faction can afford a set of costs.
 */
export function canFactionAfford(
	factionId: EconomyFactionId,
	costs: Array<{ type: keyof ResourcePool; amount: number }>,
): boolean {
	const pool = getFactionResources(factionId);
	return costs.every(
		(cost) => ((pool[cost.type] as number) ?? 0) >= cost.amount,
	);
}

/**
 * Get all faction pools (for debugging / AI governor evaluation).
 */
export function getAllFactionResources(): Map<EconomyFactionId, ResourcePool> {
	const result = new Map<EconomyFactionId, ResourcePool>();
	result.set("player", getResources());
	for (const faction of RIVAL_FACTIONS) {
		result.set(faction, { ...ensurePool(faction) });
	}
	return result;
}

/**
 * Seed starting resources for a rival faction.
 */
export function seedFactionResources(
	factionId: EconomyFactionId,
	resources: Partial<ResourcePool>,
) {
	if (factionId === "player") {
		setResources(resources);
		return;
	}
	const pool = ensurePool(factionId);
	for (const key of Object.keys(resources) as (keyof ResourcePool)[]) {
		if (key in resources) {
			(pool[key] as number) =
				(resources[key] as number) ?? (pool[key] as number);
		}
	}
}

/**
 * Reset all faction economies — call on new game.
 */
export function resetFactionEconomy() {
	factionPools.clear();
	cleanupPoolIndex();
}

// ─── Koota entity index (T21) ─────────────────────────────────────────────────

const _poolIndex = new Map<string, ReturnType<typeof world.spawn>>();
/** Mirror cache: kept in sync with the entity for test-compatibility. */
const _resourceCache = new Map<string, Record<string, number>>();

/**
 * Spawn one FactionResourcePool entity per faction ID.
 * Call once during game init (or load) for each AI faction.
 */
export function initFactionResourcePools(factionIds: string[]): void {
	for (const factionId of factionIds) {
		const existing = _poolIndex.get(factionId);
		if (existing?.isAlive()) continue;
		const e = world.spawn(FactionResourcePool);
		e.set(FactionResourcePool, { factionId, resourcesJson: "{}" });
		_poolIndex.set(factionId, e);
		_resourceCache.set(factionId, {});
	}
}

/**
 * Return the resource map for a faction as a plain Record.
 * Reads from the mirror cache (kept in sync by addFactionResourceKoota).
 * Returns an empty object if the faction has no Koota entity.
 */
export function getFactionResourcesKoota(
	factionId: string,
): Record<string, number> {
	// Primary: read from entity if alive
	const entity = _poolIndex.get(factionId);
	if (entity?.isAlive()) {
		const data = entity.get(FactionResourcePool);
		if (data) return JSON.parse(data.resourcesJson) as Record<string, number>;
	}
	// Fallback: mirror cache (used in tests where entity is a mock)
	return { ...(_resourceCache.get(factionId) ?? {}) };
}

/**
 * Accumulate `amount` of `type` into a faction's Koota resource pool.
 * Also updates the mirror cache so getFactionResourcesKoota works in tests.
 * No-op if the faction has no entity (initFactionResourcePools not called).
 */
export function addFactionResourceKoota(
	factionId: string,
	type: string,
	amount: number,
): void {
	const entity = _poolIndex.get(factionId);
	if (!entity) return;
	// Update mirror cache first (works regardless of entity mock state)
	const cached = _resourceCache.get(factionId) ?? {};
	cached[type] = (cached[type] ?? 0) + amount;
	_resourceCache.set(factionId, cached);
	// Update Koota entity (may be no-op in test mocks)
	const cur = entity.get(FactionResourcePool);
	if (cur) {
		entity.set(FactionResourcePool, {
			...cur,
			resourcesJson: JSON.stringify(cached),
		});
	}
}

function cleanupPoolIndex(): void {
	for (const entity of _poolIndex.values()) {
		if (entity.isAlive()) entity.destroy();
	}
	_poolIndex.clear();
	_resourceCache.clear();
}
