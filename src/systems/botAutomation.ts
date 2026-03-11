/**
 * Bot automation system — handles non-player-controlled bot behaviors.
 *
 * Bots with an automation component execute one of five routines:
 *   - idle:   Stand still, occasionally randomize yaw
 *   - patrol: Follow patrolPoints in order, loop back to start
 *   - guard:  Stay near position, attack enemies within range
 *   - follow: Move toward followTarget entity, maintain distance
 *   - work:   Move toward workTarget entity, stay nearby
 *
 * Uses navmesh pathfinding for movement. Runs each frame with delta time.
 *
 * Config reference: config/botAutomation.json
 */

import botAutomationConfig from "../../config/botAutomation.json";
import type { Entity, UnitEntity, Vec3 } from "../ecs/types";
import { automatedBots, getEntityById, units } from "../ecs/koota/compat";

import { findPath } from "./pathfinding";

const GUARD_RANGE: number = botAutomationConfig.guardRange;
const FOLLOW_DISTANCE: number = botAutomationConfig.followDistance;
const WORK_DISTANCE: number = botAutomationConfig.workDistance;
const WAYPOINT_REACH_THRESHOLD: number = botAutomationConfig.waypointReachThreshold;

/** Cooldown timers per entity to avoid pathfinding every frame. */
const pathCooldowns = new Map<string, number>();

/** Guard positions — where the bot was when it entered guard mode. */
const guardPositions = new Map<string, Vec3>();

/**
 * Distance between two positions (XZ plane).
 */
function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Check if pathfinding cooldown has elapsed for an entity.
 * If so, reset the cooldown and return true.
 */
function tryPathCooldown(
	entityId: string,
	delta: number,
	interval: number,
): boolean {
	const remaining = (pathCooldowns.get(entityId) ?? 0) - delta;
	if (remaining <= 0) {
		pathCooldowns.set(entityId, interval);
		return true;
	}
	pathCooldowns.set(entityId, remaining);
	return false;
}

/**
 * Command a bot to move toward a target position via pathfinding.
 */
function moveToward(
	entity: Entity &
		Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
	target: Vec3,
) {
	const path = findPath(entity.worldPosition, target);
	if (path.length > 0) {
		entity.navigation.path = path;
		entity.navigation.pathIndex = 0;
		entity.navigation.moving = true;
	}
}

/**
 * Find nearest enemy unit within range of a guard bot.
 */
function findNearestEnemy(bot: UnitEntity, range: number): UnitEntity | null {
	let closest: UnitEntity | null = null;
	let closestDist = range;

	for (const unit of units) {
		if (unit.faction === "player") continue;
		if (unit.faction === "wildlife") continue;
		const dist = distXZ(unit.worldPosition, bot.worldPosition);
		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}
	return closest;
}

/**
 * Handle idle routine: stand still, occasionally look around.
 */
function runIdle(entity: Entity, _delta: number) {
	// Occasionally randomize yaw for visual effect
	if (entity.playerControlled && Math.random() < 0.01) {
		entity.playerControlled.yaw += (Math.random() - 0.5) * 0.5;
	}

	// Ensure not moving
	if (entity.navigation) {
		entity.navigation.moving = false;
	}
}

/**
 * Handle patrol routine: follow waypoints in order.
 */
function runPatrol(
	entity: Entity &
		Required<Pick<Entity, "automation" | "unit" | "worldPosition">>,
	delta: number,
) {
	const auto = entity.automation;
	const points = auto.patrolPoints;
	if (points.length === 0) return;

	// If currently moving, let movement system handle it
	if (entity.navigation?.moving) return;

	const idx = auto.patrolIndex % points.length;
	const target = points[idx];
	const dist = distXZ(entity.worldPosition, target);

	if (dist < WAYPOINT_REACH_THRESHOLD) {
		// Reached current waypoint — advance to next
		auto.patrolIndex = (idx + 1) % points.length;
		return;
	}

	// Path toward current waypoint (with cooldown to avoid spam)
	if (tryPathCooldown(entity.id, delta, 0.5) && entity.navigation) {
		moveToward(
			entity as Entity &
				Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
			target,
		);
	}
}

