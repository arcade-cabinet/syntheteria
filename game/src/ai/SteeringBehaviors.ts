/**
 * SteeringBehaviors — typed helpers for adding/configuring Yuka steering
 * behaviors on a Vehicle.
 *
 * Each function creates a behavior instance, optionally configures it,
 * and adds it to the vehicle's steering manager. The caller gets back the
 * behavior so it can be activated/deactivated or have its target updated.
 *
 * Behaviors are created in a *deactivated* state (`active = false`) so the
 * caller can explicitly enable only the ones needed for the current AI state.
 *
 * Obstacle avoidance and separation are the exception — they are always
 * active and run in parallel with whatever high-level behavior is enabled.
 */

import type { GameEntity, Vehicle } from "yuka";
import {
	ArriveBehavior,
	FleeBehavior,
	ObstacleAvoidanceBehavior,
	SeekBehavior,
	SeparationBehavior,
	WanderBehavior,
	Vector3 as YukaVector3,
} from "yuka";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All the steering behaviors attached to a single bot vehicle. */
export interface BotBehaviors {
	seek: SeekBehavior;
	flee: FleeBehavior;
	arrive: ArriveBehavior;
	wander: WanderBehavior;
	obstacleAvoidance: ObstacleAvoidanceBehavior;
	separation: SeparationBehavior;
}

// ---------------------------------------------------------------------------
// Behavior weights — tweak these to tune how behaviors blend.
// ---------------------------------------------------------------------------

const SEEK_WEIGHT = 1;
const FLEE_WEIGHT = 1;
const ARRIVE_WEIGHT = 1;
const WANDER_WEIGHT = 0.5;
const OBSTACLE_AVOIDANCE_WEIGHT = 3;
const SEPARATION_WEIGHT = 1.5;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Attach a full suite of steering behaviors to a vehicle.
 *
 * @param vehicle  The Yuka Vehicle to configure.
 * @param obstacles  Array of Yuka GameEntities used for obstacle avoidance.
 *                   Pass an empty array initially — populate later as the
 *                   world is built.
 */
export function attachBehaviors(
	vehicle: Vehicle,
	obstacles: GameEntity[] = [],
): BotBehaviors {
	// --- Seek: full speed toward a point ---
	const seek = new SeekBehavior(new YukaVector3());
	seek.active = false;
	seek.weight = SEEK_WEIGHT;
	vehicle.steering.add(seek);

	// --- Flee: move away from a threat ---
	const flee = new FleeBehavior(new YukaVector3());
	flee.active = false;
	flee.weight = FLEE_WEIGHT;
	vehicle.steering.add(flee);

	// --- Arrive: decelerate into a target (docking, pickup) ---
	const arrive = new ArriveBehavior(new YukaVector3(), 3);
	arrive.active = false;
	arrive.weight = ARRIVE_WEIGHT;
	arrive.tolerance = 0.5;
	vehicle.steering.add(arrive);

	// --- Wander: idle patrol movement ---
	const wander = new WanderBehavior(1, 5, 3);
	wander.active = false;
	wander.weight = WANDER_WEIGHT;
	vehicle.steering.add(wander);

	// --- Obstacle avoidance: always on ---
	const obstacleAvoidance = new ObstacleAvoidanceBehavior(obstacles);
	obstacleAvoidance.active = true;
	obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
	vehicle.steering.add(obstacleAvoidance);

	// --- Separation: keep distance from other bots — always on ---
	const separation = new SeparationBehavior();
	separation.active = true;
	separation.weight = SEPARATION_WEIGHT;
	vehicle.steering.add(separation);

	return { seek, flee, arrive, wander, obstacleAvoidance, separation };
}

// ---------------------------------------------------------------------------
// Convenience helpers — activate one behavior and deactivate the rest
// ---------------------------------------------------------------------------

/** Deactivate all high-level behaviors (obstacle avoidance + separation stay on). */
function deactivateAll(behaviors: BotBehaviors): void {
	behaviors.seek.active = false;
	behaviors.flee.active = false;
	behaviors.arrive.active = false;
	behaviors.wander.active = false;
}

/** Seek toward a world-space target. */
export function activateSeek(
	behaviors: BotBehaviors,
	target: { x: number; y: number; z: number },
): void {
	deactivateAll(behaviors);
	behaviors.seek.target.set(target.x, target.y, target.z);
	behaviors.seek.active = true;
}

/** Flee away from a world-space threat. */
export function activateFlee(
	behaviors: BotBehaviors,
	threat: { x: number; y: number; z: number },
): void {
	deactivateAll(behaviors);
	behaviors.flee.target.set(threat.x, threat.y, threat.z);
	behaviors.flee.active = true;
}

/** Arrive (decelerate) at a world-space target. */
export function activateArrive(
	behaviors: BotBehaviors,
	target: { x: number; y: number; z: number },
	deceleration?: number,
): void {
	deactivateAll(behaviors);
	behaviors.arrive.target.set(target.x, target.y, target.z);
	if (deceleration !== undefined) {
		behaviors.arrive.deceleration = deceleration;
	}
	behaviors.arrive.active = true;
}

/** Wander aimlessly (idle patrol). */
export function activateWander(behaviors: BotBehaviors): void {
	deactivateAll(behaviors);
	behaviors.wander.active = true;
}

/** Stop all movement (including wander). Obstacle avoidance + separation remain on. */
export function stopAll(behaviors: BotBehaviors): void {
	deactivateAll(behaviors);
}
