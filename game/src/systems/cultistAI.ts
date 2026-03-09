/**
 * Cultist enemy AI system — organized human enemies with lightning powers.
 *
 * Cultists are fundamentally different from feral machines:
 *   - They patrol in pairs/groups (organized movement)
 *   - They have lightning discharge attacks (AoE, radius 4, cooldown 10s)
 *   - They close to range 6 before attacking
 *   - They can be hacked (difficulty 50)
 *
 * Cultists spawn in the northern territory and patrol with purpose.
 */

import { isInsideBuilding } from "../ecs/cityLayout";
import { createFragment, getTerrainHeight, isWalkable } from "../ecs/terrain";
import type { Entity, UnitEntity, Vec3 } from "../ecs/types";
import { units, world } from "../ecs/world";
import { findPath } from "./pathfinding";

let nextCultistId = 0;

const LIGHTNING_RANGE = 6;
const LIGHTNING_AOE_RADIUS = 4;
const LIGHTNING_COOLDOWN = 10; // seconds
const AGGRO_RANGE = 12;
const PATROL_SPEED = 2.5;

/** Per-entity cooldown tracking (entityId -> seconds remaining). */
const lightningCooldowns = new Map<string, number>();

/** Group patrol assignments (groupId -> list of entity IDs). */
const patrolGroups = new Map<string, string[]>();
let nextGroupId = 0;

export interface LightningEvent {
	attackerId: string;
	position: Vec3;
	radius: number;
	targetsHit: string[];
}

let lastLightningEvents: LightningEvent[] = [];

export function getLastLightningEvents(): LightningEvent[] {
	return lastLightningEvents;
}

/**
 * Spawn a cultist enemy entity.
 */
export function spawnCultist(options: {
	x: number;
	z: number;
	fragmentId?: string;
	patrolRadius?: number;
}): Entity {
	const { x, z, fragmentId, patrolRadius = 12 } = options;
	const id = `cultist_${nextCultistId++}`;
	const y = getTerrainHeight(x, z);
	const fragment = fragmentId ?? createFragment().id;

	// Generate patrol points in a circle around spawn
	const patrolPoints: Vec3[] = [];
	const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 patrol points
	for (let i = 0; i < numPoints; i++) {
		const angle = (i / numPoints) * Math.PI * 2;
		const px = x + Math.cos(angle) * patrolRadius * (0.5 + Math.random() * 0.5);
		const pz = z + Math.sin(angle) * patrolRadius * (0.5 + Math.random() * 0.5);
		if (isWalkable(px, pz) && !isInsideBuilding(px, pz)) {
			patrolPoints.push({ x: px, y: getTerrainHeight(px, pz), z: pz });
		}
	}

	// Fallback: at least the spawn point itself
	if (patrolPoints.length === 0) {
		patrolPoints.push({ x, y, z });
	}

	const entity = world.add({
		id,
		faction: "cultist" as const,
		worldPosition: { x, y, z },
		mapFragment: { fragmentId: fragment },
		unit: {
			type: "maintenance_bot" as const,
			displayName: `Cultist ${id.slice(-2).toUpperCase()}`,
			speed: PATROL_SPEED,
			selected: false,
			components: [
				{ name: "camera", functional: true, material: "electronic" },
				{ name: "arms", functional: true, material: "metal" },
				{ name: "legs", functional: true, material: "metal" },
				{ name: "power_cell", functional: true, material: "electronic" },
				{ name: "lightning_array", functional: true, material: "electronic" },
			],
		},
		navigation: { path: [], pathIndex: 0, moving: false },
		hackable: {
			difficulty: 50,
			hackProgress: 0,
			beingHacked: false,
			hacked: false,
		},
		automation: {
			routine: "patrol" as const,
			followTarget: null,
			patrolPoints,
			patrolIndex: 0,
			workTarget: null,
		},
	} as Partial<Entity> as Entity);

	lightningCooldowns.set(id, 0);

	return entity;
}

/**
 * Spawn a pair of cultists near each other (group patrol).
 */
export function spawnCultistPair(x: number, z: number, patrolRadius?: number) {
	const groupId = `group_${nextGroupId++}`;
	const offset = 2 + Math.random() * 2;
	const angle = Math.random() * Math.PI * 2;

	const c1 = spawnCultist({
		x: x + Math.cos(angle) * offset,
		z: z + Math.sin(angle) * offset,
		patrolRadius,
	});
	const c2 = spawnCultist({
		x: x - Math.cos(angle) * offset,
		z: z - Math.sin(angle) * offset,
		patrolRadius,
	});

	patrolGroups.set(groupId, [c1.id, c2.id]);
}

/**
 * Find nearest player unit within aggro range of a cultist.
 */
