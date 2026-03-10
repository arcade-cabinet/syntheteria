/**
 * Hacking system — allows the player to take over hackable entities.
 *
 * Hacking requires:
 *   - Proximity (within 4 units to start, within 8 to maintain)
 *   - Compute power from the signal network
 *   - Time: hackProgress advances by (computeAvailable / difficulty) per tick
 *
 * When hackProgress reaches 1.0, the entity is hacked and joins the player faction.
 */

import type { Entity } from "../ecs/types";
import { hackables, playerBots, world } from "../ecs/world";
import { getGlobalCompute } from "./signalNetwork";

function getEntityById(id: string): Entity | undefined {
	for (const entity of world) {
		if (entity.id === id) return entity;
	}
	return undefined;
}

const HACK_START_RANGE = 4;
const HACK_CANCEL_RANGE = 8;

/** Track which entity is currently being hacked (only one at a time). */
let activeHackTargetId: string | null = null;

/**
 * Get total compute available from the player's signal network.
 * Sum of connected signal relay strengths * 10.
 */
export function getComputePool(): number {
	return getGlobalCompute();
}

/**
 * Get the distance from the nearest active player bot to a world position.
 */
function distToPlayer(x: number, z: number): number {
	let minDist = Infinity;
	for (const bot of playerBots) {
		if (!bot.playerControlled.isActive) continue;
		const dx = bot.worldPosition.x - x;
		const dz = bot.worldPosition.z - z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist < minDist) minDist = dist;
	}
	return minDist;
}

/**
 * Initiate a hack on a hackable entity.
 * Player must be within HACK_START_RANGE (4 units).
 * Returns true if hack was started, false if conditions not met.
 */
export function startHack(entityId: string): boolean {
	const entity = getEntityById(entityId);
	if (!entity?.hackable || !entity.worldPosition) return false;

	// Already hacked
	if (entity.hackable.hacked) return false;

	// Already being hacked
	if (entity.hackable.beingHacked) return false;

	// Another hack is already in progress — only one at a time
	if (activeHackTargetId !== null) return false;

	// Check player proximity
	const dist = distToPlayer(entity.worldPosition.x, entity.worldPosition.z);
	if (dist > HACK_START_RANGE) return false;

	// Check minimum compute available
	const compute = getComputePool();
	if (compute <= 0) return false;

	// Start the hack
	entity.hackable.beingHacked = true;
	entity.hackable.hackProgress = 0;
	activeHackTargetId = entityId;

	return true;
}

/**
 * Cancel an ongoing hack on an entity.
 * Resets hack progress.
 */
export function cancelHack(entityId: string) {
	const entity = getEntityById(entityId);
	if (!entity?.hackable) return;

	entity.hackable.beingHacked = false;
	entity.hackable.hackProgress = 0;

	if (activeHackTargetId === entityId) {
		activeHackTargetId = null;
	}
}

/**
 * Hacking system tick. Called once per simulation tick.
 *
 * For each hackable entity being hacked:
 *   - Verify player is still within range (cancel if > 8 units)
 *   - Advance hackProgress by computeAvailable / difficulty
 *   - Complete hack when progress >= 1.0
 */
export function hackingSystem() {
	const computeAvailable = getComputePool();

	for (const entity of hackables) {
		if (!entity.hackable.beingHacked) continue;

		// Check player proximity — cancel if too far
		const dist = distToPlayer(entity.worldPosition.x, entity.worldPosition.z);
		if (dist > HACK_CANCEL_RANGE) {
			entity.hackable.beingHacked = false;
			entity.hackable.hackProgress = 0;
			if (activeHackTargetId === entity.id) {
				activeHackTargetId = null;
			}
			continue;
		}

		// No compute available — hack stalls (doesn't cancel)
		if (computeAvailable <= 0) continue;

		// Advance hack progress
		const progressPerTick = computeAvailable / entity.hackable.difficulty;
		entity.hackable.hackProgress = Math.min(
			1.0,
			entity.hackable.hackProgress + progressPerTick,
		);

		// Hack complete
		if (entity.hackable.hackProgress >= 1.0) {
			entity.hackable.hacked = true;
			entity.hackable.beingHacked = false;
			entity.faction = "player";

			if (activeHackTargetId === entity.id) {
				activeHackTargetId = null;
			}
		}
	}
}

/**
 * Get the entity ID currently being hacked, or null.
 */
export function getActiveHackTarget(): string | null {
	return activeHackTargetId;
}
