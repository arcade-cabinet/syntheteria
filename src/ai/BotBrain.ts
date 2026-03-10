/**
 * BotBrain — finite state machine for individual bot behavior.
 *
 * Translates high-level governor orders and local perception (BotContext)
 * into concrete steering commands. Each bot entity gets one BotBrain instance,
 * managed by the BotBrainSystem.
 *
 * State machine states:
 *   IDLE           — no orders, standing still
 *   PATROL         — wandering within a patrol zone
 *   SEEK_TARGET    — moving toward a known target (pre-attack approach)
 *   ATTACK         — in melee range, dealing damage
 *   FLEE           — health critical, running away from threats
 *   GUARD          — holding a position, engaging enemies that enter radius
 *   GATHER         — moving toward a resource deposit to collect
 *   RETURN_TO_BASE — heading home (inventory full, or ordered to return)
 *   FOLLOW         — trailing another entity at a set distance
 *
 * Transition rules:
 *   PATROL  -> SEEK_TARGET  : enemy within aggroRange
 *   SEEK_TARGET -> ATTACK   : enemy within meleeRange
 *   ATTACK  -> FLEE         : health below fleeThreshold
 *   ATTACK  -> IDLE         : target destroyed / lost
 *   FLEE    -> PATROL/IDLE  : safe distance reached
 *   GUARD   -> ATTACK       : enemy enters guard radius
 *   GATHER  -> RETURN_TO_BASE : (future) inventory full
 *   Any     -> (new state)  : governor order override
 */

import type { Vec3 } from "../ecs/types.ts";
import type { BotContext, NearbyEntity } from "./BotContext.ts";
import { BotOrderType, type BotOrder } from "./BotOrders.ts";

// ---------------------------------------------------------------------------
// Bot states
// ---------------------------------------------------------------------------

export const BotState = {
	IDLE: "idle",
	PATROL: "patrol",
	SEEK_TARGET: "seek_target",
	ATTACK: "attack",
	FLEE: "flee",
	GUARD: "guard",
	GATHER: "gather",
	RETURN_TO_BASE: "return_to_base",
	FOLLOW: "follow",
} as const;
export type BotState = (typeof BotState)[keyof typeof BotState];

// ---------------------------------------------------------------------------
// Steering output — what the BotBrainSystem should do with the Yuka Vehicle
// ---------------------------------------------------------------------------

export const SteeringCommand = {
	/** No movement — stop all steering. */
	STOP: "stop",
	/** Seek at full speed toward a target position. */
	SEEK: "seek",
	/** Arrive (decelerate) at a target position. */
	ARRIVE: "arrive",
	/** Flee away from a threat position. */
	FLEE: "flee",
	/** Wander randomly. */
	WANDER: "wander",
} as const;
export type SteeringCommand = (typeof SteeringCommand)[keyof typeof SteeringCommand];

export interface SteeringOutput {
	command: SteeringCommand;
	/** Target position for SEEK/ARRIVE/FLEE commands. */
	target?: Vec3;
}

// ---------------------------------------------------------------------------
// BotBrain
// ---------------------------------------------------------------------------

/** How long a bot stays idle before reverting to wander. */
const IDLE_TO_WANDER_TIME = 3.0;

/** Minimum time in a state before allowing autonomous transitions. */
const MIN_STATE_DURATION = 0.5;

/** How long a patrol waypoint is valid before picking a new one. */
const PATROL_WAYPOINT_LIFETIME = 5.0;

/**
 * Finite state machine controlling one bot's tactical behavior.
 *
 * Pure logic — no direct ECS or Yuka dependencies. Receives a BotContext
 * snapshot each frame and produces a SteeringOutput that the system layer
 * translates into Yuka steering commands.
 */
export class BotBrain {
	/** Current FSM state. */
	state: BotState = BotState.IDLE;

	/** Time spent in the current state (seconds). */
	stateTime = 0;

	/** Entity ID of the current attack/follow target. */
	targetId: string | null = null;

