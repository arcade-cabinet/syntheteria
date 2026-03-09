/**
 * Enhanced FPS movement with jump and gravity.
 *
 * Provides gravity application, jump initiation, and walk-bob calculation
 * for the FPS camera. Vertical velocity is tracked per entity via a WeakMap
 * so multiple bots can be piloted without state collisions.
 */

import { getTerrainHeight } from "../ecs/terrain";
import type { Entity, PlayerEntity } from "../ecs/types";
import { hasFunctionalComponent } from "../ecs/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JUMP_VELOCITY = 5; // units/sec upward
const GRAVITY = -15; // units/sec²
const GROUND_EPSILON = 0.01; // snap-to-ground threshold

// ---------------------------------------------------------------------------
// Per-entity vertical velocity
// ---------------------------------------------------------------------------

const velocityMap = new WeakMap<Entity, number>();

function getVerticalVelocity(entity: Entity): number {
	return velocityMap.get(entity) ?? 0;
}

function setVerticalVelocity(entity: Entity, v: number): void {
	velocityMap.set(entity, v);
}

// ---------------------------------------------------------------------------
// Ground check
// ---------------------------------------------------------------------------

function getFloorHeight(entity: Entity): number {
	if (!entity.worldPosition) return 0;
	return getTerrainHeight(entity.worldPosition.x, entity.worldPosition.z);
}

/**
 * Returns true if the entity is standing on (or very close to) the ground.
 */
export function isOnGround(entity: Entity): boolean {
	if (!entity.worldPosition) return true;
	const floor = getFloorHeight(entity);
	return entity.worldPosition.y <= floor + GROUND_EPSILON;
}

// ---------------------------------------------------------------------------
// Gravity
// ---------------------------------------------------------------------------

/**
 * Apply gravity to an entity. Call once per frame with the frame delta.
 * Updates worldPosition.y and internal vertical velocity.
 */
export function applyGravity(bot: PlayerEntity, delta: number): void {
	let vy = getVerticalVelocity(bot);
	const floor = getFloorHeight(bot);

	// Apply gravity acceleration
	vy += GRAVITY * delta;

	// Integrate position
	bot.worldPosition.y += vy * delta;

	// Floor collision
	if (bot.worldPosition.y <= floor) {
		bot.worldPosition.y = floor;
		vy = 0;
	}

	setVerticalVelocity(bot, vy);
}

// ---------------------------------------------------------------------------
// Jump
// ---------------------------------------------------------------------------

/**
 * Attempt to jump. Only succeeds if the bot has functional legs
 * and is currently on the ground.
 *
 * Returns true if the jump was initiated.
 */
export function tryJump(bot: PlayerEntity): boolean {
	if (!hasFunctionalComponent(bot.unit.components, "legs")) return false;
	if (!isOnGround(bot)) return false;

	setVerticalVelocity(bot, JUMP_VELOCITY);
	return true;
}

// ---------------------------------------------------------------------------
// Walk bob
// ---------------------------------------------------------------------------

/**
 * Calculate a vertical camera offset for walk-bob animation.
 *
 * @param time — accumulated time in seconds (e.g. from useFrame clock)
 * @param speed — current movement speed factor (0 = standing still)
 * @returns Y offset to add to the camera eye height
 */
export function getWalkBob(time: number, speed: number): number {
	if (speed < 0.01) return 0;

	const freq = 8; // bob frequency (steps per second)
	const amplitude = 0.04 * Math.min(speed, 1); // subtle bob
	return Math.sin(time * freq) * amplitude;
}
