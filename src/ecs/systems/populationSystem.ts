/**
 * Population cap system.
 *
 * Without a cap, factions spam infinite units. The cap makes
 * infrastructure decisions meaningful — outposts and power plants
 * are your unit supply line, not just territory markers.
 *
 * Cap formula:
 *   base (6) + powered outposts * 4 + powered power plants * 2
 *
 * Cult units are excluded — they're the "barbarian" faction and
 * don't share the infrastructure-based cap.
 */

import type { World } from "koota";
import { Building, Powered } from "../traits/building";
import { UnitFaction, UnitPos } from "../traits/unit";

/** Every faction starts with this cap before any buildings. */
export const BASE_POP_CAP = 6;
/** Each powered outpost adds this many slots. */
export const POP_PER_OUTPOST = 4;
/** Each powered power plant adds this many slots. */
export const POP_PER_POWER_PLANT = 2;

/** Faction IDs that use the cult mech spawner, exempt from pop cap. */
const CULT_FACTION_PREFIX = "cult_";

function isCultFaction(factionId: string): boolean {
	return factionId.startsWith(CULT_FACTION_PREFIX);
}

/**
 * Count the current number of units belonging to a faction.
 * Cult factions are never counted against a pop cap.
 */
export function getPopulation(world: World, factionId: string): number {
	let count = 0;
	for (const e of world.query(UnitPos, UnitFaction)) {
		const f = e.get(UnitFaction);
		if (f && f.factionId === factionId) count++;
	}
	return count;
}

/**
 * Compute the population cap for a faction based on its powered infrastructure.
 *
 * base (6) + powered outposts * 4 + powered power plants * 2
 */
export function getPopCap(world: World, factionId: string): number {
	let outposts = 0;
	let powerPlants = 0;

	for (const e of world.query(Building, Powered)) {
		const b = e.get(Building);
		if (!b || b.factionId !== factionId) continue;
		if (b.buildingType === "outpost") outposts++;
		else if (b.buildingType === "power_plant") powerPlants++;
	}

	return (
		BASE_POP_CAP +
		outposts * POP_PER_OUTPOST +
		powerPlants * POP_PER_POWER_PLANT
	);
}

/**
 * Check whether a faction can spawn another unit (is under its pop cap).
 * Cult factions always return true — they have no cap.
 */
export function canSpawnUnit(world: World, factionId: string): boolean {
	if (isCultFaction(factionId)) return true;
	return getPopulation(world, factionId) < getPopCap(world, factionId);
}
