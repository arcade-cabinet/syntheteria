/**
 * Raid system — enemy factions raid player stockpiles, steal cubes,
 * and carry them back to their territory.
 *
 * Raids follow a state machine: APPROACH → ENGAGE → LOOT → RETREAT.
 *
 * Each raiding unit can grab one cube (Grabbable trait) and carry it
 * via a HeldBy relation back to the faction's home territory.
 *
 * Tunables sourced from config/combat.json (raid section).
 *
 * Integrates with existing combat (component-based damage) and
 * pathfinding (navmesh A*) systems.
 */

import { config } from "../../config";
import type { Entity, UnitEntity, Vec3 } from "../ecs/types";
import { units } from "../ecs/koota/compat";
import { findPath } from "./pathfinding";

// ---------------------------------------------------------------------------
// Config-driven constants
// ---------------------------------------------------------------------------

const raidCfg = config.combat.raid;

const ENGAGE_RANGE = raidCfg.engageRange;
const LOOT_RANGE = raidCfg.lootRange;
const RETREAT_ARRIVAL_RANGE = raidCfg.retreatArrivalRange;

// ---------------------------------------------------------------------------
// Raid phases
// ---------------------------------------------------------------------------

export type RaidPhase =
	| "APPROACH"
	| "ENGAGE"
	| "LOOT"
	| "RETREAT"
	| "DONE"
	| "CANCELLED";

// ---------------------------------------------------------------------------
// Grabbable / HeldBy — cube traits for raiding
// ---------------------------------------------------------------------------

/** A cube entity that can be picked up by a raiding unit. */
export interface Grabbable {
	/** Resource type this cube represents. */
	resourceType: "scrapMetal" | "eWaste" | "intactComponents";
	/** How much of that resource the cube is worth. */
	value: number;
	/** Weight of the cube (required by Entity.grabbable). */
	weight: number;
}

/** Relation: this cube is currently held by a unit. */
export interface HeldBy {
	unitId: string;
}

/**
 * Extended entity type that includes cube traits.
 * Cubes are ECS entities with worldPosition + grabbable.
 * Uses `raidHeldBy` to avoid conflict with Entity.heldBy (which is a string).
 */
export interface CubeEntity extends Entity {
	worldPosition: Vec3;
	grabbable: Grabbable;
	/** Raid-specific held-by relation (separate from Entity.heldBy). */
	raidHeldBy?: HeldBy;
}

// ---------------------------------------------------------------------------
// Raid plan
// ---------------------------------------------------------------------------

