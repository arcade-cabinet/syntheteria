/**
 * BotOrders — order types issued by the CivilizationGovernor to individual bots.
 *
 * Orders are the bridge between strategic GOAP planning (governor) and
 * tactical behavior (BotBrain FSM). The governor decides *what* should happen;
 * orders tell each bot *how* to contribute.
 *
 * Each order carries the minimum data a bot needs to execute the behavior:
 *   - PatrolArea: center + radius for randomized waypoint patrol
 *   - AttackTarget: entity ID of the target to engage
 *   - GuardPosition: a point to defend within a radius
 *   - GatherResources: entity ID of a resource deposit to mine
 *   - ReturnToBase: go home (base position resolved from context)
 *   - Follow: entity ID of a leader to trail
 */

import type { Vec3 } from "../ecs/types.ts";

// ---------------------------------------------------------------------------
// Order types
// ---------------------------------------------------------------------------

export const BotOrderType = {
	PATROL_AREA: "patrol_area",
	ATTACK_TARGET: "attack_target",
	GUARD_POSITION: "guard_position",
	GATHER_RESOURCES: "gather_resources",
	RETURN_TO_BASE: "return_to_base",
	FOLLOW: "follow",
} as const;
export type BotOrderType = (typeof BotOrderType)[keyof typeof BotOrderType];

export interface PatrolAreaOrder {
	type: typeof BotOrderType.PATROL_AREA;
	/** Center of the patrol zone in world space. */
	center: Vec3;
	/** Radius within which the bot picks random waypoints. */
	radius: number;
}

export interface AttackTargetOrder {
	type: typeof BotOrderType.ATTACK_TARGET;
	/** Entity ID of the target to attack. */
	targetId: string;
}

export interface GuardPositionOrder {
	type: typeof BotOrderType.GUARD_POSITION;
	/** World-space position to defend. */
	position: Vec3;
	/** Maximum distance the bot may stray from the guard point. */
	radius: number;
}

export interface GatherResourcesOrder {
	type: typeof BotOrderType.GATHER_RESOURCES;
	/** Entity ID of the resource deposit to gather from. */
	depositId: string;
}

export interface ReturnToBaseOrder {
	type: typeof BotOrderType.RETURN_TO_BASE;
}

export interface FollowOrder {
	type: typeof BotOrderType.FOLLOW;
	/** Entity ID of the entity to follow. */
	targetId: string;
}

/** Discriminated union of all order types. */
export type BotOrder =
	| PatrolAreaOrder
	| AttackTargetOrder
	| GuardPositionOrder
	| GatherResourcesOrder
	| ReturnToBaseOrder
	| FollowOrder;
