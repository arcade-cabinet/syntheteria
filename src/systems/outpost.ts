/**
 * Outpost system — buildings that establish territory.
 *
 * Outposts are special buildings anchored to the ECS via the existing
 * building component. Each outpost has a tier (1–3) that determines its
 * territory radius and upgrade cost.
 *
 * Tunables sourced from config/territory.json.
 *
 * The module keeps a lightweight side-table mapping entity IDs to outpost
 * metadata, mirroring the pattern used by resources and fabrication.
 */

import { config } from "../../config";
import { getTerrainHeight } from "../ecs/terrain";

const territoryCfg = config.territory;
import type { Entity } from "../ecs/types";
import { destroyEntityById, spawnKootaEntity } from "../ecs/koota/bridge";
import { getEntityById } from "../ecs/koota/compat";
import { world } from "../ecs/world";
import {
	claimTerritory,
	removeTerritory as removeTerritoryById,
	type Territory,
} from "./territory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutpostRecord {
	entityId: string;
	tier: number;
	territoryId: string;
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

const outposts = new Map<string, OutpostRecord>();

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

/**
 * Radius for a given tier, sourced from config.
 * Falls back to a sensible formula if the tier exceeds config entries.
 */
export function getOutpostRadius(tier: number): number {
	const entry = territoryCfg.outpostTiers.find((t: { tier: number }) => t.tier === tier);
	if (entry) return entry.radius;
	// Fallback: extrapolate from last defined tier
	const last =
		territoryCfg.outpostTiers[territoryCfg.outpostTiers.length - 1];
	return last.radius + (tier - last.tier) * 15;
}

/**
 * Return the tier of an existing outpost, or 0 if not found.
 */
export function getOutpostTier(outpostId: string): number {
	const record = outposts.get(outpostId);
	return record ? record.tier : 0;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new outpost entity and its associated territory claim.
 *
 * Returns the entity id of the created outpost, or null if placement
 * violates the minimum spacing constraint.
 */
export function createOutpost(
	factionId: string,
	position: { x: number; z: number },
	tier = 1,
	tick = 0,
): string | null {
	// Enforce minimum spacing
	for (const [, record] of outposts) {
		const existing = getEntityById(record.entityId);
		if (!existing?.worldPosition) continue;

		const dx = existing.worldPosition.x - position.x;
		const dz = existing.worldPosition.z - position.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < territoryCfg.minimumOutpostSpacing) {
			return null;
		}
	}

	const radius = getOutpostRadius(tier);
	const y = getTerrainHeight(position.x, position.z);

	const { miniplex: entity } = spawnKootaEntity({
		id: `outpost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
		faction: factionId as Entity["faction"],
		worldPosition: { x: position.x, y, z: position.z },
		building: {
			type: "outpost",
			powered: true,
			operational: true,
			selected: false,
			components: [],
		},
	} as Partial<Entity> & { id: string });

	const territory = claimTerritory(world, factionId, position, radius, tick);

	outposts.set(entity.id, {
		entityId: entity.id,
		tier,
		territoryId: territory.id,
	});

	return entity.id;
}

/**
 * Upgrade an outpost to the next tier.
 * Returns true if the upgrade succeeded, false if the outpost is already
 * at maximum tier or doesn't exist.
 */
export function upgradeOutpost(outpostId: string, tick = 0): boolean {
	const record = outposts.get(outpostId);
	if (!record) return false;

	const maxTier = territoryCfg.outpostTiers.length;
	if (record.tier >= maxTier) return false;

	const entity = getEntityById(outpostId);
	if (!entity?.worldPosition) return false;

	// Remove old territory and create expanded one
	removeTerritoryById(world, record.territoryId);

	const newTier = record.tier + 1;
	const newRadius = getOutpostRadius(newTier);

	const territory = claimTerritory(
		world,
		entity.faction,
		{ x: entity.worldPosition.x, z: entity.worldPosition.z },
		newRadius,
		tick,
	);

	record.tier = newTier;
	record.territoryId = territory.id;

	return true;
}

/**
 * Destroy an outpost — removes the building entity and its territory.
 */
export function destroyOutpost(outpostId: string): void {
	const record = outposts.get(outpostId);
	if (!record) return;

	removeTerritoryById(world, record.territoryId);

	destroyEntityById(outpostId);
	outposts.delete(outpostId);
}

// ---------------------------------------------------------------------------
// Store access
// ---------------------------------------------------------------------------

/**
 * Get all outpost records. Primarily for rendering / UI.
 */
export function getAllOutposts(): ReadonlyMap<string, OutpostRecord> {
	return outposts;
}

/**
 * Clear all outpost records. Primarily for testing.
 */
export function resetOutposts(): void {
	outposts.clear();
}

/**
 * Look up the territory associated with an outpost.
 */
export function getOutpostTerritory(
	outpostId: string,
	territories: readonly Territory[],
): Territory | undefined {
	const record = outposts.get(outpostId);
	if (!record) return undefined;
	return territories.find((t) => t.id === record.territoryId);
}