export interface RaidPlan {
	id: string;
	faction: Entity["faction"];
	targetPosition: Vec3;
	/** Home position units retreat to after looting. */
	homePosition: Vec3;
	unitIds: string[];
	phase: RaidPhase;
	/** Cube entity IDs that have been looted during this raid. */
	stolenCubeIds: string[];
	/** Timestamp when the raid was created. */
	createdTick: number;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let nextRaidId = 0;
const activeRaids = new Map<string, RaidPlan>();

// Cube registry — tracks cube entities that exist in the world.
// Cubes are lightweight ECS entities with worldPosition + grabbable + optional heldBy.
const cubeEntities = new Map<string, CubeEntity>();

// ---------------------------------------------------------------------------
// Cube management helpers
// ---------------------------------------------------------------------------

/** Register a cube entity so the raid system can find it. */
export function registerCube(cube: CubeEntity): void {
	cubeEntities.set(cube.id, cube);
}

/** Unregister a cube (e.g., when consumed or destroyed). */
export function unregisterCube(id: string): void {
	cubeEntities.delete(id);
}

/** Get all registered cube entities. */
export function getCubes(): CubeEntity[] {
	return Array.from(cubeEntities.values());
}

/** Get a cube by id. */
export function getCube(id: string): CubeEntity | undefined {
	return cubeEntities.get(id);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a raid plan targeting a position (typically a player stockpile).
 * Units must already exist in the ECS world and belong to the given faction.
 *
 * @param faction  - the attacking faction
 * @param targetPosition - world-space position of the stockpile to raid
 * @param unitIds  - ids of the units assigned to this raid
 * @param homePosition - where units should retreat to after looting
 * @param tick     - current simulation tick
 * @returns the raid id
 */
export function planRaid(
	faction: Entity["faction"],
	targetPosition: Vec3,
	unitIds: string[],
	homePosition: Vec3,
	tick: number = 0,
): string {
	const id = `raid_${nextRaidId++}`;
	const raid: RaidPlan = {
		id,
		faction,
		targetPosition,
		homePosition,
		unitIds: [...unitIds],
		phase: "APPROACH",
		stolenCubeIds: [],
		createdTick: tick,
	};
	activeRaids.set(id, raid);

	// Issue move orders to the target position for all raid units
	issueApproachOrders(raid);

	return id;
}

/**
 * Advance the raid state machine by one tick.
 *
 * @param raidId - id returned by planRaid
 * @param _delta  - frame delta (unused — logic is tick-based, but kept for API parity)
 */
export function executeRaid(raidId: string, _delta: number): void {
	const raid = activeRaids.get(raidId);
	if (!raid) return;

	switch (raid.phase) {
		case "APPROACH":
			tickApproach(raid);
			break;
		case "ENGAGE":
			tickEngage(raid);
			break;
		case "LOOT":
			tickLoot(raid);
			break;
		case "RETREAT":
			tickRetreat(raid);
			break;
		case "DONE":
		case "CANCELLED":
			// terminal states — nothing to do
			break;
	}
}

/**
 * Query current raid status.
 */
export function getRaidStatus(raidId: string): {
	phase: RaidPhase;
	unitIds: string[];
	stolenCubeIds: string[];
} | null {
	const raid = activeRaids.get(raidId);
	if (!raid) return null;
	return {
		phase: raid.phase,
		unitIds: [...raid.unitIds],
		stolenCubeIds: [...raid.stolenCubeIds],
	};
}

/**
 * Abort a raid. Surviving units immediately retreat home.
 */
export function cancelRaid(raidId: string): void {
	const raid = activeRaids.get(raidId);
	if (!raid) return;
	if (raid.phase === "DONE" || raid.phase === "CANCELLED") return;

	raid.phase = "CANCELLED";
	issueRetreatOrders(raid);
}

/**
 * Get all active (non-terminal) raid ids.
 */
export function getActiveRaidIds(): string[] {
	const ids: string[] = [];
	for (const [id, raid] of activeRaids) {
		if (raid.phase !== "DONE" && raid.phase !== "CANCELLED") {
			ids.push(id);
		}
	}
	return ids;
}

/**
 * Remove a completed/cancelled raid from the registry.
 */
export function removeRaid(raidId: string): void {
	activeRaids.delete(raidId);
}

/**
 * Reset all raid state. Useful for tests and new-game.
 */
export function resetRaidSystem(): void {
	activeRaids.clear();
	cubeEntities.clear();
	nextRaidId = 0;
}

// ---------------------------------------------------------------------------
// Internals — phase ticks
// ---------------------------------------------------------------------------

function getAliveRaidUnits(raid: RaidPlan): UnitEntity[] {
	const alive: UnitEntity[] = [];
	for (const uid of raid.unitIds) {
		for (const u of units) {
			if (u.id === uid && u.unit.components.some((c) => c.functional)) {
				alive.push(u);
			}
		}
	}
	return alive;
}

function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/** APPROACH: move toward target. Transition to ENGAGE when defenders are near,
 *  or LOOT if no defenders are present and units have arrived. */
function tickApproach(raid: RaidPlan): void {
	const alive = getAliveRaidUnits(raid);
	if (alive.length === 0) {
		raid.phase = "DONE";
		return;
	}

	// Check if any unit is close enough to the target
	const arrived = alive.some(
		(u) => distXZ(u.worldPosition, raid.targetPosition) < ENGAGE_RANGE,
	);

	if (!arrived) {
		// Re-issue move orders for units that stopped
		for (const u of alive) {
			if (!u.navigation?.moving) {
				const path = findPath(u.worldPosition, raid.targetPosition);
				if (path.length > 0 && u.navigation) {
					u.navigation.path = path;
					u.navigation.pathIndex = 0;
					u.navigation.moving = true;
				}
			}
		}
		return;
	}

	// Arrived — check for defenders
	const defenders = findDefenders(raid);
	if (defenders.length > 0) {
		raid.phase = "ENGAGE";
	} else {
		raid.phase = "LOOT";
	}
}

/** ENGAGE: fight defenders. Transition to LOOT when no defenders remain,
 *  or DONE if all raiders are destroyed. */
function tickEngage(raid: RaidPlan): void {
	const alive = getAliveRaidUnits(raid);
	if (alive.length === 0) {
		raid.phase = "DONE";
		return;
	}

	const defenders = findDefenders(raid);
	if (defenders.length === 0) {
		raid.phase = "LOOT";
		return;
	}

	// Move raiders toward the nearest defender (combat system handles damage)
	for (const raider of alive) {
		if (raider.navigation?.moving) continue;

		let nearest: UnitEntity | null = null;
		let nearDist = Number.POSITIVE_INFINITY;
		for (const def of defenders) {
			const d = distXZ(raider.worldPosition, def.worldPosition);
			if (d < nearDist) {
				nearDist = d;
				nearest = def;
			}
		}

		if (nearest) {
			const path = findPath(raider.worldPosition, nearest.worldPosition);
			if (path.length > 0 && raider.navigation) {
				raider.navigation.path = path;
				raider.navigation.pathIndex = 0;
				raider.navigation.moving = true;
			}
		}
	}
}

/** LOOT: each unit grabs one nearby cube. Transition to RETREAT once done. */
function tickLoot(raid: RaidPlan): void {
	const alive = getAliveRaidUnits(raid);
	if (alive.length === 0) {
		raid.phase = "DONE";
		return;
	}

	// Each alive unit tries to grab one unheld cube near the target
	let anyGrabbed = false;
	for (const raider of alive) {
		// Skip if this unit already holds a cube
		if (
			raid.stolenCubeIds.some(
				(cid) => cubeEntities.get(cid)?.raidHeldBy?.unitId === raider.id,
			)
		) {
			continue;
		}

		const cube = findNearestAvailableCube(raider.worldPosition, LOOT_RANGE);
		if (cube) {
			// Grab: set HeldBy relation
			cube.raidHeldBy = { unitId: raider.id };
			raid.stolenCubeIds.push(cube.id);
			anyGrabbed = true;
		}
	}

	// Whether or not grabs happened, transition to RETREAT.
	// (Units may not find cubes if stockpile is empty, but they still retreat.)
	if (!anyGrabbed) {
		// No cubes left or all units already have one — retreat
		raid.phase = "RETREAT";
		issueRetreatOrders(raid);
	} else {
		// Check if every alive unit has a cube or no more cubes are available
		const unloadedUnits = alive.filter(
			(u) =>
				!raid.stolenCubeIds.some(
					(cid) => cubeEntities.get(cid)?.raidHeldBy?.unitId === u.id,
				),
		);
		const remainingCubes = findNearestAvailableCube(
			raid.targetPosition,
			LOOT_RANGE * 2,
		);
		if (unloadedUnits.length === 0 || !remainingCubes) {
			raid.phase = "RETREAT";
			issueRetreatOrders(raid);
		}
	}
}

/** RETREAT: units return home carrying stolen cubes. DONE when all arrive. */
function tickRetreat(raid: RaidPlan): void {
	const alive = getAliveRaidUnits(raid);
	if (alive.length === 0) {
		raid.phase = "DONE";
		return;
	}

	let allHome = true;
	for (const u of alive) {
		const d = distXZ(u.worldPosition, raid.homePosition);
		if (d > RETREAT_ARRIVAL_RANGE) {
			allHome = false;
			// Re-issue move orders if stopped
			if (!u.navigation?.moving) {
				const path = findPath(u.worldPosition, raid.homePosition);
				if (path.length > 0 && u.navigation) {
					u.navigation.path = path;
					u.navigation.pathIndex = 0;
					u.navigation.moving = true;
				}
			}
		}
	}

	if (allHome) {
		// Drop all carried cubes at home position
		for (const cid of raid.stolenCubeIds) {
			const cube = cubeEntities.get(cid);
			if (cube?.raidHeldBy) {
				cube.worldPosition = { ...raid.homePosition };
				cube.raidHeldBy = undefined;
			}
		}
		raid.phase = "DONE";
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function issueApproachOrders(raid: RaidPlan): void {
	for (const uid of raid.unitIds) {
		for (const u of units) {
			if (u.id === uid) {
				const path = findPath(u.worldPosition, raid.targetPosition);
				if (path.length > 0 && u.navigation) {
					u.navigation.path = path;
					u.navigation.pathIndex = 0;
					u.navigation.moving = true;
				}
			}
		}
	}
}

function issueRetreatOrders(raid: RaidPlan): void {
	const alive = getAliveRaidUnits(raid);
	for (const u of alive) {
		const path = findPath(u.worldPosition, raid.homePosition);
		if (path.length > 0 && u.navigation) {
			u.navigation.path = path;
			u.navigation.pathIndex = 0;
			u.navigation.moving = true;
		}
	}
}

/** Find player units near the raid target that could defend it. */
function findDefenders(raid: RaidPlan): UnitEntity[] {
	const defenders: UnitEntity[] = [];
	for (const u of units) {
		if (u.faction !== "player") continue;
		if (!u.unit.components.some((c) => c.functional)) continue;
		if (distXZ(u.worldPosition, raid.targetPosition) < ENGAGE_RANGE * 2) {
			defenders.push(u);
		}
	}
	return defenders;
}

/** Find the nearest grabbable cube that is not currently held. */
function findNearestAvailableCube(pos: Vec3, range: number): CubeEntity | null {
	let closest: CubeEntity | null = null;
	let closestDist = range;

	for (const cube of cubeEntities.values()) {
		if (cube.raidHeldBy) continue; // already held
		const d = distXZ(pos, cube.worldPosition);
		if (d < closestDist) {
			closestDist = d;
			closest = cube;
		}
	}

	return closest;
}
