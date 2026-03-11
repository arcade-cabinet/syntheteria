/**
 * Hacking system — allows the player to take over hackable entities.
 *
 * Hacking requires:
 *   - Proximity (within startRange to start, within cancelRange to maintain)
 *   - Compute power from the signal network
 *   - Time: hackProgress advances by (computeAvailable / difficulty) per tick
 *
 * When hackProgress reaches 1.0, the entity is hacked and joins the player faction.
 *
 * All tunables sourced from config/hacking.json.
 */

import { config } from "../../config";
import type { Entity } from "../ecs/types";
import { getEntityById, hackables, playerBots } from "../ecs/koota/compat";
import { getGlobalCompute } from "./signalNetwork";

const HACK_START_RANGE = config.hacking.startRange;
const HACK_CANCEL_RANGE = config.hacking.cancelRange;

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
 * Player must be within HACK_START_RANGE.
 * Returns true if hack was started, false if conditions not met.
 */
export function startHack(entityId: string): boolean {
	if (activeHackTargetId !== null) return false;

	const entity = getEntityById(entityId);
	if (!entity?.hackable || !entity.worldPosition) return false;

	if (entity.hackable.hacked) return false;
	if (entity.hackable.beingHacked) return false;

	const dist = distToPlayer(entity.worldPosition.x, entity.worldPosition.z);
	if (dist > HACK_START_RANGE) return false;

	const compute = getComputePool();
	if (compute <= 0) return false;

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
 *   - Verify player is still within range (cancel if > cancelRange)
 *   - Advance hackProgress by computeAvailable / difficulty
 *   - Complete hack when progress >= 1.0
 */
export function hackingSystem() {
	const computeAvailable = getComputePool();

	for (const entity of hackables) {
		const hackable = entity.hackable;
		if (!hackable?.beingHacked) continue;

		const dist = distToPlayer(entity.worldPosition!.x, entity.worldPosition!.z);
		if (dist > HACK_CANCEL_RANGE) {
			hackable.beingHacked = false;
			hackable.hackProgress = 0;
			if (activeHackTargetId === entity.id) {
				activeHackTargetId = null;
			}
			continue;
		}

		if (computeAvailable <= 0) continue;

		const progressPerTick = computeAvailable / hackable.difficulty;
		hackable.hackProgress = Math.min(
			1.0,
			hackable.hackProgress + progressPerTick,
		);

		if (hackable.hackProgress >= 1.0) {
			hackable.hacked = true;
			hackable.beingHacked = false;
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
