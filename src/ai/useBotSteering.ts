/**
 * useBotSteering — React hook that links a Miniplex entity to a Yuka Vehicle.
 *
 * On mount:
 *   1. Creates a Vehicle configured from config/botMovement.json.
 *   2. Attaches the full suite of steering behaviors.
 *   3. Registers the Vehicle with the YukaManager's EntityManager.
 *
 * Each frame (via useFrame):
 *   - Syncs the Yuka Vehicle position back to the Miniplex entity's
 *     worldPosition so the rest of the ECS (rendering, combat, etc.)
 *     stays in sync.
 *
 * On unmount:
 *   - Removes the Vehicle from the YukaManager.
 *
 * Returns an imperative API for the caller to command steering:
 *   seek(target), flee(target), arrive(target), wander(), stop()
 */

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { GameEntity, Vehicle } from "yuka";
import { getTerrainHeight } from "../ecs/terrain.ts";
import type { Entity } from "../ecs/types.ts";
import { type BotType, createBotVehicle } from "./BotVehicle.ts";
import {
	activateArrive,
	activateFlee,
	activateSeek,
	activateWander,
	attachBehaviors,
	type BotBehaviors,
	stopAll,
} from "./SteeringBehaviors.ts";
import { YukaManager } from "./YukaManager.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
	/** The underlying Yuka Vehicle — escape hatch for advanced use. */
	vehicle: Vehicle;
	/** The behavior handles — escape hatch for fine-grained control. */
	behaviors: BotBehaviors;
}

export interface UseBotSteeringOptions {
	/** The Miniplex entity this vehicle represents. */
	entity: Entity;
	/** Bot type key from config/botMovement.json. Defaults to "maintenance_bot". */
	botType?: BotType;
	/**
	 * Shared obstacle list for ObstacleAvoidanceBehavior.
	 * Pass a stable ref — the behavior holds a reference to this array,
	 * so mutating it in place will update avoidance automatically.
	 */
	obstacles?: GameEntity[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBotSteering(options: UseBotSteeringOptions): BotSteeringAPI {
	const { entity, botType = "maintenance_bot", obstacles = [] } = options;

	// Stable refs so the useFrame callback always sees the latest entity
	// without triggering re-creation of the vehicle.
	const entityRef = useRef(entity);
	entityRef.current = entity;

	// Stable refs for values used only as initial seeds — we intentionally
	// do NOT want to recreate the vehicle when these change.
	const initialPositionRef = useRef(
		entity.worldPosition ?? { x: 0, y: 0, z: 0 },
	);
	const obstaclesRef = useRef(obstacles);
	obstaclesRef.current = obstacles;

	// Create vehicle + behaviors once (stable across renders).
	// Re-created only when the entity ID or bot type changes.
	const { vehicle, behaviors } = useMemo(() => {
		const v = createBotVehicle({
			botType,
			position: initialPositionRef.current,
			name: entity.id,
		});
		const b = attachBehaviors(v, obstaclesRef.current);
		return { vehicle: v, behaviors: b };
	}, [entity.id, botType]);

	// Register / unregister with YukaManager.
	useEffect(() => {
		YukaManager.entityManager.add(vehicle);
		return () => {
			YukaManager.entityManager.remove(vehicle);
		};
	}, [vehicle]);

	// Per-frame sync: Yuka Vehicle position → Miniplex entity worldPosition.
	useFrame(() => {
		const e = entityRef.current;
		if (!e.worldPosition) return;

		// Copy Yuka position to entity.
		e.worldPosition.x = vehicle.position.x;
		e.worldPosition.z = vehicle.position.z;
		// Keep the entity grounded to the terrain heightfield.
		e.worldPosition.y = getTerrainHeight(
			vehicle.position.x,
			vehicle.position.z,
		);
		// Also sync Yuka's y so obstacle avoidance stays planar.
		vehicle.position.y = e.worldPosition.y;
	});

	// Build stable API object (functions close over stable refs).
	const api = useMemo<BotSteeringAPI>(
		() => ({
			seek: (target) => activateSeek(behaviors, target),
			flee: (threat) => activateFlee(behaviors, threat),
			arrive: (target, deceleration) =>
				activateArrive(behaviors, target, deceleration),
			wander: () => activateWander(behaviors),
			stop: () => stopAll(behaviors),
			vehicle,
			behaviors,
		}),
		[vehicle, behaviors],
	);

	return api;
}