	/** Current patrol waypoint (world space). */
	patrolWaypoint: Vec3 | null = null;

	/** Time since last patrol waypoint was generated. */
	patrolWaypointAge = 0;

	/** Guard center position (from order). */
	guardCenter: Vec3 | null = null;

	/** Guard radius (from order). */
	guardRadius = 8;

	/** Patrol center (from order or default spawn). */
	patrolCenter: Vec3 | null = null;

	/** Patrol radius (from order or config). */
	patrolRadius = 15;

	/** The last order received from the governor. */
	private lastOrder: BotOrder | null = null;

	// -----------------------------------------------------------------------
	// Public API
	// -----------------------------------------------------------------------

	/**
	 * Main update — call once per frame.
	 *
	 * @param delta - Frame time in seconds
	 * @param ctx   - World perception snapshot for this bot
	 * @returns Steering command for the system to apply to the Yuka Vehicle
	 */
	update(delta: number, ctx: BotContext): SteeringOutput {
		this.stateTime += delta;

		// Process new orders from the governor (highest priority).
		if (ctx.currentOrder && ctx.currentOrder !== this.lastOrder) {
			this.applyOrder(ctx.currentOrder, ctx);
			this.lastOrder = ctx.currentOrder;
		}

		// Run the current state handler.
		switch (this.state) {
			case BotState.IDLE:
				return this.handleIdle(delta, ctx);
			case BotState.PATROL:
				return this.handlePatrol(delta, ctx);
			case BotState.SEEK_TARGET:
				return this.handleSeekTarget(delta, ctx);
			case BotState.ATTACK:
				return this.handleAttack(delta, ctx);
			case BotState.FLEE:
				return this.handleFlee(delta, ctx);
			case BotState.GUARD:
				return this.handleGuard(delta, ctx);
			case BotState.GATHER:
				return this.handleGather(delta, ctx);
			case BotState.RETURN_TO_BASE:
				return this.handleReturnToBase(delta, ctx);
			case BotState.FOLLOW:
				return this.handleFollow(delta, ctx);
			default:
				return { command: SteeringCommand.STOP };
		}
	}

	/**
	 * Assign an order from the governor.
	 * This is the external entry point; the governor calls this to push orders
	 * down to individual bots.
	 */
	setOrder(order: BotOrder): void {
		this.lastOrder = order;
		// Actual state transition is deferred to the next update() call
		// via the currentOrder check, but we can also eagerly apply:
		this.applyOrderImmediate(order);
	}

	// -----------------------------------------------------------------------
	// Order processing
	// -----------------------------------------------------------------------

	private applyOrder(order: BotOrder, ctx: BotContext): void {
		this.applyOrderImmediate(order);
		// Set patrol/guard centers from context if not specified in order
		if (
			order.type === BotOrderType.PATROL_AREA &&
			!this.patrolCenter
		) {
			this.patrolCenter = ctx.position;
		}
	}

	private applyOrderImmediate(order: BotOrder): void {
		switch (order.type) {
			case BotOrderType.PATROL_AREA:
				this.patrolCenter = { ...order.center };
				this.patrolRadius = order.radius;
				this.transitionTo(BotState.PATROL);
				break;

			case BotOrderType.ATTACK_TARGET:
				this.targetId = order.targetId;
				this.transitionTo(BotState.SEEK_TARGET);
				break;

			case BotOrderType.GUARD_POSITION:
				this.guardCenter = { ...order.position };
				this.guardRadius = order.radius;
				this.transitionTo(BotState.GUARD);
				break;

			case BotOrderType.GATHER_RESOURCES:
				this.targetId = order.depositId;
				this.transitionTo(BotState.GATHER);
				break;

			case BotOrderType.RETURN_TO_BASE:
				this.transitionTo(BotState.RETURN_TO_BASE);
				break;

			case BotOrderType.FOLLOW:
				this.targetId = order.targetId;
				this.transitionTo(BotState.FOLLOW);
				break;
		}
	}

