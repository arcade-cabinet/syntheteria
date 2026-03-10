/**
 * Territory effects — gameplay modifiers based on territory ownership.
 *
 * Pure functions that compute bonuses, cost reductions, and alerts
 * based on territory state. These are called by other systems (resources,
 * building placement, exploration, combat) to apply territory bonuses.
 *
 * Effects:
 * - Resource gathering bonus in owned territory (1.5x gather rate)
 * - Building cost reduction in owned territory (0.8x)
 * - Fog of war reveal within territory radius
 * - Enemy intrusion alert when hostile enters your territory
 * - Territory contestation: overlapping claims reduce both strengths
 */

import {
	calculateInfluence,
	getOverlappingTerritories,
	getTerritoryOwner,
	type Territory,
} from "./territory";

// Inline territory config (mirrors config/territory.json) to avoid
// import-assertion syntax that TypeScript / Vitest cannot resolve.
const territoryConfig = {
	resourceBonusInTerritory: 1.5,
	buildingCostReduction: 0.8,
	contestationDecayRate: 0.01,
} as const;

// ---------------------------------------------------------------------------
// Resource bonus
// ---------------------------------------------------------------------------

/**
 * Return the resource gathering multiplier at a position for a given faction.
 * Returns `resourceBonusInTerritory` (default 1.5) if the position is inside
 * the faction's own territory, 1.0 otherwise.
 */
export function getResourceMultiplier(
	position: { x: number; z: number },
	factionId: string,
	territories: readonly Territory[],
): number {
	const owner = getTerritoryOwner(position, territories);
	if (owner === factionId) {
		return territoryConfig.resourceBonusInTerritory;
	}
	return 1.0;
}

// ---------------------------------------------------------------------------
// Building cost reduction
// ---------------------------------------------------------------------------

/**
 * Return the building cost multiplier at a position for a given faction.
 * Returns `buildingCostReduction` (default 0.8) inside own territory,
 * 1.0 otherwise.
 */
export function getBuildingCostMultiplier(
	position: { x: number; z: number },
	factionId: string,
	territories: readonly Territory[],
): number {
	const owner = getTerritoryOwner(position, territories);
	if (owner === factionId) {
		return territoryConfig.buildingCostReduction;
	}
	return 1.0;
}

// ---------------------------------------------------------------------------
// Fog of war reveal
// ---------------------------------------------------------------------------

/**
 * Check whether a position should be revealed due to territory ownership.
 * A position is revealed if it falls within any territory owned by `factionId`.
 */
export function isTerritoryRevealed(
	position: { x: number; z: number },
	factionId: string,
	territories: readonly Territory[],
): boolean {
	for (const t of territories) {
		if (t.ownerId !== factionId) continue;
		const influence = calculateInfluence(position, t);
		if (influence > 0) return true;
	}
	return false;
}

// ---------------------------------------------------------------------------
// Enemy intrusion alerts
// ---------------------------------------------------------------------------

export interface IntrusionAlert {
	territoryId: string;
	territoryOwnerId: string;
	intruderId: string;
	intruderFaction: string;
	position: { x: number; z: number };
}

/**
 * Detect hostile entities inside owned territories.
 *
 * `entities` should be an iterable of objects with at minimum
 * `id`, `faction`, and `worldPosition`.
 *
 * Returns one alert per intruder per territory (an entity can trigger
 * alerts in multiple overlapping territories).
 */
export function detectIntrusions(
	entities: Iterable<{
		id: string;
		faction: string;
		worldPosition?: { x: number; z: number };
	}>,
	territories: readonly Territory[],
): IntrusionAlert[] {
	const alerts: IntrusionAlert[] = [];

	for (const entity of entities) {
		if (!entity.worldPosition) continue;

		for (const t of territories) {
			// Skip if entity belongs to territory owner
			if (entity.faction === t.ownerId) continue;

			const influence = calculateInfluence(entity.worldPosition, t);
			if (influence > 0) {
				alerts.push({
					territoryId: t.id,
					territoryOwnerId: t.ownerId,
					intruderId: entity.id,
					intruderFaction: entity.faction,
					position: {
						x: entity.worldPosition.x,
						z: entity.worldPosition.z,
					},
				});
			}
		}
	}

	return alerts;
}

// ---------------------------------------------------------------------------
// Territory contestation
// ---------------------------------------------------------------------------

/**
 * Apply contestation decay to all territories with overlapping claims
 * from different factions. Each tick, overlapping territories lose
 * `contestationDecayRate` strength.
 *
 * Mutates the territory objects in place. Strength is clamped to [0, 1].
 */
export function applyContestationDecay(territories: Territory[]): void {
	const overlaps = getOverlappingTerritories(territories);
	const decayRate = territoryConfig.contestationDecayRate;

	for (const [a, b] of overlaps) {
		a.strength = Math.max(0, a.strength - decayRate);
		b.strength = Math.max(0, b.strength - decayRate);
	}
}

/**
 * Check whether a position is contested (influenced by multiple factions).
 * Returns the faction IDs that have influence at the position, or an empty
 * array if none or only one faction has influence.
 */
export function getContestingFactions(
	position: { x: number; z: number },
	territories: readonly Territory[],
): string[] {
	const factions = new Set<string>();

	for (const t of territories) {
		const influence = calculateInfluence(position, t);
		if (influence > 0) {
			factions.add(t.ownerId);
		}
	}

	return factions.size >= 2 ? Array.from(factions) : [];
}
