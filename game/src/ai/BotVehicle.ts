/**
 * BotVehicle — factory for creating Yuka Vehicle instances that represent bots.
 *
 * Each Vehicle wraps a Miniplex entity's steering state. The Vehicle's position
 * is synced back to the entity's worldPosition by useBotSteering each frame.
 *
 * Config values come from config/botMovement.json via the config loader.
 */

import { Vehicle } from "yuka";
import { config } from "../../config/index.ts";

/** Bot type key matching keys in config/botMovement.json */
export type BotType = keyof typeof config.botMovement;

export interface BotVehicleOptions {
	/** Bot type — used to look up maxSpeed, maxForce, mass, turnRate from config. */
	botType: BotType;
	/** Initial world-space position. */
	position: { x: number; y: number; z: number };
	/** Optional name (for debugging / EntityManager.getEntityByName). */
	name?: string;
}

/**
 * Create a Yuka Vehicle configured for the given bot type.
 * All physics constants are pulled from config/botMovement.json.
 */
export function createBotVehicle(options: BotVehicleOptions): Vehicle {
	const profile = config.botMovement[options.botType];

	const vehicle = new Vehicle();
	vehicle.maxSpeed = profile.maxSpeed;
	vehicle.maxForce = profile.maxForce;
	vehicle.mass = profile.mass;
	vehicle.maxTurnRate = profile.turnRate;
	vehicle.position.set(
		options.position.x,
		options.position.y,
		options.position.z,
	);
	vehicle.boundingRadius = 0.5;

	if (options.name) {
		vehicle.name = options.name;
	}

	return vehicle;
}
