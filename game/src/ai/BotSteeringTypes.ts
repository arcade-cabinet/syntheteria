/**
 * BotSteeringTypes — type definitions for the BotSteering API.
 *
 * Extracted from useBotSteering.ts so that both the hook and the BotBrainSystem
 * can share the interface without circular dependencies.
 *
 * When useBotSteering.ts (the hook that creates Yuka Vehicles) is present,
 * it should re-export these types. The BotBrainSystem uses these types to
 * issue steering commands to Yuka Vehicles.
 *
 * The Vehicle type is kept as an opaque reference here to avoid a hard
 * dependency on the `yuka` package. When yuka is installed, cast as needed.
 */

// ---------------------------------------------------------------------------
// Behavior handles
// ---------------------------------------------------------------------------

/**
 * Steering behavior handles attached to a bot vehicle.
 * Matches the BotBehaviors interface from SteeringBehaviors.ts.
 */
export interface BotBehaviors {
	seek: {
		active: boolean;
		target: { set(x: number, y: number, z: number): void };
	};
	flee: {
		active: boolean;
		target: { set(x: number, y: number, z: number): void };
	};
	arrive: {
		active: boolean;
		target: { set(x: number, y: number, z: number): void };
		deceleration: number;
	};
	wander: { active: boolean };
	obstacleAvoidance: { active: boolean };
	separation: { active: boolean };
}

// ---------------------------------------------------------------------------
// Steering API
// ---------------------------------------------------------------------------

/**
 * Imperative API for commanding a bot's steering behavior.
 * This is the public interface used by BotBrainSystem to issue movement commands.
 *
 * Implementations should wrap a Yuka Vehicle and its attached behaviors,
 * translating these high-level calls into behavior activation/deactivation.
 */
export interface BotSteeringAPI {
	/** Move at full speed toward a world-space target. */
	seek: (target: { x: number; y: number; z: number }) => void;
	/** Flee away from a world-space threat. */
	flee: (threat: { x: number; y: number; z: number }) => void;
	/** Decelerate into a world-space target (pickup, docking). */
	arrive: (
		target: { x: number; y: number; z: number },
		deceleration?: number,
	) => void;
	/** Wander aimlessly (idle patrol). */
	wander: () => void;
	/** Stop all steering (vehicle coasts to halt). */
	stop: () => void;
	/** The underlying Yuka Vehicle — opaque reference for advanced use. */
	vehicle: unknown;
	/** The behavior handles — escape hatch for fine-grained control. */
	behaviors: BotBehaviors;
}
