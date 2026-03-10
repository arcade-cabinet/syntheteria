/**
 * Territory system — spatial ownership and influence.
 *
 * Territories are circular regions anchored to outpost positions.
 * Influence decays linearly from the center to the edge of the radius.
 * When territories from different factions overlap, both suffer
 * contestation strength decay.
 *
 * All query functions are pure (no side-effects, no ECS mutation).
 * The mutation functions (claim/remove) operate on a module-level
 * territory store, following the same pattern as resources.ts.
 */

import type { World } from "miniplex";
import type { Entity } from "../ecs/types";
import { notifyQuestEvent } from "./questSystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Territory {
	id: string;
	ownerId: string; // faction entity ID
	center: { x: number; z: number }; // outpost position
	radius: number; // claim radius in world units
	strength: number; // 0–1, decays with distance from center
	established: number; // game tick when claimed
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

let nextTerritoryId = 0;
const territories: Territory[] = [];

// ---------------------------------------------------------------------------
// Mutation helpers (side-effecting, thin wrappers)
// ---------------------------------------------------------------------------

/**
 * Claim a new territory centred at `position` for `factionId`.
 * Returns the newly created Territory.
 */
export function claimTerritory(
	_world: World<Entity>,
	factionId: string,
	position: { x: number; z: number },
	radius: number,
	tick = 0,
): Territory {
	const territory: Territory = {
		id: `territory_${nextTerritoryId++}`,
		ownerId: factionId,
		center: { x: position.x, z: position.z },
		radius,
		strength: 1,
		established: tick,
	};
	territories.push(territory);

	// Notify quest system of territory claim
	notifyQuestEvent({ type: "territory_claimed", amount: 1 });

	return territory;
}

/**
 * Remove a territory by id. No-op if not found.
 */
export function removeTerritory(
	_world: World<Entity>,
	territoryId: string,
): void {
	const idx = territories.findIndex((t) => t.id === territoryId);
	if (idx !== -1) {
		territories.splice(idx, 1);
	}
}

// ---------------------------------------------------------------------------
// Pure query functions
// ---------------------------------------------------------------------------

/**
 * Get the territory with the highest influence at a position,
 * or null if no territory covers the point.
 */
export function getTerritoryAt(
	position: { x: number; z: number },
	ts: readonly Territory[],
): Territory | null {
	let best: Territory | null = null;
	let bestInfluence = 0;

	for (const t of ts) {
		const influence = calculateInfluence(position, t);
		if (influence > bestInfluence) {
			bestInfluence = influence;
			best = t;
		}
	}
	return best;
}

/**
 * Get the owner faction ID at a position, or null if unclaimed.
 */
export function getTerritoryOwner(
	position: { x: number; z: number },
	ts: readonly Territory[],
): string | null {
	const t = getTerritoryAt(position, ts);
	return t ? t.ownerId : null;
}

/**
 * Find all pairs of territories (from different factions) whose radii overlap.
 * Each pair is returned exactly once — [a, b] where a appears before b in the input.
 */
export function getOverlappingTerritories(
	ts: readonly Territory[],
): Array<[Territory, Territory]> {
	const pairs: Array<[Territory, Territory]> = [];

	for (let i = 0; i < ts.length; i++) {
		for (let j = i + 1; j < ts.length; j++) {
			const a = ts[i];
			const b = ts[j];
			// Only report overlaps between different factions
			if (a.ownerId === b.ownerId) continue;

			const dx = a.center.x - b.center.x;
			const dz = a.center.z - b.center.z;
			const dist = Math.sqrt(dx * dx + dz * dz);

			if (dist < a.radius + b.radius) {
				pairs.push([a, b]);
			}
		}
	}

	return pairs;
}

/**
 * Calculate influence (0–1) of a territory at a position.
 * Influence is 1 at the center and decays linearly to 0 at the radius edge.
 * Points outside the radius return 0.
 * The result is further scaled by the territory's strength.
 */
export function calculateInfluence(
	position: { x: number; z: number },
	territory: Territory,
): number {
	const dx = position.x - territory.center.x;
	const dz = position.z - territory.center.z;
	const dist = Math.sqrt(dx * dx + dz * dz);

	if (dist >= territory.radius) return 0;

	const rawInfluence = 1 - dist / territory.radius;
	return rawInfluence * territory.strength;
}

/**
 * Return all territories belonging to a faction.
 */
export function getAllTerritoriesForFaction(
	factionId: string,
	ts: readonly Territory[],
): Territory[] {
	return ts.filter((t) => t.ownerId === factionId);
}

// ---------------------------------------------------------------------------
// Store access
// ---------------------------------------------------------------------------

/**
 * Get a snapshot of all territories. Returns a shallow copy of the array.
 */
export function getAllTerritories(): readonly Territory[] {
	return [...territories];
}

/**
 * Clear all territories. Primarily for testing.
 */
export function resetTerritories(): void {
	territories.length = 0;
	nextTerritoryId = 0;
}