/**
 * Handle guard routine: stay near position, attack enemies in range.
 */
function runGuard(
	entity: Entity &
		Required<Pick<Entity, "automation" | "unit" | "worldPosition">>,
	delta: number,
) {
	// Record guard position on first call
	if (!guardPositions.has(entity.id)) {
		guardPositions.set(entity.id, { ...entity.worldPosition });
	}
	const guardPos = guardPositions.get(entity.id)!;

	// If currently moving, let movement system handle it
	if (entity.navigation?.moving) return;

	// Look for enemies within guard range
	const enemy = findNearestEnemy(entity as UnitEntity, GUARD_RANGE);
	if (enemy) {
		// Move toward enemy to engage in melee (combat system handles damage)
		if (tryPathCooldown(entity.id, delta, 0.3) && entity.navigation) {
			moveToward(
				entity as Entity &
					Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
				enemy.worldPosition,
			);
		}
		return;
	}

	// No enemies — return to guard position if drifted too far
	const distFromGuard = distXZ(entity.worldPosition, guardPos);
	if (
		distFromGuard > 3 &&
		tryPathCooldown(entity.id, delta, 1.0) &&
		entity.navigation
	) {
		moveToward(
			entity as Entity &
				Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
			guardPos,
		);
	}
}

/**
 * Handle follow routine: move toward followTarget entity, maintain distance.
 */
function runFollow(
	entity: Entity &
		Required<Pick<Entity, "automation" | "unit" | "worldPosition">>,
	delta: number,
) {
	const targetId = entity.automation.followTarget;
	if (!targetId) return;

	const targetEntity = getEntityById(targetId);
	if (!targetEntity?.worldPosition) return;

	// If currently moving, let movement system handle it
	if (entity.navigation?.moving) return;

	const dist = distXZ(entity.worldPosition, targetEntity.worldPosition);

	// Close enough — stop
	if (dist <= FOLLOW_DISTANCE) return;

	// Move toward target (with cooldown)
	if (tryPathCooldown(entity.id, delta, 0.5) && entity.navigation) {
		moveToward(
			entity as Entity &
				Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
			targetEntity.worldPosition,
		);
	}
}

/**
 * Handle work routine: move toward workTarget and stay nearby.
 */
function runWork(
	entity: Entity &
		Required<Pick<Entity, "automation" | "unit" | "worldPosition">>,
	delta: number,
) {
	const targetId = entity.automation.workTarget;
	if (!targetId) return;

	const targetEntity = getEntityById(targetId);
	if (!targetEntity?.worldPosition) return;

	// If currently moving, let movement system handle it
	if (entity.navigation?.moving) return;

	const dist = distXZ(entity.worldPosition, targetEntity.worldPosition);

	// Close enough — stay and work
	if (dist <= WORK_DISTANCE) return;

	// Move toward work target (with cooldown)
	if (tryPathCooldown(entity.id, delta, 0.5) && entity.navigation) {
		moveToward(
			entity as Entity &
				Required<Pick<Entity, "unit" | "worldPosition" | "navigation">>,
			targetEntity.worldPosition,
		);
	}
}

/**
 * Bot automation system. Called each frame with delta time.
 * Dispatches each automated bot to its routine handler.
 */
export function botAutomationSystem(delta: number) {
	for (const entity of automatedBots) {
		// Skip player-faction bots that are being directly controlled
		if (entity.playerControlled?.isActive) continue;

		// Guard required components
		if (!entity.unit || !entity.automation || !entity.worldPosition) continue;

		// Skip if no functional legs (can't move)
		if (
			!entity.unit.components.some((c) => c.name === "legs" && c.functional)
		) {
			continue;
		}

		const entityWithComponents = entity as Entity & Required<Pick<Entity, "unit" | "worldPosition" | "automation">>;

		switch (entity.automation.routine) {
			case "idle":
				runIdle(entity, delta);
				break;
			case "patrol":
				runPatrol(entityWithComponents, delta);
				break;
			case "guard":
				runGuard(entityWithComponents, delta);
				break;
			case "follow":
				runFollow(entityWithComponents, delta);
				break;
			case "work":
				runWork(entityWithComponents, delta);
				break;
		}
	}
}