	// -----------------------------------------------------------------------
	// State handlers
	// -----------------------------------------------------------------------

	private handleIdle(_delta: number, ctx: BotContext): SteeringOutput {
		// Check for nearby enemies — auto-aggro.
		const threat = this.findClosestThreat(ctx);
		if (threat && threat.distanceSq <= ctx.aggroRangeSq) {
			this.targetId = threat.id;
			this.transitionTo(BotState.SEEK_TARGET);
			return { command: SteeringCommand.SEEK, target: threat.position };
		}

		// After idling long enough, start wandering.
		if (this.stateTime > IDLE_TO_WANDER_TIME) {
			this.patrolCenter = this.patrolCenter ?? { ...ctx.position };
			this.transitionTo(BotState.PATROL);
			return { command: SteeringCommand.WANDER };
		}

		return { command: SteeringCommand.STOP };
	}

	private handlePatrol(delta: number, ctx: BotContext): SteeringOutput {
		// Check for threats — transition to seek if enemy in aggro range.
		const threat = this.findClosestThreat(ctx);
		if (
			threat &&
			threat.distanceSq <= ctx.aggroRangeSq &&
			this.stateTime > MIN_STATE_DURATION
		) {
			this.targetId = threat.id;
			this.transitionTo(BotState.SEEK_TARGET);
			return { command: SteeringCommand.SEEK, target: threat.position };
		}

		// Pick a new patrol waypoint if needed.
		this.patrolWaypointAge += delta;
		if (
			!this.patrolWaypoint ||
			this.patrolWaypointAge > PATROL_WAYPOINT_LIFETIME ||
			this.isNearPosition(ctx.position, this.patrolWaypoint, 4)
		) {
			this.patrolWaypoint = this.randomPatrolPoint(ctx);
			this.patrolWaypointAge = 0;
		}

		if (this.patrolWaypoint) {
			return {
				command: SteeringCommand.ARRIVE,
				target: this.patrolWaypoint,
			};
		}

		return { command: SteeringCommand.WANDER };
	}

	private handleSeekTarget(_delta: number, ctx: BotContext): SteeringOutput {
		// Check flee condition.
		if (this.shouldFlee(ctx)) {
			return this.startFlee(ctx);
		}

		// Find the target in perception.
		const target = this.findEntityInPerception(ctx, this.targetId);

		if (!target) {
			// Target lost — return to patrol or idle.
			this.targetId = null;
			this.transitionTo(
				this.patrolCenter ? BotState.PATROL : BotState.IDLE,
			);
			return { command: SteeringCommand.STOP };
		}

		// Close enough to attack?
		const meleeRangeSq = ctx.meleeRange * ctx.meleeRange;
		if (target.distanceSq <= meleeRangeSq) {
			this.transitionTo(BotState.ATTACK);
			return { command: SteeringCommand.ARRIVE, target: target.position };
		}

		// Keep seeking.
		return { command: SteeringCommand.SEEK, target: target.position };
	}

	private handleAttack(_delta: number, ctx: BotContext): SteeringOutput {
		// Check flee condition.
		if (this.shouldFlee(ctx)) {
			return this.startFlee(ctx);
		}

		// Find the target.
		const target = this.findEntityInPerception(ctx, this.targetId);

		if (!target) {
			// Target destroyed or lost.
			this.targetId = null;
			this.transitionTo(BotState.IDLE);
			return { command: SteeringCommand.STOP };
		}

		// If target moved out of melee range, chase it.
		const meleeRangeSq = ctx.meleeRange * ctx.meleeRange;
		if (target.distanceSq > meleeRangeSq * 1.5) {
			this.transitionTo(BotState.SEEK_TARGET);
			return { command: SteeringCommand.SEEK, target: target.position };
		}

		// Stay close to target (arrive behavior keeps us in melee range).
		return { command: SteeringCommand.ARRIVE, target: target.position };
	}

