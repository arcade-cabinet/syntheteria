/**
 * PlaytestGovernor — automated player AI for playtesting.
 *
 * Runs every N simulation ticks and makes decisions for player units:
 * - Idle units with no path -> assign exploration targets
 * - Units near enemies -> issue attack (move toward enemy)
 * - Units with enough resources nearby -> found a base
 * - Units near scavenge sites -> scavenge (stay idle to auto-scavenge)
 *
 * Designed for RTS continuous simulation, not turn-based.
 * Accepts world: World param for testability.
 */

import type { Entity, World } from "koota";
import { worldToTileX, worldToTileZ } from "../../board/coords";
import { isWalkable } from "../../ecs/terrain";
import {
	Base,
	EntityId,
	Faction,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
} from "../../ecs/traits";
import { foundBase, validateBaseLocation } from "../../systems/baseManagement";
import { getResources } from "../../systems/resources";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GovernorAction {
	entityId: string;
	action: "explore" | "attack" | "found_base" | "scavenge" | "idle";
	targetX?: number;
	targetZ?: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

/** Governor runs every N ticks. */
const TICK_INTERVAL = 10;

/** How far units explore in world units. */
const EXPLORE_RANGE = 30;

/** Enemy detection range in world units. */
const AGGRO_RANGE = 12;

/** Scavenge detection range in world units. */
const SCAVENGE_RANGE = 5;

/** Minimum resources before founding a base. */
const MIN_RESOURCES_FOR_BASE = 5;

/** Maximum bases the governor will found. */
const MAX_PLAYER_BASES = 3;

// ─── State ──────────────────────────────────────────────────────────────────

let autoPlayEnabled = false;
const governorLog: GovernorAction[] = [];

// Simple seeded random for deterministic exploration
let exploreRngState = 42;
function exploreRandom(): number {
	exploreRngState = (exploreRngState * 1103515245 + 12345) & 0x7fffffff;
	return exploreRngState / 0x7fffffff;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function enableAutoPlay(): void {
	autoPlayEnabled = true;
}

export function disableAutoPlay(): void {
	autoPlayEnabled = false;
}

export function isAutoPlayEnabled(): boolean {
	return autoPlayEnabled;
}

export function getGovernorLog(): GovernorAction[] {
	return [...governorLog];
}

export function clearGovernorLog(): void {
	governorLog.length = 0;
}

/** Push an action to the log, capping at 1000 entries to prevent unbounded growth. */
function pushGovernorLog(action: GovernorAction): void {
	governorLog.push(action);
	if (governorLog.length > 1000) {
		governorLog.splice(0, governorLog.length - 1000);
	}
}

/** Reset all governor state (for testing). */
export function resetGovernor(): void {
	autoPlayEnabled = false;
	governorLog.length = 0;
	exploreRngState = 42;
}

// ─── Core Tick ──────────────────────────────────────────────────────────────

/**
 * Run one governor decision cycle. Called from simulationTick().
 * Only runs every TICK_INTERVAL ticks.
 *
 * @param world - Koota ECS world (passed for testability)
 * @param tickNumber - Current simulation tick
 * @returns Array of actions taken this tick
 */
export function governorTick(
	world: World,
	tickNumber: number,
): GovernorAction[] {
	if (tickNumber % TICK_INTERVAL !== 0) return [];

	const actions: GovernorAction[] = [];

	// Gather player units
	const playerUnits: Entity[] = [];
	for (const entity of world.query(Unit, Position, Faction, Navigation)) {
		if (entity.get(Faction)?.value === "player") {
			playerUnits.push(entity);
		}
	}

	if (playerUnits.length === 0) return actions;

	// Gather enemies
	const enemies: Entity[] = [];
	for (const entity of world.query(Unit, Position, Faction)) {
		const faction = entity.get(Faction)?.value;
		if (faction && faction !== "player") {
			enemies.push(entity);
		}
	}

	// Gather scavenge sites
	const scavengeSites: Entity[] = [];
	for (const entity of world.query(Position, ScavengeSite)) {
		const site = entity.get(ScavengeSite)!;
		if (site.remaining > 0) {
			scavengeSites.push(entity);
		}
	}

	// Count player bases
	let playerBaseCount = 0;
	for (const entity of world.query(Base, Faction)) {
		if (entity.get(Faction)?.value === "player") {
			playerBaseCount++;
		}
	}

	// Process each player unit
	for (const unit of playerUnits) {
		const pos = unit.get(Position)!;
		const nav = unit.get(Navigation)!;
		const eid = unit.has(EntityId) ? unit.get(EntityId)!.value : "unknown";

		// Skip units that are already moving
		if (nav.moving) {
			actions.push({ entityId: eid, action: "idle" });
			continue;
		}

		// Priority 1: Attack nearby enemies
		const nearbyEnemy = findNearestEntity(pos, enemies, AGGRO_RANGE);
		if (nearbyEnemy) {
			const enemyPos = nearbyEnemy.get(Position)!;
			const action: GovernorAction = {
				entityId: eid,
				action: "attack",
				targetX: enemyPos.x,
				targetZ: enemyPos.z,
			};
			setNavTarget(unit, enemyPos.x, enemyPos.z);
			actions.push(action);
			pushGovernorLog(action);
			continue;
		}

		// Priority 2: Scavenge nearby sites (stay idle to auto-scavenge)
		const nearbySite = findNearestEntity(pos, scavengeSites, SCAVENGE_RANGE);
		if (nearbySite) {
			const action: GovernorAction = {
				entityId: eid,
				action: "scavenge",
				targetX: pos.x,
				targetZ: pos.z,
			};
			actions.push(action);
			pushGovernorLog(action);
			continue;
		}

		// Priority 3: Found a base if conditions met
		const resources = getResources();
		const totalResources =
			resources.scrapMetal +
			resources.circuitry +
			resources.powerCells +
			resources.durasteel;

		if (
			totalResources >= MIN_RESOURCES_FOR_BASE &&
			playerBaseCount < MAX_PLAYER_BASES
		) {
			const tileX = worldToTileX(pos.x);
			const tileZ = worldToTileZ(pos.z);
			const validationError = validateBaseLocation(
				world,
				tileX,
				tileZ,
				"player",
			);
			if (!validationError) {
				try {
					const baseName = `Auto-Base ${playerBaseCount + 1}`;
					foundBase(world, tileX, tileZ, "player", baseName);
					playerBaseCount++;
					const action: GovernorAction = {
						entityId: eid,
						action: "found_base",
						targetX: pos.x,
						targetZ: pos.z,
					};
					actions.push(action);
					pushGovernorLog(action);
					continue;
				} catch {
					// Base founding failed — fall through to exploration
				}
			}
		}

		// Priority 4: Explore — assign random passable target
		const target = findExplorationTarget(pos);
		if (target) {
			const action: GovernorAction = {
				entityId: eid,
				action: "explore",
				targetX: target.x,
				targetZ: target.z,
			};
			setNavTarget(unit, target.x, target.z);
			actions.push(action);
			pushGovernorLog(action);
		} else {
			actions.push({ entityId: eid, action: "idle" });
		}
	}

	return actions;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find the nearest entity from a list within a given range.
 */
function findNearestEntity(
	pos: { x: number; z: number },
	entities: Entity[],
	range: number,
): Entity | null {
	let nearest: Entity | null = null;
	let nearestDist = range;

	for (const entity of entities) {
		const ePos = entity.get(Position)!;
		const dx = ePos.x - pos.x;
		const dz = ePos.z - pos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < nearestDist) {
			nearest = entity;
			nearestDist = dist;
		}
	}

	return nearest;
}

/**
 * Find a random passable exploration target within EXPLORE_RANGE.
 * Tries up to 10 random positions.
 */
function findExplorationTarget(from: {
	x: number;
	z: number;
}): { x: number; z: number } | null {
	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = exploreRandom() * Math.PI * 2;
		const dist = EXPLORE_RANGE * 0.3 + exploreRandom() * EXPLORE_RANGE * 0.7;
		const x = from.x + Math.cos(angle) * dist;
		const z = from.z + Math.sin(angle) * dist;

		if (isWalkable(x, z)) {
			return { x, z };
		}
	}
	return null;
}

/**
 * Set Navigation trait to move toward a target position.
 * Uses a simple straight-line path (governor doesn't need pathfinding —
 * the movement system will handle actual navmesh pathfinding).
 */
function setNavTarget(entity: Entity, targetX: number, targetZ: number): void {
	if (!entity.has(Navigation)) return;
	const path = [{ x: targetX, y: 0, z: targetZ }];
	entity.set(Navigation, {
		pathJson: JSON.stringify(path),
		pathIndex: 0,
		moving: true,
	});
}
