/**
 * Hacking system -- take over enemy machines.
 *
 * Player units can hack feral and rogue machines (NOT cultists -- they're human).
 * Requirements from CORE_MECHANICS.md:
 *   1. Signal range (proximity to target)
 *   2. Sufficient compute (from global compute pool)
 *   3. Time-based progress, interruptible by damage
 *
 * On success, the target switches faction to "player".
 */

import type { Entity } from "koota";
import { playSfx } from "../audio";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { parseComponents } from "../ecs/types";
import { getComputeSnapshot } from "./compute";

/** Maximum distance at which a hack can be initiated / maintained */
export const HACK_RANGE = 6;

/** Compute cost to sustain a hack attempt per tick */
export const HACK_COMPUTE_COST_PER_TICK = 2;

/** Total progress needed to complete a hack (ticks at full rate) */
export const HACK_PROGRESS_REQUIRED = 30;

/** Progress gained per tick while hacking */
export const HACK_PROGRESS_PER_TICK = 1;

/** Factions that can be hacked (machines only -- never humans) */
const HACKABLE_FACTIONS = new Set(["feral", "rogue"]);

export interface HackAttempt {
	/** Entity ID of the hacking unit */
	hackerId: string;
	/** Entity ID of the target */
	targetId: string;
	/** Entity reference of the hacker */
	hacker: Entity;
	/** Entity reference of the target */
	target: Entity;
	/** Progress accumulated so far (0 to HACK_PROGRESS_REQUIRED) */
	progress: number;
}

export interface HackEvent {
	hackerId: string;
	targetId: string;
	type: "started" | "completed" | "interrupted" | "failed";
	reason?: string;
}

/** Active hack attempts (one per hacker at most) */
const activeHacks = new Map<string, HackAttempt>();

let lastHackEvents: HackEvent[] = [];

export function getLastHackEvents(): HackEvent[] {
	return lastHackEvents;
}

export function getActiveHacks(): ReadonlyMap<string, HackAttempt> {
	return activeHacks;
}

/**
 * Check whether a target entity can be hacked.
 */
export function canBeHacked(target: Entity): boolean {
	const faction = target.get(Faction)?.value;
	if (!faction || !HACKABLE_FACTIONS.has(faction)) return false;
	// Must be a unit (not a building)
	if (!target.has(Unit)) return false;
	// Must have at least one functional component (not already destroyed)
	const comps = parseComponents(target.get(UnitComponents)?.componentsJson);
	return comps.some((c) => c.functional);
}

/**
 * Check whether a hacker unit is capable of initiating a hack.
 */
export function canInitiateHack(hacker: Entity): boolean {
	if (hacker.get(Faction)?.value !== "player") return false;
	if (!hacker.has(Unit)) return false;
	// Must have a functional camera (for signal link)
	const comps = parseComponents(hacker.get(UnitComponents)?.componentsJson);
	return comps.some((c) => c.name === "camera" && c.functional);
}

/**
 * Start a hack attempt. Returns true if successfully initiated.
 */
export function startHack(hacker: Entity, target: Entity): boolean {
	const hackerId = hacker.get(EntityId)?.value;
	const targetId = target.get(EntityId)?.value;
	if (!hackerId || !targetId) return false;

	if (!canInitiateHack(hacker)) return false;
	if (!canBeHacked(target)) return false;

	// Check range
	const hPos = hacker.get(Position);
	const tPos = target.get(Position);
	if (!hPos || !tPos) return false;
	const dx = hPos.x - tPos.x;
	const dz = hPos.z - tPos.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	if (dist > HACK_RANGE) return false;

	// Check compute availability
	const compute = getComputeSnapshot();
	if (compute.available < HACK_COMPUTE_COST_PER_TICK) return false;

	// Already hacking something? Cancel it first.
	if (activeHacks.has(hackerId)) {
		activeHacks.delete(hackerId);
	}

	activeHacks.set(hackerId, {
		hackerId,
		targetId,
		hacker,
		target,
		progress: 0,
	});

	// Stop the hacker's movement
	if (hacker.has(Navigation)) {
		hacker.set(Navigation, { moving: false });
	}

	playSfx("hacking_start");
	return true;
}

/**
 * Cancel a hack in progress.
 */
export function cancelHack(hackerId: string): boolean {
	return activeHacks.delete(hackerId);
}

/**
 * Get the hack progress for a given hacker (0-1 normalized), or null if not hacking.
 */
export function getHackProgress(hackerId: string): number | null {
	const attempt = activeHacks.get(hackerId);
	if (!attempt) return null;
	return attempt.progress / HACK_PROGRESS_REQUIRED;
}

/**
 * Hacking system tick. Called once per sim tick.
 *
 * Progresses active hacks, checks for interruptions (damage, range, compute),
 * and completes hacks when progress reaches threshold.
 */
export function hackingSystem(): void {
	const events: HackEvent[] = [];
	const toRemove: string[] = [];

	for (const [hackerId, attempt] of activeHacks) {
		// Check entities still alive
		if (!attempt.hacker.isAlive() || !attempt.target.isAlive()) {
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "interrupted",
				reason: "entity_destroyed",
			});
			continue;
		}

		// Check hacker still has functional camera
		const hackerComps = parseComponents(
			attempt.hacker.get(UnitComponents)?.componentsJson,
		);
		if (!hackerComps.some((c) => c.name === "camera" && c.functional)) {
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "interrupted",
				reason: "camera_destroyed",
			});
			continue;
		}

		// Check target still hackable (hasn't been converted or destroyed)
		if (!canBeHacked(attempt.target)) {
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "interrupted",
				reason: "target_unhackable",
			});
			continue;
		}

		// Check range
		const hPos = attempt.hacker.get(Position)!;
		const tPos = attempt.target.get(Position)!;
		const dx = hPos.x - tPos.x;
		const dz = hPos.z - tPos.z;
		const dist = Math.sqrt(dx * dx + dz * dz);
		if (dist > HACK_RANGE) {
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "interrupted",
				reason: "out_of_range",
			});
			continue;
		}

		// Check compute availability
		const compute = getComputeSnapshot();
		if (compute.available < HACK_COMPUTE_COST_PER_TICK) {
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "failed",
				reason: "insufficient_compute",
			});
			continue;
		}

		// Progress the hack
		attempt.progress += HACK_PROGRESS_PER_TICK;

		// Check completion
		if (attempt.progress >= HACK_PROGRESS_REQUIRED) {
			// SUCCESS: Switch target faction to player
			attempt.target.set(Faction, { value: "player" });

			// Stop the target's movement
			if (attempt.target.has(Navigation)) {
				attempt.target.set(Navigation, { moving: false });
			}

			playSfx("hacking_complete");
			toRemove.push(hackerId);
			events.push({
				hackerId: attempt.hackerId,
				targetId: attempt.targetId,
				type: "completed",
			});
		}
	}

	// Clean up finished/interrupted hacks
	for (const id of toRemove) {
		activeHacks.delete(id);
	}

	lastHackEvents = events;
}

/** Reset all hack state (for testing) */
export function resetHacking(): void {
	activeHacks.clear();
	lastHackEvents = [];
}
