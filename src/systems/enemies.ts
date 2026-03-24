/**
 * Enemy system -- feral machines that roam the city streets.
 *
 * Feral bots spawn at city edges and patrol randomly.
 * They are hostile -- will attack player units in range.
 * Can be hacked and taken over (future feature).
 */

import type { Entity } from "koota";
import { isInsideBuilding } from "../ecs/cityLayout";
import { createFragment, getTerrainHeight, isWalkable } from "../ecs/terrain";
import {
	EntityId,
	Faction,
	Fragment,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { serializeComponents, serializePath, type Vec3 } from "../ecs/types";
import { world } from "../ecs/world";
import { findPath } from "./pathfinding";

let nextEnemyId = 0;

/** Spawn points at edges of the city */
const SPAWN_ZONES = [
	{ x: -25, z: 0 },
	{ x: -25, z: 25 },
	{ x: 45, z: 0 },
	{ x: 45, z: 25 },
	{ x: 10, z: -18 },
	{ x: 10, z: 48 },
];

// Light early-game presence: just a few wandering drones, no cultists.
// Player has no weapons initially and must avoid them.
const MAX_ENEMIES = 3;
const SPAWN_INTERVAL = 60; // ticks between spawn attempts (slower spawning)
const PATROL_RANGE = 15;
const AGGRO_RANGE = 6; // slightly shorter aggro range -- gives player more room

let spawnTimer = 40; // longer initial delay so player can orient

function countEnemies(): number {
	let count = 0;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Faction)?.value === "feral") count++;
	}
	return count;
}

function findValidSpawn(): { x: number; z: number } | null {
	// Try each spawn zone with slight randomization
	const shuffled = [...SPAWN_ZONES].sort(() => Math.random() - 0.5);
	for (const zone of shuffled) {
		const x = zone.x + (Math.random() - 0.5) * 6;
		const z = zone.z + (Math.random() - 0.5) * 6;
		if (isWalkable(x, z) && !isInsideBuilding(x, z)) {
			return { x, z };
		}
	}
	return null;
}

function spawnEnemy() {
	const pos = findValidSpawn();
	if (!pos) return;

	const fragment = createFragment();
	const y = getTerrainHeight(pos.x, pos.z);
	const id = `enemy_${nextEnemyId++}`;

	// Feral bots have random component states
	const hasCam = Math.random() > 0.4;
	const hasArmsRoll = Math.random() > 0.3;

	world.spawn(
		EntityId({ value: id }),
		Position({ x: pos.x, y, z: pos.z }),
		Faction({ value: "feral" }),
		Fragment({ fragmentId: fragment.id }),
		Unit({
			unitType: "maintenance_bot",
			displayName: `Feral ${id.slice(-2).toUpperCase()}`,
			speed: 2 + Math.random() * 1.5,
			selected: false,
		}),
		UnitComponents({
			componentsJson: serializeComponents([
				{ name: "camera", functional: hasCam, material: "electronic" },
				{ name: "arms", functional: hasArmsRoll, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			]),
		}),
		Navigation({ pathJson: "[]", pathIndex: 0, moving: false }),
	);
}

/**
 * Pick a random patrol target near the enemy's position.
 */
function getPatrolTarget(from: Vec3): Vec3 | null {
	for (let attempt = 0; attempt < 5; attempt++) {
		const x = from.x + (Math.random() - 0.5) * PATROL_RANGE * 2;
		const z = from.z + (Math.random() - 0.5) * PATROL_RANGE * 2;
		if (isWalkable(x, z) && !isInsideBuilding(x, z)) {
			return { x, y: 0, z };
		}
	}
	return null;
}

/**
 * Find nearest player unit within aggro range.
 */
function findNearestPlayerUnit(
	enemy: Entity,
): { entity: Entity; dist: number } | null {
	const enemyPos = enemy.get(Position)!;
	let closest: Entity | null = null;
	let closestDist = AGGRO_RANGE;

	for (const unit of world.query(Position, Unit, Faction)) {
		if (unit.get(Faction)?.value !== "player") continue;
		const unitPos = unit.get(Position)!;
		const dx = unitPos.x - enemyPos.x;
		const dz = unitPos.z - enemyPos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}
	return closest ? { entity: closest, dist: closestDist } : null;
}

/**
 * Enemy AI tick. Called once per sim tick.
 * - Spawns new enemies periodically
 * - Patrols idle enemies
 * - Aggros on nearby player units
 */
export function enemySystem() {
	// Spawn check
	spawnTimer--;
	if (spawnTimer <= 0 && countEnemies() < MAX_ENEMIES) {
		spawnEnemy();
		spawnTimer = SPAWN_INTERVAL;
	}

	// AI for each enemy
	for (const entity of world.query(Position, Unit, Faction, Navigation)) {
		if (entity.get(Faction)?.value !== "feral") continue;

		const nav = entity.get(Navigation)!;

		// If moving, let it continue
		if (nav.moving) continue;

		const pos = entity.get(Position)!;

		// Check for nearby player units to aggro
		const target = findNearestPlayerUnit(entity);
		if (target) {
			// Move toward player unit
			const targetPos = target.entity.get(Position)!;
			const path = findPath(pos, targetPos);
			if (path.length > 0) {
				entity.set(Navigation, {
					pathJson: serializePath(path),
					pathIndex: 0,
					moving: true,
				});
			}
			continue;
		}

		// Patrol randomly (30% chance per tick when idle)
		if (Math.random() < 0.3) {
			const patrolTarget = getPatrolTarget(pos);
			if (patrolTarget) {
				const path = findPath(pos, patrolTarget);
				if (path.length > 0) {
					entity.set(Navigation, {
						pathJson: serializePath(path),
						pathIndex: 0,
						moving: true,
					});
				}
			}
		}
	}
}
