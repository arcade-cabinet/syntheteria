/**
 * Enemy system — feral machines that roam the city streets.
 *
 * Feral bots spawn at city edges and patrol randomly.
 * They are hostile — will attack player units in range.
 * Can be hacked and taken over (future feature).
 *
 * All tunables sourced from config/enemies.json.
 */

import { config } from "../../config";
import { isInsideBuilding } from "../ecs/cityLayout";
import { createFragment, getTerrainHeight, isWalkable } from "../ecs/terrain";
import type { Entity, UnitEntity, Vec3 } from "../ecs/types";
import { units, world } from "../ecs/world";
import { findPath } from "./pathfinding";

let nextEnemyId = 0;

const feralConfig = config.enemies.feral;

/** Spawn points at edges of the city (from config) */
const SPAWN_ZONES = feralConfig.spawnZones;

const MAX_ENEMIES = feralConfig.maxCount;
const SPAWN_INTERVAL = feralConfig.spawnInterval;
const PATROL_RANGE = feralConfig.patrolRange;
const AGGRO_RANGE = feralConfig.aggroRange;

let spawnTimer = feralConfig.initialSpawnDelay;

const enemyIds = new Set<string>();

function countEnemies(): number {
	let count = 0;
	for (const unit of units) {
		if (unit.faction === "feral") count++;
	}
	return count;
}

function findValidSpawn(): { x: number; z: number } | null {
	const shuffled = [...SPAWN_ZONES].sort(() => Math.random() - 0.5);
	for (const zone of shuffled) {
		const r = feralConfig.spawnRandomizationRadius;
		const x = zone.x + (Math.random() - 0.5) * r;
		const z = zone.z + (Math.random() - 0.5) * r;
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

	const hasCam = Math.random() < feralConfig.cameraChance;
	const hasArmsRoll = Math.random() < feralConfig.armsChance;

	world.add({
		id,
		faction: "feral" as const,
		worldPosition: { x: pos.x, y, z: pos.z },
		mapFragment: { fragmentId: fragment.id },
		unit: {
			type: "maintenance_bot",
			displayName: `Feral ${id.slice(-2).toUpperCase()}`,
			speed:
				feralConfig.baseSpeed + Math.random() * feralConfig.speedVariation,
			selected: false,
			components: [
				{ name: "camera", functional: hasCam, material: "electronic" },
				{ name: "arms", functional: hasArmsRoll, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
			],
		},
		navigation: { path: [], pathIndex: 0, moving: false },
	} as Partial<Entity> as Entity);

	enemyIds.add(id);
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
function findNearestPlayerUnit(enemy: UnitEntity): UnitEntity | null {
	let closest: UnitEntity | null = null;
	let closestDist = AGGRO_RANGE;

	for (const unit of units) {
		if (unit.faction !== "player") continue;
		const dx = unit.worldPosition.x - enemy.worldPosition.x;
		const dz = unit.worldPosition.z - enemy.worldPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}
	return closest;
}

/**
 * Enemy AI tick. Called once per sim tick.
 * - Spawns new enemies periodically
 * - Patrols idle enemies
 * - Aggros on nearby player units
 */
export function enemySystem() {
	spawnTimer--;
	if (spawnTimer <= 0 && countEnemies() < MAX_ENEMIES) {
		spawnEnemy();
		spawnTimer = SPAWN_INTERVAL;
	}

	for (const unit of units) {
		if (unit.faction !== "feral") continue;

		if (unit.navigation?.moving) continue;

		const target = findNearestPlayerUnit(unit);
		if (target) {
			const path = findPath(unit.worldPosition, target.worldPosition);
			if (path.length > 0 && unit.navigation) {
				unit.navigation.path = path;
				unit.navigation.pathIndex = 0;
				unit.navigation.moving = true;
			}
			continue;
		}

		if (Math.random() < feralConfig.patrolChancePerTick) {
			const patrolTarget = getPatrolTarget(unit.worldPosition);
			if (patrolTarget) {
				const path = findPath(unit.worldPosition, patrolTarget);
				if (path.length > 0 && unit.navigation) {
					unit.navigation.path = path;
					unit.navigation.pathIndex = 0;
					unit.navigation.moving = true;
				}
			}
		}
	}
}
