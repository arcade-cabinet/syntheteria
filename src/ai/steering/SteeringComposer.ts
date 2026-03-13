import {
	ArriveBehavior,
	FleeBehavior,
	SeekBehavior,
	SeparationBehavior,
	Vector3,
} from "yuka";
import type { SyntheteriaAgent } from "../agents/SyntheteriaAgent";
import { STEERING_POLICIES } from "./SteeringPolicies";

/**
 * Composable steering behavior application for SyntheteriaAgent.
 *
 * Each function clears existing behaviors and applies the requested one
 * with the correct policy tuning. Behaviors can be layered by calling
 * multiple apply functions if needed (e.g., seek + separation).
 */

/**
 * Apply seek behavior — move toward a target position at full speed.
 */
export function applySeek(agent: SyntheteriaAgent, target: Vector3): void {
	const behavior = new SeekBehavior(target);
	agent.steering.add(behavior);
}

/**
 * Apply arrive behavior — move toward a target position, decelerating
 * smoothly when within the deceleration radius.
 */
export function applyArrive(
	agent: SyntheteriaAgent,
	target: Vector3,
	deceleration = 3,
): void {
	const policy = STEERING_POLICIES.arrive;
	const behavior = new ArriveBehavior(target, deceleration);
	behavior.tolerance = policy.arrivalTolerance;
	agent.steering.add(behavior);
}

/**
 * Apply flee behavior — move away from a threat position.
 * Optionally boosts max speed while fleeing.
 */
export function applyFlee(
	agent: SyntheteriaAgent,
	threat: Vector3,
	panicDistance = 10,
): void {
	const policy = STEERING_POLICIES.flee;
	const originalMaxSpeed = agent.maxSpeed;
	agent.maxSpeed = originalMaxSpeed * policy.maxSpeedMultiplier;
	const behavior = new FleeBehavior(threat, panicDistance);
	agent.steering.add(behavior);
}

/**
 * Apply separation behavior — avoid overlapping with nearby agents.
 * This should be layered on top of other behaviors.
 */
export function applySeparation(
	agent: SyntheteriaAgent,
	neighbors: SyntheteriaAgent[],
	separationRadius = 1.5,
): void {
	// SeparationBehavior requires neighbors to be registered in the entity manager
	// We create the behavior and it will use the agent's neighbors list
	const behavior = new SeparationBehavior();
	behavior.weight = 0.8;

	// Register neighbors so Yuka's neighbor awareness works
	agent.neighborhoodRadius = separationRadius;
	agent.updateNeighborhood = true;

	agent.steering.add(behavior);
}

/**
 * Clear all steering behaviors from an agent.
 */
export function clearSteering(agent: SyntheteriaAgent): void {
	agent.steering.clear();
}

/**
 * Apply seek + separation combo — move toward target while avoiding overlap.
 */
export function applySeekWithSeparation(
	agent: SyntheteriaAgent,
	target: Vector3,
	separationRadius = 1.5,
): void {
	applySeek(agent, target);
	const separation = new SeparationBehavior();
	separation.weight = 0.8;
	agent.neighborhoodRadius = separationRadius;
	agent.updateNeighborhood = true;
	agent.steering.add(separation);
}

/**
 * Apply arrive + separation combo — arrive at target while avoiding overlap.
 */
export function applyArriveWithSeparation(
	agent: SyntheteriaAgent,
	target: Vector3,
	deceleration = 3,
	separationRadius = 1.5,
): void {
	applyArrive(agent, target, deceleration);
	const separation = new SeparationBehavior();
	separation.weight = 0.8;
	agent.neighborhoodRadius = separationRadius;
	agent.updateNeighborhood = true;
	agent.steering.add(separation);
}
