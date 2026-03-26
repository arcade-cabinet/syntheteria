/**
 * Compute system -- global cognitive resource.
 *
 * From CONSCIOUSNESS_MODEL.md:
 * - Compute is the player's unified cognitive capacity
 * - Supplied by server rack buildings (net contributors)
 * - Consumed by each managed unit proportional to complexity
 * - When compute is exhausted, excess units become "vulnerable"
 *   (can be hacked by enemies)
 *
 * Compute contributors: server_rack buildings (when powered)
 * Compute consumers: all player units (each costs some compute to manage)
 *
 * The Vulnerable trait marks units that lack compute oversight.
 */

import type { Entity } from "koota";
import {
	BuildingTrait,
	Faction,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { parseComponents } from "../ecs/types";
import { world } from "../ecs/world";

/** Base compute provided by the player's core consciousness */
export const BASE_COMPUTE = 5;

/** Compute provided per powered server rack */
export const COMPUTE_PER_SERVER_RACK = 10;

/** Base compute consumed per player unit */
export const COMPUTE_PER_UNIT = 1;

/** Additional compute consumed per functional component beyond 2 */
export const COMPUTE_PER_EXTRA_COMPONENT = 0.5;

export interface ComputeSnapshot {
	/** Total compute capacity (base + server racks) */
	capacity: number;
	/** Total compute demanded by all player units */
	demand: number;
	/** Available compute (capacity - demand, can be negative) */
	available: number;
	/** Number of powered server racks contributing */
	serverRackCount: number;
	/** Number of player units consuming compute */
	unitCount: number;
	/** Number of vulnerable units (compute-starved) */
	vulnerableCount: number;
}

let lastSnapshot: ComputeSnapshot = {
	capacity: BASE_COMPUTE,
	demand: 0,
	available: BASE_COMPUTE,
	serverRackCount: 0,
	unitCount: 0,
	vulnerableCount: 0,
};

/**
 * Calculate compute capacity from base + powered server racks.
 */
function calculateCapacity(): { capacity: number; rackCount: number } {
	let rackCount = 0;
	for (const entity of world.query(BuildingTrait, Position)) {
		const bldg = entity.get(BuildingTrait)!;
		if (bldg.buildingType === "server_rack" && bldg.powered) {
			rackCount++;
		}
	}
	return {
		capacity: BASE_COMPUTE + rackCount * COMPUTE_PER_SERVER_RACK,
		rackCount,
	};
}

/**
 * Calculate compute demand for a single unit based on its complexity.
 * More functional components = more compute needed.
 */
export function getUnitComputeDemand(entity: Entity): number {
	const comps = parseComponents(entity.get(UnitComponents)?.componentsJson);
	const functionalCount = comps.filter((c) => c.functional).length;
	const extraComponents = Math.max(0, functionalCount - 2);
	return COMPUTE_PER_UNIT + extraComponents * COMPUTE_PER_EXTRA_COMPONENT;
}

/**
 * Calculate total compute demanded by all player units.
 * Returns { demand, unitCount, vulnerableUnits }.
 */
function calculateDemand(capacity: number): {
	demand: number;
	unitCount: number;
	vulnerableCount: number;
} {
	let totalDemand = 0;
	let unitCount = 0;

	// Collect all player units with their compute demands
	const units: { entity: Entity; demand: number }[] = [];

	for (const entity of world.query(Unit, Faction, UnitComponents, Position)) {
		if (entity.get(Faction)?.value !== "player") continue;
		unitCount++;
		const demand = getUnitComputeDemand(entity);
		totalDemand += demand;
		units.push({ entity, demand });
	}

	// Determine which units are vulnerable (last added = first to lose compute)
	// Units are vulnerable when cumulative demand exceeds capacity
	let vulnerableCount = 0;
	if (totalDemand > capacity) {
		// Sort by demand descending -- most expensive units become vulnerable first
		units.sort((a, b) => b.demand - a.demand);
		let remaining = totalDemand - capacity;
		for (const u of units) {
			if (remaining <= 0) break;
			remaining -= u.demand;
			vulnerableCount++;
		}
	}

	return { demand: totalDemand, unitCount, vulnerableCount };
}

export function getComputeSnapshot(): ComputeSnapshot {
	return lastSnapshot;
}

/**
 * Compute system tick. Called once per sim tick.
 * Recalculates capacity and demand, updates vulnerability state.
 */
export function computeSystem(): void {
	const { capacity, rackCount } = calculateCapacity();
	const { demand, unitCount, vulnerableCount } = calculateDemand(capacity);

	lastSnapshot = {
		capacity: Math.round(capacity * 10) / 10,
		demand: Math.round(demand * 10) / 10,
		available: Math.round((capacity - demand) * 10) / 10,
		serverRackCount: rackCount,
		unitCount,
		vulnerableCount,
	};
}

/** Reset compute state (for testing) */
export function resetCompute(): void {
	lastSnapshot = {
		capacity: BASE_COMPUTE,
		demand: 0,
		available: BASE_COMPUTE,
		serverRackCount: 0,
		unitCount: 0,
		vulnerableCount: 0,
	};
}