	private handleFlee(_delta: number, ctx: BotContext): SteeringOutput {
		const threat = this.findClosestThreat(ctx);

		// If no threats nearby or we've reached safe distance, stop fleeing.
		if (!threat || threat.distanceSq > ctx.safeDistanceSq) {
			if (this.stateTime > MIN_STATE_DURATION) {
				this.targetId = null;
				this.transitionTo(
					this.patrolCenter ? BotState.PATROL : BotState.IDLE,
				);
				return { command: SteeringCommand.STOP };
			}
		}

		// Flee from the closest threat.
		if (threat) {
			return { command: SteeringCommand.FLEE, target: threat.position };
		}

		// Flee toward home if we have a base.
		if (ctx.homeBase) {
			return { command: SteeringCommand.SEEK, target: ctx.homeBase };
		}

		return { command: SteeringCommand.WANDER };
	}

	private handleGuard(_delta: number, ctx: BotContext): SteeringOutput {
		const guardPos = this.guardCenter ?? ctx.position;

		// Check for threats within guard radius.
		const threat = this.findClosestThreat(ctx);
		if (threat) {
			const guardRadiusSq = this.guardRadius * this.guardRadius;
			const threatDistFromGuard = this.distanceSqXZ(
				threat.position,
				guardPos,
			);

			if (threatDistFromGuard <= guardRadiusSq) {
				// Check flee condition first.
				if (this.shouldFlee(ctx)) {
					return this.startFlee(ctx);
				}

				// Engage the threat.
				this.targetId = threat.id;
				const meleeRangeSq = ctx.meleeRange * ctx.meleeRange;

				if (threat.distanceSq <= meleeRangeSq) {
					// In melee range — attack in place.
					this.transitionTo(BotState.ATTACK);
					return {
						command: SteeringCommand.ARRIVE,
						target: threat.position,
					};
				}

				// Move to intercept but don't stray too far from guard point.
				return {
					command: SteeringCommand.SEEK,
					target: threat.position,
				};
			}
		}

		// No threats — return to guard point if we've drifted.
		const distFromGuardSq = this.distanceSqXZ(ctx.position, guardPos);
		const returnThresholdSq = 4; // 2 world units

		if (distFromGuardSq > returnThresholdSq) {
			return { command: SteeringCommand.ARRIVE, target: guardPos };
		}

		return { command: SteeringCommand.STOP };
	}

	private handleGather(_delta: number, ctx: BotContext): SteeringOutput {
		// Check for nearby threats — auto-aggro even while gathering.
		const threat = this.findClosestThreat(ctx);
		if (
			threat &&
			threat.distanceSq <= ctx.aggroRangeSq &&
			this.stateTime > MIN_STATE_DURATION
		) {
			this.targetId = threat.id;
			this.transitionTo(BotState.SEEK_TARGET);
			return { command: SteeringCommand.SEEK, target: threat.position };
		}

		// Find the deposit target.
		const deposit = this.findEntityInPerception(ctx, this.targetId);

		if (!deposit) {
			// Deposit lost or depleted — return to idle.
			this.targetId = null;
			this.transitionTo(BotState.IDLE);
			return { command: SteeringCommand.STOP };
		}

		// Move toward deposit.
		return { command: SteeringCommand.ARRIVE, target: deposit.position };
	}

	private handleReturnToBase(_delta: number, ctx: BotContext): SteeringOutput {
		if (!ctx.homeBase) {
			// No home base — go idle.
			this.transitionTo(BotState.IDLE);
			return { command: SteeringCommand.STOP };
		}

		// Arrived at base?
		if (this.isNearPosition(ctx.position, ctx.homeBase, 3)) {
			this.transitionTo(BotState.IDLE);
			return { command: SteeringCommand.STOP };
		}

		return { command: SteeringCommand.ARRIVE, target: ctx.homeBase };
	}

