/**
 * FPS combat system — raycasting weapon and enemy retaliation.
 *
 * When the player uses the "welder" tool, a ray is cast from the camera.
 * If it hits an enemy entity within range, a random functional component
 * on the enemy is damaged (using the same component-based damage model
 * as the top-down combat system).
 *
 * Enemies within melee range automatically retaliate against the
 * player-controlled bot.
 */

import type { UnitComponent, UnitEntity } from "../ecs/types";
import { hasFunctionalComponent } from "../ecs/types";
import { getActivePlayerBot, units, world } from "../ecs/world";
import { addResource } from "./resources";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WELDER_RANGE = 6;
const ENEMY_MELEE_RANGE = 5;
const ENEMY_ATTACK_CHANCE = 0.02; // per frame (not per tick — called at 60fps)

// ---------------------------------------------------------------------------
// Hit result state (for HUD crosshair feedback)
// ---------------------------------------------------------------------------

interface HitResult {
	hit: boolean;
	timestamp: number;
}

let lastHitResult: HitResult = { hit: false, timestamp: 0 };

/**
 * Get the most recent hit/miss state for crosshair color feedback.
 * Result is only considered valid for ~200ms after the timestamp.
 */
export function getLastHitResult(): HitResult {
	return lastHitResult;
}

// ---------------------------------------------------------------------------
// Damage helpers (mirrors combat.ts logic)
// ---------------------------------------------------------------------------

function dealComponentDamage(target: UnitEntity): string | null {
	const functional = target.unit.components.filter((c) => c.functional);
	if (functional.length === 0) return null;

	const victim = functional[Math.floor(Math.random() * functional.length)];
	victim.functional = false;
	return victim.name;
}

function isDestroyed(entity: UnitEntity): boolean {
	return entity.unit.components.every((c) => !c.functional);
}

function destroyUnit(entity: UnitEntity) {
	const componentCount = entity.unit.components.length;
	addResource("scrapMetal", Math.floor(componentCount * 1.5));
	if (Math.random() > 0.5) addResource("eWaste", 1);
	world.remove(entity);
}

// ---------------------------------------------------------------------------
// Player attack (welder raycast)
// ---------------------------------------------------------------------------

/**
 * Fire the welder tool. Call when the player performs a primary action
 * while the welder is equipped.
 *
 * Uses simple distance + angle check rather than a full Three.js raycast
 * to keep this system independent of the rendering layer.
 */
export function fireWelder(): void {
	const bot = getActivePlayerBot();
	if (!bot) return;

	// Need functional arms to use welder
	if (!hasFunctionalComponent(bot.unit.components, "arms")) {
		lastHitResult = { hit: false, timestamp: performance.now() };
		return;
	}

	const yaw = bot.playerControlled.yaw;

	// Camera forward direction (in world XZ, ignoring pitch for target finding)
	const fwdX = -Math.sin(yaw);
	const fwdZ = -Math.cos(yaw);

	let closestDist = WELDER_RANGE + 1;
	let closestTarget: UnitEntity | null = null;

	for (const entity of units) {
		if (entity.faction === "player") continue;
		if (!entity.unit.components.some((c) => c.functional)) continue;

		const dx = entity.worldPosition.x - bot.worldPosition.x;
		const dz = entity.worldPosition.z - bot.worldPosition.z;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > WELDER_RANGE) continue;

		// Check if entity is roughly in front of the camera (dot product)
		const dirX = dx / dist;
		const dirZ = dz / dist;
		const dot = dirX * fwdX + dirZ * fwdZ;

		// Must be within ~30 degree cone
		if (dot < 0.85) continue;

		if (dist < closestDist) {
			closestDist = dist;
			closestTarget = entity;
		}
	}

	if (closestTarget) {
		const damaged = dealComponentDamage(closestTarget);
		if (damaged) {
			lastHitResult = { hit: true, timestamp: performance.now() };

			if (isDestroyed(closestTarget)) {
				destroyUnit(closestTarget);
			}
		} else {
			lastHitResult = { hit: false, timestamp: performance.now() };
		}
	} else {
		lastHitResult = { hit: false, timestamp: performance.now() };
	}
}

// ---------------------------------------------------------------------------
// Enemy retaliation (runs every frame)
// ---------------------------------------------------------------------------

/**
 * FPS combat system tick. Call once per frame (not per sim tick).
 *
 * Handles enemy retaliation against the player bot when enemies
 * are within melee range.
 */
export function fpsCombatSystem(delta: number): void {
	const bot = getActivePlayerBot();
	if (!bot) return;

	const bx = bot.worldPosition.x;
	const bz = bot.worldPosition.z;

	for (const entity of units) {
		if (entity.faction === "player") continue;
		if (!entity.unit.components.some((c) => c.functional)) continue;

		const dx = entity.worldPosition.x - bx;
		const dz = entity.worldPosition.z - bz;
		const dist = Math.sqrt(dx * dx + dz * dz);

		if (dist > ENEMY_MELEE_RANGE) continue;

		// Probability-based attack per frame
		if (Math.random() > ENEMY_ATTACK_CHANCE) continue;

		// Enemy attacks a random functional component on the player bot
		const functional = bot.unit.components.filter((c) => c.functional);
		if (functional.length === 0) continue;

		const victim = functional[Math.floor(Math.random() * functional.length)];
		victim.functional = false;

		// Stop enemy movement while fighting
		if (entity.navigation) {
			entity.navigation.moving = false;
		}
	}
}