function findNearestPlayerUnit(cultist: UnitEntity): UnitEntity | null {
	let closest: UnitEntity | null = null;
	let closestDist = AGGRO_RANGE;

	for (const unit of units) {
		if (unit.faction !== "player") continue;
		const dx = unit.worldPosition.x - cultist.worldPosition.x;
		const dz = unit.worldPosition.z - cultist.worldPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < closestDist) {
			closest = unit;
			closestDist = dist;
		}
	}
	return closest;
}

/**
 * Distance between two positions (XZ plane).
 */
function distXZ(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Discharge lightning AoE attack centered on target position.
 * Damages all player entities within LIGHTNING_AOE_RADIUS.
 */
function dischargeLightning(
	attacker: UnitEntity,
	targetPos: Vec3,
): LightningEvent {
	const targetsHit: string[] = [];

	for (const unit of units) {
		if (unit.faction !== "player") continue;
		const dist = distXZ(unit.worldPosition, targetPos);
		if (dist > LIGHTNING_AOE_RADIUS) continue;

		// Lightning damages a random functional component
		const functional = unit.unit.components.filter((c) => c.functional);
		if (functional.length > 0) {
			const victim = functional[Math.floor(Math.random() * functional.length)];
			victim.functional = false;
			targetsHit.push(unit.id);
		}
	}

	return {
		attackerId: attacker.id,
		position: { ...targetPos },
		radius: LIGHTNING_AOE_RADIUS,
		targetsHit,
	};
}

/**
 * Check if a cultist has a functional lightning array component.
 */
function hasLightningArray(entity: UnitEntity): boolean {
	return entity.unit.components.some(
		(c) => c.name === "lightning_array" && c.functional,
	);
}

/**
 * Cultist AI system. Called each frame with delta time.
 *
 * Behavior:
 *   1. If a player unit is within AGGRO_RANGE (12):
 *      - Close to LIGHTNING_RANGE (6)
 *      - If within range and cooldown ready: discharge lightning AoE
 *   2. Otherwise: patrol assigned waypoints
 */
export function cultistAISystem(delta: number) {
	const lightningEvents: LightningEvent[] = [];

	// Update cooldowns
	for (const [id, remaining] of lightningCooldowns) {
		if (remaining > 0) {
			lightningCooldowns.set(id, remaining - delta);
		}
	}

	for (const unit of units) {
		if (unit.faction !== "cultist") continue;

		// Skip units that have been hacked (now player-controlled)
		if (unit.hackable?.hacked) continue;

		// Skip if no functional legs
		if (!unit.unit.components.some((c) => c.name === "legs" && c.functional)) {
			continue;
		}

		const target = findNearestPlayerUnit(unit);

		if (target) {
			const dist = distXZ(unit.worldPosition, target.worldPosition);

			// Within lightning range — try to attack
			if (dist <= LIGHTNING_RANGE && hasLightningArray(unit)) {
				const cooldown = lightningCooldowns.get(unit.id) ?? 0;
				if (cooldown <= 0) {
					// Discharge lightning at target position
					const event = dischargeLightning(unit, target.worldPosition);
					lightningEvents.push(event);
					lightningCooldowns.set(unit.id, LIGHTNING_COOLDOWN);

					// Stop moving during attack
					if (unit.navigation) {
						unit.navigation.moving = false;
					}
				}
				// Stay in position while on cooldown
				continue;
			}

			// Outside lightning range — close distance
			if (unit.navigation && !unit.navigation.moving) {
				const path = findPath(unit.worldPosition, target.worldPosition);
				if (path.length > 0) {
					unit.navigation.path = path;
					unit.navigation.pathIndex = 0;
					unit.navigation.moving = true;
				}
			}
			continue;
		}

		// No target — patrol behavior
		if (unit.navigation?.moving) continue;

		// Advance to next patrol point
		if (unit.automation) {
			const points = unit.automation.patrolPoints;
			if (points.length === 0) continue;

			const idx = unit.automation.patrolIndex % points.length;
			const patrolTarget = points[idx];

			// Check if close enough to current patrol point
			const distToPoint = distXZ(unit.worldPosition, patrolTarget);
			if (distToPoint < 2) {
				// Advance to next point
				unit.automation.patrolIndex = (idx + 1) % points.length;
				continue;
			}

			// Path toward patrol point (with some randomness to avoid lockstep)
			if (Math.random() < 0.1) {
				const path = findPath(unit.worldPosition, patrolTarget);
				if (path.length > 0 && unit.navigation) {
					unit.navigation.path = path;
					unit.navigation.pathIndex = 0;
					unit.navigation.moving = true;
				}
			}
		}
	}

	lastLightningEvents = lightningEvents;
}