	private handleFollow(_delta: number, ctx: BotContext): SteeringOutput {
		// Check for threats — auto-aggro.
		const threat = this.findClosestThreat(ctx);
		if (
			threat &&
			threat.distanceSq <= ctx.aggroRangeSq &&
			this.stateTime > MIN_STATE_DURATION
		) {
			this.targetId = threat.id;
			this.transitionTo(BotState.SEEK_TARGET);
			return { command: SteeringCommand.SEEK, target: threat.position };
		}

		// Find the follow target (could be in allies or enemies perception).
		const leader = this.findEntityInAll(ctx, this.targetId);

		if (!leader) {
			// Leader lost — go idle.
			this.targetId = null;
			this.transitionTo(BotState.IDLE);
			return { command: SteeringCommand.STOP };
		}

		// Follow at a comfortable distance (arrive to decelerate nearby).
		const followDistSq = 9; // 3 world units
		if (leader.distanceSq > followDistSq) {
			return { command: SteeringCommand.SEEK, target: leader.position };
		}

		return { command: SteeringCommand.ARRIVE, target: leader.position };
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/** Transition to a new state, resetting state-local timers. */
	private transitionTo(newState: BotState): void {
		if (this.state === newState) return;
		this.state = newState;
		this.stateTime = 0;
		this.patrolWaypoint = null;
		this.patrolWaypointAge = 0;
	}

	/** Find the closest hostile entity in the bot's perception. */
	private findClosestThreat(ctx: BotContext): NearbyEntity | null {
		return ctx.nearbyEnemies.length > 0 ? ctx.nearbyEnemies[0] : null;
	}

	/** Check whether the bot should flee based on component health. */
	private shouldFlee(ctx: BotContext): boolean {
		return ctx.components.healthRatio <= ctx.fleeThreshold;
	}

	/** Begin fleeing — transition state and return initial steering. */
	private startFlee(ctx: BotContext): SteeringOutput {
		const threat = this.findClosestThreat(ctx);
		this.transitionTo(BotState.FLEE);
		if (threat) {
			return { command: SteeringCommand.FLEE, target: threat.position };
		}
		if (ctx.homeBase) {
			return { command: SteeringCommand.SEEK, target: ctx.homeBase };
		}
		return { command: SteeringCommand.WANDER };
	}

	/** Find an entity by ID in the enemies perception list. */
	private findEntityInPerception(
		ctx: BotContext,
		entityId: string | null,
	): NearbyEntity | null {
		if (!entityId) return null;
		return (
			ctx.nearbyEnemies.find((e) => e.id === entityId) ??
			ctx.nearbyAllies.find((e) => e.id === entityId) ??
			null
		);
	}

	/** Find an entity by ID in both enemies and allies lists. */
	private findEntityInAll(
		ctx: BotContext,
		entityId: string | null,
	): NearbyEntity | null {
		if (!entityId) return null;
		return (
			ctx.nearbyAllies.find((e) => e.id === entityId) ??
			ctx.nearbyEnemies.find((e) => e.id === entityId) ??
			null
		);
	}

	/** Check if two positions are within a threshold distance. */
	private isNearPosition(a: Vec3, b: Vec3, threshold: number): boolean {
		return this.distanceSqXZ(a, b) <= threshold * threshold;
	}

	/** Squared XZ distance between two positions. */
	private distanceSqXZ(a: Vec3, b: Vec3): number {
		const dx = a.x - b.x;
		const dz = a.z - b.z;
		return dx * dx + dz * dz;
	}

	/**
	 * Pick a random patrol waypoint within the patrol zone.
	 * Uses the bot's patrol center and radius from the current order.
	 */
	private randomPatrolPoint(ctx: BotContext): Vec3 {
		const center = this.patrolCenter ?? ctx.position;
		const angle = Math.random() * Math.PI * 2;
		const dist = Math.random() * this.patrolRadius;

		return {
			x: center.x + Math.cos(angle) * dist,
			y: center.y,
			z: center.z + Math.sin(angle) * dist,
		};
	}
}
